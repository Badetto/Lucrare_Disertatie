namespace RefactorAI.Backend.Models;

public class FileTreeNode
{
    public string Name { get; set; } = string.Empty;
    public string FullPath { get; set; } = string.Empty; // Relative path (e.g., "src/Core/Order.cs")
    public string Type { get; set; } = "file"; // "file" or "folder"
    public List<FileTreeNode> Children { get; set; } = new();

    // --- NEW: Metrics for the Hotspot Scanner ---
    public int CyclomaticComplexity { get; set; }
    public int LinesOfCode { get; set; }
    public int MaxNestingDepth { get; set; }
    
    // A calculated value to easily sort the worst files
    public double RiskScore { get; set; }
}

public class CloneRequest
{
    public string RepositoryUrl { get; set; } = string.Empty;
}