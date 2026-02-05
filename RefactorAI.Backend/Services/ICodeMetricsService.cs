using RefactorAI.Backend.Models;

namespace RefactorAI.Backend.Services;
public interface ICodeMetricsService
{
    CodeMetrics CalculateMetrics(string code);
}