using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RefactorAI.Backend.Data;
using RefactorAI.Backend.Models;
using RefactorAI.Backend.Models.DTOs;
using RefactorAI.Backend.Services;

namespace RefactorAI.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RefactorController : ControllerBase
{
    private readonly IAiGenerationService _aiService;
    private readonly ICodeMetricsService _metricsService;
    private readonly AppDbContext _dbContext;

    public RefactorController(IAiGenerationService aiService, ICodeMetricsService metricsService, AppDbContext dbContext)
    {
        _aiService = aiService;
        _metricsService = metricsService;
        _dbContext = dbContext;
    }

    [HttpPost("refactor")]
    public async Task<IActionResult> RefactorCode([FromBody] RefactorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code)) return BadRequest("Code is required");

        try
        {
            // 1. Calculate Old Metrics & Detect Smells (Deterministic Tool) BEFORE AI runs
            var oldMetrics = _metricsService.CalculateMetrics(request.Code);
            var toolSmells = _metricsService.DetectCodeSmells(request.Code);

            // 2. Run AI (This returns a RefactorResponse object based on the AI's JSON)
            var result = await _aiService.RefactorCodeAsync(request);

            Console.WriteLine(result);
            // Safety check: If AI failed to return a result, throw an error
            if (result == null) throw new Exception("AI returned a null response.");

            // 3. Calculate New Metrics based on the code the AI returned
            var newMetrics = _metricsService.CalculateMetrics(result.RefactoredCode);

            // 4. CRITICAL FIX: Ensure the Metrics object is explicitly created and attached
            result.Metrics = new MetricsComparison 
            { 
                OldMetrics = oldMetrics ?? new CodeMetrics(), 
                NewMetrics = newMetrics ?? new CodeMetrics() 
            };
            
            result.ToolDetectedSmells = toolSmells ?? new List<string>();

            // Ensure the AI's lists aren't null just in case it forgot them
            result.IdentifiedCodeSmells ??= new List<string>();
            result.AppliedTechniques ??= new List<string>();

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("benchmark")]
    public async Task<IActionResult> RunBenchmark([FromBody] BenchmarkRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code)) return BadRequest("Code is required");

        // 1. Define allowed providers (Force exclude OpenAI if you haven't paid)
        var allowedProviders = new List<AiProvider> { AiProvider.Gemini, AiProvider.Groq, AiProvider.HuggingFace };
        
        // Use user selection OR default to both if empty, but filter by allowed list
        var providersToRun = (request.Providers != null && request.Providers.Any())
            ? request.Providers.Where(p => allowedProviders.Contains(p)).ToList()
            : allowedProviders;

        // 2. Calculate Baseline Metrics
        var originalMetrics = _metricsService.CalculateMetrics(request.Code);

        // 3. Create Parallel Tasks
        var tasks = providersToRun.Select(async provider => 
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var result = new ProviderResult { ProviderName = provider.ToString() };

            try
            {
                // Create a request specifically for THIS provider
                var refactorReq = new RefactorRequest 
                { 
                    Code = request.Code, 
                    Language = request.Language, 
                    Provider = provider 
                };

                // DIRECT CALL: The service handles the switch internally
                var response = await _aiService.RefactorCodeAsync(refactorReq);

                sw.Stop();
                result.DurationSeconds = sw.Elapsed.TotalSeconds;
                result.RefactoredCode = response.RefactoredCode;
                result.IsSuccess = true;
                result.Metrics = _metricsService.CalculateMetrics(response.RefactoredCode);
                result.Explanation = response.Explanation ?? "";
                result.IdentifiedCodeSmells = response.IdentifiedCodeSmells ?? new List<string>();
                result.AppliedTechniques = response.AppliedTechniques ?? new List<string>();
            }
            catch (Exception ex)
            {
                sw.Stop();
                result.DurationSeconds = sw.Elapsed.TotalSeconds;
                result.IsSuccess = false;
                result.ErrorMessage = ex.Message;
            }

            return result;
        });

        // 4. Run the Race!
        var providerResults = await Task.WhenAll(tasks);

        // --- NEW: PHASE 4 - SAVE TO SQLITE DATABASE ---
        try 
        {
            var dbRun = new Models.Entities.BenchmarkRun
            {
                OriginalComplexity = originalMetrics.CyclomaticComplexity,
                OriginalLinesOfCode = originalMetrics.LinesOfCode,
                Results = providerResults.Select(pr => new Models.Entities.AiRunResult
                {
                    ProviderName = pr.ProviderName,
                    DurationSeconds = pr.DurationSeconds,
                    IsSuccess = pr.IsSuccess,
                    ErrorMessage = pr.ErrorMessage,
                    NewComplexity = pr.Metrics?.CyclomaticComplexity ?? 0,
                    NewLinesOfCode = pr.Metrics?.LinesOfCode ?? 0
                }).ToList()
            };

            _dbContext.BenchmarkRuns.Add(dbRun);
            await _dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Log it, but don't fail the API request just because saving failed
            Console.WriteLine($"Failed to save to DB: {ex.Message}");
        }

        return Ok(new BenchmarkResult
        {
            OriginalMetrics = originalMetrics,
            Results = providerResults.ToList()
        });
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetBenchmarkHistory()
    {
        try
        {
            // Fetch all runs, include the AI results, and sort by newest first
            var history = await _dbContext.BenchmarkRuns
                .Include(b => b.Results)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return Ok(history);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch benchmark history.", details = ex.Message });
        }
    }
}