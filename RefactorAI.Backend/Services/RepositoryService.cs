using LibGit2Sharp;
using RefactorAI.Backend.Models;

namespace RefactorAI.Backend.Services;

public class RepositoryService : IRepositoryService
{
    private readonly string _baseClonePath; 
    
    private static string _currentRepoPath = string.Empty;

    public RepositoryService(IWebHostEnvironment env)
    {
        _baseClonePath = Path.Combine(Path.GetTempPath(), "RefactorAI_Repos");
    }

    public async Task<FileTreeNode> CloneAndScanAsync(string repoUrl)
    {
        if (string.IsNullOrEmpty(repoUrl)) throw new ArgumentException("Invalid URL");
        
        var repoName = repoUrl.Split('/').Last().Replace(".git", "");
        
        // OLD: var clonePath = Path.Combine(_baseClonePath, repoName);
        
        // NEW: Unique path every time to avoid locks
        var uniqueName = $"{repoName}_{DateTime.Now.Ticks}";
        var clonePath = Path.Combine(_baseClonePath, uniqueName);
        
        _currentRepoPath = clonePath; 

        // No need to "Delete if exists" anymore since the name is unique!
        // But we should clean up OLD folders occasionally (out of scope for now)

        // Clone
        await Task.Run(() => Repository.Clone(repoUrl, clonePath));

        // Scan
        var rootNode = new FileTreeNode 
        { 
            Name = repoName, 
            Type = "folder", 
            FullPath = "", 
            Children = ScanDirectory(clonePath, clonePath) 
        };

        return rootNode;
    }

    public async Task<string> GetFileContentAsync(string relativePath)
    {
        if (string.IsNullOrEmpty(_currentRepoPath)) throw new InvalidOperationException("No repository cloned yet.");
        
        var fullPath = Path.Combine(_currentRepoPath, relativePath);
        if (!File.Exists(fullPath)) throw new FileNotFoundException("File not found");

        return await File.ReadAllTextAsync(fullPath);
    }

    private List<FileTreeNode> ScanDirectory(string dirPath, string rootPath)
    {
        var nodes = new List<FileTreeNode>();
        var info = new DirectoryInfo(dirPath);

        // 1. Scan Directories (With strict filtering)
        foreach (var dir in info.GetDirectories())
        {
            // Skip hidden folders and build artifacts
            if (dir.Name.StartsWith(".") || 
                dir.Name == "bin" || 
                dir.Name == "obj" || 
                dir.Name == "node_modules" || 
                dir.Name == "wwwroot" ||
                dir.Name == "TestResults") 
            {
                continue; 
            }

            // Recursive call
            var children = ScanDirectory(dir.FullName, rootPath);
            
            // Only add the folder if it actually contains something useful (optional but clean)
            if (children.Count > 0)
            {
                nodes.Add(new FileTreeNode
                {
                    Name = dir.Name,
                    Type = "folder",
                    FullPath = Path.GetRelativePath(rootPath, dir.FullName),
                    Children = children
                });
            }
        }

        // 2. Scan Files (Strictly .cs only)
        foreach (var file in info.GetFiles("*.cs"))
        {
            // Optional: Skip auto-generated files
            if (file.Name.EndsWith(".g.cs") || file.Name.EndsWith(".AssemblyAttributes.cs")) continue;

            nodes.Add(new FileTreeNode
            {
                Name = file.Name,
                Type = "file",
                FullPath = Path.GetRelativePath(rootPath, file.FullName)
            });
        }

        return nodes;
    }

    private void DeleteDirectory(string path)
    {
        if (!Directory.Exists(path)) return;

        var directory = new DirectoryInfo(path);

        // 1. Delete all files in this specific folder
        foreach (var file in directory.GetFiles())
        {
            try 
            {
                // CRITICAL: Remove Read-Only attribute
                file.Attributes = FileAttributes.Normal;
                file.Delete();
            }
            catch (Exception) 
            { 
                // Ignore errors if file is already gone/locked, 
                // but usually the Attribute fix solves it.
            }
        }

        // 2. Recursively delete sub-directories
        foreach (var subDir in directory.GetDirectories())
        {
            DeleteDirectory(subDir.FullName);
        }

        // 3. Finally delete the empty folder
        try 
        {
            directory.Delete(false); // false because it should be empty now
        }
        catch (Exception) 
        { 
            // Retry logic or ignore could go here
        }
    }
}