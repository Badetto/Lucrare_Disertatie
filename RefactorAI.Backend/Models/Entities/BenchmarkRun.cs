namespace RefactorAI.Backend.Models.Entities;

public class BenchmarkRun
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Original Code Stats
    public int OriginalComplexity { get; set; }
    public int OriginalLinesOfCode { get; set; }
    
    // Navigation Property: One Run has Many AI Results
    public List<AiRunResult> Results { get; set; } = new();
}