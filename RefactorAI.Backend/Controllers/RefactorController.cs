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
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest("Code content cannot be empty.");
        }

        try
        {
            // 1. Calculate Metrics for OLD code
            var oldMetrics = _metricsService.CalculateMetrics(request.Code);

            // 2. Run AI
            var result = await _aiService.RefactorCodeAsync(request);

            // 3. Calculate Metrics for NEW code
            var newMetrics = _metricsService.CalculateMetrics(result.RefactoredCode);

            // 4. Attach to response
            result.Metrics = new MetricsComparison 
            { 
                OldMetrics = oldMetrics, 
                NewMetrics = newMetrics 
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            // In a real app, log this error
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }
}