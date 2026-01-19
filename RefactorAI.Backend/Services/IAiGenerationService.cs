using RefactorAI.Backend.Models;

namespace RefactorAI.Backend.Services;

public interface IAiGenerationService
{
    Task<RefactorResponse> RefactorCodeAsync(RefactorRequest request);
}