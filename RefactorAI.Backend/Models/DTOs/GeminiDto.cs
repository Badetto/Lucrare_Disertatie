using System.Text.Json.Serialization;

namespace RefactorAI.Backend.Models.DTOs;

// The Request we send
public class GeminiRequest
{
    [JsonPropertyName("contents")]
    public List<GeminiContent> Contents { get; set; } = new();
}

public class GeminiContent
{
    [JsonPropertyName("parts")]
    public List<GeminiPart> Parts { get; set; } = new();
}

public class GeminiPart
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

// The Response we get back
public class GeminiResponse
{
    [JsonPropertyName("candidates")]
    public List<GeminiCandidate> Candidates { get; set; } = new();
}

public class GeminiCandidate
{
    [JsonPropertyName("content")]
    public GeminiContent Content { get; set; } = new();
}