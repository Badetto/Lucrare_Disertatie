namespace RefactorAI.Backend.Models;

public class FileTreeNode
{
    public string Name { get; set; } = string.Empty;
    public string FullPath { get; set; } = string.Empty; // Relative path (e.g., "src/Core/Order.cs")
    public string Type { get; set; } = "file"; // "file" or "folder"
    public List<FileTreeNode> Children { get; set; } = new();
}

public class CloneRequest
{
    public string RepositoryUrl { get; set; } = string.Empty;
}