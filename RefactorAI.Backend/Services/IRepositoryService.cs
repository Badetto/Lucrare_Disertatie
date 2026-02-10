using RefactorAI.Backend.Models;

namespace RefactorAI.Backend.Services;

public interface IRepositoryService
{
    Task<FileTreeNode> CloneAndScanAsync(string repoUrl);
    Task<string> GetFileContentAsync(string filePath);
}