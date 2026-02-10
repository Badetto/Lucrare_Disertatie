namespace RefactorAI.Backend.Models;

public class RefactorResponse
{
    public string RefactoredCode { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public List<CodeChange> Changes { get; set; } = new();
    public MetricsComparison Metrics { get; set; } = new();
    // Code smells the AI identified in the original code
    public List<string> IdentifiedCodeSmells { get; set; } = new();
    // Refactoring techniques the AI applied
    public List<string> AppliedTechniques { get; set; } = new();
    // Deterministic Tool's analysis
    public List<string> ToolDetectedSmells { get; set; } = new();
}