using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions; // Added for cleaning Markdown
using RefactorAI.Backend.Models;
using RefactorAI.Backend.Models.DTOs;

namespace RefactorAI.Backend.Services;

public class AiGenerationService : IAiGenerationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly string _basePrompt;

    // We use case-insensitive deserialization because AIs sometimes use "RefactoredCode" vs "refactoredCode"
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public AiGenerationService(IHttpClientFactory httpClientFactory, IConfiguration configuration, IWebHostEnvironment env)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;

        var promptPath = Path.Combine(env.ContentRootPath, "Prompts", "RefactorSystemPrompt.txt");
        _basePrompt = File.Exists(promptPath) ? File.ReadAllText(promptPath) : "Refactor this code.";
    }

    public async Task<RefactorResponse> RefactorCodeAsync(RefactorRequest request)
    {
        string finalPrompt = $"{_basePrompt}\n\nHere is the {request.Language} code to refactor:\n{request.Code}";

        string rawAiResponse = request.Provider switch
        {
            AiProvider.OpenAi => await CallOpenAiAsync(request, finalPrompt),
            AiProvider.Gemini => await CallGeminiAsync(request, finalPrompt),
            AiProvider.HuggingFace => await CallHuggingFaceAsync(request, finalPrompt),
            _ => throw new ArgumentException("Invalid AI Provider")
        };

        // NEW: We now parse the raw string into our object
        return ParseAiResponse(rawAiResponse);
    }

    // --- Helper to Clean and Parse AI JSON ---
    private RefactorResponse ParseAiResponse(string rawContent)
    {
        try
        {
            // 1. Remove Markdown code blocks if present (e.g., ```json ... ```)
            var cleanJson = Regex.Replace(rawContent, @"^```json\s*|\s*```$", "", RegexOptions.IgnoreCase | RegexOptions.Multiline).Trim();
            
            // 2. Sometimes AIs add text before/after the JSON. We try to find the first '{' and last '}'
            int firstBrace = cleanJson.IndexOf('{');
            int lastBrace = cleanJson.LastIndexOf('}');
            
            if (firstBrace >= 0 && lastBrace > firstBrace)
            {
                cleanJson = cleanJson.Substring(firstBrace, lastBrace - firstBrace + 1);
            }

            // 3. Deserialize into our strongly-typed object
            var result = JsonSerializer.Deserialize<RefactorResponse>(cleanJson, _jsonOptions);
            return result ?? new RefactorResponse { RefactoredCode = rawContent, Explanation = "Failed to parse JSON" };
        }
        catch (Exception)
        {
            // Fallback: If parsing completely fails, just return the raw text so we don't lose data
            return new RefactorResponse 
            { 
                RefactoredCode = rawContent, 
                Explanation = "AI returned invalid JSON format. Raw response shown." 
            };
        }
    }

    // --- 1. OpenAI ---
    private async Task<string> CallOpenAiAsync(RefactorRequest request, string prompt)
    {
        var apiKey = _configuration["AiSettings:OpenAiKey"];
        var model = _configuration["AiSettings:OpenAiModel"];
        var url = _configuration["AiSettings:OpenAiUrl"];

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var apiRequest = new OpenAiRequest
        {
            Model = model!,
            Messages = new List<OpenAiMessage>
            {
                new OpenAiMessage { Role = "system", Content = "You are a helpful coding assistant." },
                new OpenAiMessage { Role = "user", Content = prompt }
            }
        };

        var response = await client.PostAsJsonAsync(url, apiRequest);
        
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            // Throw specific error so Controller sees it
            throw new HttpRequestException($"OpenAI Error: {response.StatusCode} - {error}");
        }

        var apiResponse = await response.Content.ReadFromJsonAsync<OpenAiResponse>();
        return apiResponse?.Choices.FirstOrDefault()?.Message.Content ?? "";
    }

    // --- 2. Gemini ---
    private async Task<string> CallGeminiAsync(RefactorRequest request, string prompt)
    {
        var apiKey = _configuration["AiSettings:GeminiKey"];
        var model = _configuration["AiSettings:GeminiModel"];
        var urlPattern = _configuration["AiSettings:GeminiUrlPattern"];
        var url = string.Format(urlPattern, model, apiKey);

        var client = _httpClientFactory.CreateClient();
        var apiRequest = new GeminiRequest
        {
            Contents = new List<GeminiContent>
            {
                new GeminiContent { Parts = new List<GeminiPart> { new GeminiPart { Text = prompt } } }
            }
        };

        var response = await client.PostAsJsonAsync(url, apiRequest);

        if (!response.IsSuccessStatusCode)
        {
             var error = await response.Content.ReadAsStringAsync();
             throw new HttpRequestException($"Gemini Error: {response.StatusCode} - {error}");
        }

        var apiResponse = await response.Content.ReadFromJsonAsync<GeminiResponse>();
        return apiResponse?.Candidates.FirstOrDefault()?.Content.Parts.FirstOrDefault()?.Text ?? "";
    }

    // --- 3. Hugging Face ---
    private async Task<string> CallHuggingFaceAsync(RefactorRequest request, string prompt)
    {
        var token = _configuration["AiSettings:HuggingFaceToken"]; 
        var model = _configuration["AiSettings:HuggingFaceModel"];
        var url = _configuration["AiSettings:HuggingFaceUrlPattern"];

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var apiRequest = new OpenAiRequest
        {
            Model = model!,
            Messages = new List<OpenAiMessage>
            {
                new OpenAiMessage { Role = "system", Content = "You are a helpful coding assistant." },
                new OpenAiMessage { Role = "user", Content = prompt }
            },
            MaxTokens = 1000 
        };

        var response = await client.PostAsJsonAsync(url, apiRequest);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"HuggingFace Error: {response.StatusCode} - {error}");
        }

        var apiResponse = await response.Content.ReadFromJsonAsync<OpenAiResponse>();
        return apiResponse?.Choices.FirstOrDefault()?.Message.Content ?? "";
    }
}