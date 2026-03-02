namespace RefactorAI.Backend.Models.DTOs;

public class BenchmarkRequest
{
    public string Code { get; set; } = string.Empty;
    public string Language { get; set; } = "csharp";
    public List<AiProvider> Providers { get; set; } = new(); 
}