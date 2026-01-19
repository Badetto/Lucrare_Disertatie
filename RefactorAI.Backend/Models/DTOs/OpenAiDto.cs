using System.Text.Json.Serialization;

namespace RefactorAI.Backend.Models.DTOs;

// The Request we send
public class OpenAiRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;

    [JsonPropertyName("messages")]
    public List<OpenAiMessage> Messages { get; set; } = new();

    [JsonPropertyName("max_tokens")]
    public int? MaxTokens { get; set; }
}

public class OpenAiMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

// The Response we get back
public class OpenAiResponse
{
    [JsonPropertyName("choices")]
    public List<OpenAiChoice> Choices { get; set; } = new();
}

public class OpenAiChoice
{
    [JsonPropertyName("message")]
    public OpenAiMessage Message { get; set; } = new();
}