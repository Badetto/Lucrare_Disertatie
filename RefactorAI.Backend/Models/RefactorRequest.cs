namespace RefactorAI.Backend.Models;

public class RefactorRequest
{
    public string Code { get; set; } = string.Empty;
    public string Language { get; set; } = "csharp";
    public AiProvider Provider { get; set; }
}