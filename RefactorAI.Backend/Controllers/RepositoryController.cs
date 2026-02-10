using Microsoft.AspNetCore.Mvc;
using RefactorAI.Backend.Models;
using RefactorAI.Backend.Services;

namespace RefactorAI.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RepositoryController : ControllerBase
{
    private readonly IRepositoryService _repoService;

    public RepositoryController(IRepositoryService repoService)
    {
        _repoService = repoService;
    }

    [HttpPost("clone")]
    public async Task<IActionResult> CloneRepository([FromBody] CloneRequest request)
    {
        try
        {
            var tree = await _repoService.CloneAndScanAsync(request.RepositoryUrl);
            return Ok(tree);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
    
    [HttpGet("file")]
    public async Task<IActionResult> GetFile([FromQuery] string path)
    {
        try
        {
            var content = await _repoService.GetFileContentAsync(path);
            return Ok(new { content });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}