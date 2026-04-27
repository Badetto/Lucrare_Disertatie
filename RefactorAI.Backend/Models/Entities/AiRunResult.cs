namespace RefactorAI.Backend.Models.Entities;

public class AiRunResult
{
    public int Id { get; set; }
    public int BenchmarkRunId { get; set; } // Foreign Key
    
    public string ProviderName { get; set; } = string.Empty;
    public double DurationSeconds { get; set; }
    public bool IsSuccess { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;

    // AI's Output Stats
    public int NewComplexity { get; set; }
    public int NewLinesOfCode { get; set; }
}