using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using RefactorAI.Backend.Models;
using RefactorAI.Backend.Models.DTOs;

namespace RefactorAI.Backend.Services;

public class AiGenerationService : IAiGenerationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly string _basePrompt;
    
    // Case-insensitive JSON options are crucial because AI is inconsistent with casing
    private readonly JsonSerializerOptions _jsonOptions = new() 
    { 
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    public AiGenerationService(IHttpClientFactory httpClientFactory, IConfiguration configuration, IWebHostEnvironment env)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        var promptPath = Path.Combine(env.ContentRootPath, "Prompts", "RefactorSystemPrompt.txt");
        _basePrompt = File.Exists(promptPath) ? File.ReadAllText(promptPath) : "Refactor this code.";
    }

    public async Task<RefactorResponse> RefactorCodeAsync(RefactorRequest request)
    {
        // We add a specific instruction for the AI to ensure it outputs JSON
        string finalPrompt = $"{_basePrompt}\n\nIMPORTANT: Output ONLY valid JSON. Do not use Markdown blocks. \n\nCode to refactor:\n{request.Code}";

        string rawAiResponse = "";

        switch (request.Provider)
        {
            case AiProvider.OpenAi:
                rawAiResponse = await CallOpenAiAsync(request, finalPrompt);
                break;
            case AiProvider.Gemini:
                rawAiResponse = await CallGeminiAsync(request, finalPrompt);
                break;
            case AiProvider.Groq:
                rawAiResponse = await CallGroqAsync(request, finalPrompt);
                break;
            case AiProvider.HuggingFace:
                rawAiResponse = await CallHuggingFaceAsync(request, finalPrompt);
                break;
            default:
                throw new ArgumentException("Invalid AI Provider");
        }

        return ParseAiResponse(rawAiResponse);
    }

    private string CleanMarkdownWrapper(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;
        
        // Match ``` followed by optional letters (like json, csharp, cs) at the start
        var startPattern = @"^```[a-zA-Z]*\s*";
        // Match ``` at the very end
        var endPattern = @"\s*```$";

        // RegexOptions.Multiline ensures it matches the start/end of the string properly
        var clean = Regex.Replace(text, startPattern, "", RegexOptions.IgnoreCase | RegexOptions.Multiline);
        clean = Regex.Replace(clean, endPattern, "", RegexOptions.IgnoreCase | RegexOptions.Multiline);
        
        return clean.Trim();
    }

    // Maps to the same logic to clean the inner code string
    private string CleanMarkdownCode(string code)
    {
        return CleanMarkdownWrapper(code);
    }

    private RefactorResponse ParseAiResponse(string rawContent)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(rawContent)) 
                throw new Exception("AI returned empty response.");

            var cleanJson = CleanMarkdownWrapper(rawContent);
            int firstBrace = cleanJson.IndexOf('{');
            int lastBrace = cleanJson.LastIndexOf('}');

            if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace)
            {
                string jsonString = cleanJson.Substring(firstBrace, lastBrace - firstBrace + 1);
                
                try 
                {
                    var result = JsonSerializer.Deserialize<RefactorResponse>(jsonString, _jsonOptions);
                    if (result != null && !string.IsNullOrEmpty(result.RefactoredCode))
                    {
                        result.RefactoredCode = CleanMarkdownCode(result.RefactoredCode);
                        return result;
                    }
                }
                catch 
                {
                    // JSON parsing failed! (This is where Hugging Face crashes).
                    // Trigger the Regex Rescue!
                    return RescueBrokenJson(jsonString);
                }
            }

            return RescueBrokenJson(rawContent); // Try rescuing even if no braces found
        }
        catch (Exception ex)
        {
            return new RefactorResponse { RefactoredCode = rawContent, Explanation = $"Parsing Error: {ex.Message}" };
        }
    }

    // --- NEW: THE RESCUE PARSER ---
    // Violently extracts data from broken JSON strings using regular expressions
    private RefactorResponse RescueBrokenJson(string brokenJson)
    {
        var response = new RefactorResponse();

        // 1. Rescue Code (Look for everything between "refactoredCode": " and the next JSON key)
        var codeMatch = Regex.Match(brokenJson, @"""refactoredCode""\s*:\s*""(.*?)\s*""\s*,", RegexOptions.Singleline);
        if (codeMatch.Success) 
        {
            string salvagedCode = codeMatch.Groups[1].Value.Replace("\\n", "\n").Replace("\\\"", "\"").Replace("\\\\", "\\");
            response.RefactoredCode = CleanMarkdownCode(salvagedCode);
        }
        else
        {
            // If we couldn't find the key, maybe it's just raw code
            var csharpBlock = Regex.Match(brokenJson, @"```csharp\s*(.*?)\s*```", RegexOptions.Singleline | RegexOptions.IgnoreCase);
            if (csharpBlock.Success) response.RefactoredCode = csharpBlock.Groups[1].Value.Trim();
        }

        // 2. Rescue Explanation
        var expMatch = Regex.Match(brokenJson, @"""explanation""\s*:\s*""(.*?)""", RegexOptions.Singleline);
        if (expMatch.Success) response.Explanation = expMatch.Groups[1].Value;

        // 3. Rescue Arrays
        response.IdentifiedCodeSmells = ExtractJsonArray(brokenJson, "identifiedCodeSmells");
        response.AppliedTechniques = ExtractJsonArray(brokenJson, "appliedTechniques");

        if (string.IsNullOrEmpty(response.Explanation)) 
            response.Explanation = "Salvaged data using Regex Rescue (AI generated invalid JSON).";

        return response;
    }

    private List<string> ExtractJsonArray(string json, string key)
    {
        var list = new List<string>();
        var match = Regex.Match(json, $@"""{key}""\s*:\s*\[(.*?)\]", RegexOptions.Singleline);
        if (match.Success)
        {
            var items = match.Groups[1].Value.Split(',');
            foreach (var item in items)
            {
                var cleanItem = item.Replace("\"", "").Replace("\n", "").Replace("\r", "").Trim();
                if (!string.IsNullOrEmpty(cleanItem)) list.Add(cleanItem);
            }
        }
        return list;
    }

    // --- 1. OpenAI (Standard) ---
    private async Task<string> CallOpenAiAsync(RefactorRequest request, string prompt)
    {
        var apiKey = _configuration["AiSettings:OpenAiKey"];
        var model = _configuration["AiSettings:OpenAiModel"];
        var url = _configuration["AiSettings:OpenAiUrl"];

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var requestBody = new
        {
            model = model,
            messages = new[] { 
                new { role = "system", content = "You are a helpful coding assistant." },
                new { role = "user", content = prompt } 
            },
            response_format = new { type = "json_object" } // OpenAI supports this reliably
        };

        var response = await client.PostAsJsonAsync(url, requestBody);
        var responseString = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode) throw new Exception($"OpenAI Error: {responseString}");

        using var doc = JsonDocument.Parse(responseString);
        return doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
    }

    // --- 2. Gemini (Google Format) ---
    private async Task<string> CallGeminiAsync(RefactorRequest request, string prompt)
    {
        var apiKey = _configuration["AiSettings:GeminiKey"];
        var model = _configuration["AiSettings:GeminiModel"];
        var url = string.Format(_configuration["AiSettings:GeminiUrlPattern"]!, model, apiKey);

        var client = _httpClientFactory.CreateClient();
        var requestBody = new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } }
        };

        var response = await client.PostAsJsonAsync(url, requestBody);
        var responseString = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode) throw new Exception($"Gemini Error: {responseString}");

        using var doc = JsonDocument.Parse(responseString);
        // Navigate: candidates[0] -> content -> parts[0] -> text
        return doc.RootElement.GetProperty("candidates")[0]
                              .GetProperty("content")
                              .GetProperty("parts")[0]
                              .GetProperty("text").GetString() ?? "";
    }

    // --- 3. Groq (Llama 3) - CUSTOM FORMAT ---
    private async Task<string> CallGroqAsync(RefactorRequest request, string prompt)
    {
        var apiKey = _configuration["AiSettings:GroqKey"];
        var model = _configuration["AiSettings:GroqModel"]; 
        var url = _configuration["AiSettings:GroqUrl"];

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        // GROQ FIX: Do NOT send "response_format" or "system" messages if the model is sensitive.
        // We rely on the PROMPT to get JSON.
        var requestBody = new
        {
            model = model,
            messages = new[] { 
                new { role = "user", content = prompt } 
            },
            temperature = 0.1 // Keep it strict
        };

        var response = await client.PostAsJsonAsync(url, requestBody);
        var responseString = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode) throw new Exception($"Groq Error: {responseString}");

        using var doc = JsonDocument.Parse(responseString);
        return doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
    }

    // --- 4. Hugging Face (Custom Format) ---
    private async Task<string> CallHuggingFaceAsync(RefactorRequest request, string prompt)
    {
        var token = _configuration["AiSettings:HuggingFaceToken"]; 
        var model = _configuration["AiSettings:HuggingFaceModel"];
        var url = _configuration["AiSettings:HuggingFaceUrlPattern"];

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // HuggingFace often needs a specific "max_tokens" to not cutoff
        var requestBody = new
        {
            model = model,
            messages = new[] { 
                new { role = "user", content = prompt } 
            },
            max_tokens = 2500, // Ensure enough space for code
            temperature = 0.1
        };

        var response = await client.PostAsJsonAsync(url, requestBody);
        var responseString = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode) throw new Exception($"HuggingFace Error: {responseString}");

        using var doc = JsonDocument.Parse(responseString);
        return doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
    }
}