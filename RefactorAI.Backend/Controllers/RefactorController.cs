using Microsoft.AspNetCore.Mvc;
using RefactorAI.Backend.Models;
using RefactorAI.Backend.Services;

namespace RefactorAI.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RefactorController : ControllerBase
{
    private readonly IAiGenerationService _aiService;

    public RefactorController(IAiGenerationService aiService)
    {
        _aiService = aiService;
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
            var result = await _aiService.RefactorCodeAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            // In a real app, log this error
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }
}