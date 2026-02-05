namespace RefactorAI.Backend.Models;

public class CodeMetrics
{
    public int LinesOfCode { get; set; }
    public int CyclomaticComplexity { get; set; }
    public double MaintainabilityIndex { get; set; }

    public int MethodCount { get; set; }
    public int MaxNestingDepth { get; set; }
    public int MaxParameters { get; set; }
}

public class MetricsComparison
{
    public CodeMetrics OldMetrics { get; set; } = new();
    public CodeMetrics NewMetrics { get; set; } = new();
}