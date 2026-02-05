namespace RefactorAI.Backend.Models;

public class RefactorResponse
{
    public string RefactoredCode { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    
    // NEW: A specific list of changes for the tooltips
    public List<CodeChange> Changes { get; set; } = new();

    public MetricsComparison Metrics { get; set; } = new();
}