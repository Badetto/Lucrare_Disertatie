using Microsoft.AspNetCore.Mvc;
using RefactorAI.Backend.Models;
using RefactorAI.Backend.Services;

namespace RefactorAI.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RefactorController : ControllerBase
{
    private readonly IAiGenerationService _aiService;
    private readonly ICodeMetricsService _metricsService;

    public RefactorController(IAiGenerationService aiService, ICodeMetricsService metricsService)
    {
        _aiService = aiService;
        _metricsService = metricsService;
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
}