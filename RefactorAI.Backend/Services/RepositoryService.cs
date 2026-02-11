using LibGit2Sharp;
using RefactorAI.Backend.Models;

namespace RefactorAI.Backend.Services;

public class RepositoryService : IRepositoryService
{
    private readonly string _baseClonePath; 
    
    private static string _currentRepoPath = string.Empty;

    private readonly ICodeMetricsService _metricsService;

    public RepositoryService(IWebHostEnvironment env, ICodeMetricsService metricsService)
    {
        _baseClonePath = Path.Combine(Path.GetTempPath(), "RefactorAI_Repos");
        _metricsService = metricsService;
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
            if (file.Name.EndsWith(".g.cs") || 
                file.Name.EndsWith(".designer.cs") || // <--- Added this line
                file.Name.EndsWith(".Designer.cs") || // <--- Added uppercase D just in case
                file.Name.EndsWith(".AssemblyAttributes.cs")) 
            {
                continue;
            }

            var fileNode = new FileTreeNode
            {
                Name = file.Name,
                Type = "file",
                FullPath = Path.GetRelativePath(rootPath, file.FullName)
            };

            // Read the file and calculate metrics
            try
            {
                var code = File.ReadAllText(file.FullName);
                var metrics = _metricsService.CalculateMetrics(code);

                fileNode.CyclomaticComplexity = metrics.CyclomaticComplexity;
                fileNode.LinesOfCode = metrics.LinesOfCode;
                fileNode.MaxNestingDepth = metrics.MaxNestingDepth;

                // Calculate Risk Score:
                // High complexity, deep nesting, and long files increase the risk.
                fileNode.RiskScore = metrics.CyclomaticComplexity + 
                                     (metrics.MaxNestingDepth * 2) + 
                                     (metrics.LinesOfCode * 0.1);
            }
            catch (Exception)
            {
                // If we can't read a file for some reason, just leave metrics at 0
            }

            nodes.Add(fileNode);
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