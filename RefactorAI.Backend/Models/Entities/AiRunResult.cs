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
    public double NewMaintainabilityIndex { get; set; } // <-- NEW
    
    // --- Qualitative Data (Saved as JSON in SQLite by EF8) ---
    public string Explanation { get; set; } = string.Empty; // <-- NEW
    public List<string> IdentifiedCodeSmells { get; set; } = new(); // <-- NEW
    public List<string> AppliedTechniques { get; set; } = new(); // <-- NEW
}