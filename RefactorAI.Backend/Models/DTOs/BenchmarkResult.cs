namespace RefactorAI.Backend.Models.DTOs;

public class BenchmarkResult
{
    public CodeMetrics OriginalMetrics { get; set; } = new();
    public List<ProviderResult> Results { get; set; } = new();
}

public class ProviderResult
{
    public string ProviderName { get; set; } = string.Empty;
    public double DurationSeconds { get; set; }
    public CodeMetrics Metrics { get; set; } = new();
    public string RefactoredCode { get; set; } = string.Empty;
    public bool IsSuccess { get; set; } = true;
    public string ErrorMessage { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public List<string> IdentifiedCodeSmells { get; set; } = new();
    public List<string> AppliedTechniques { get; set; } = new();
}