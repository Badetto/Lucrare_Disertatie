using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using RefactorAI.Backend.Models;

namespace RefactorAI.Backend.Services;

public class CodeMetricsService : ICodeMetricsService
{
    public CodeMetrics CalculateMetrics(string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return new CodeMetrics();

        var tree = CSharpSyntaxTree.ParseText(code);
        var root = tree.GetRoot();

        var walker = new DetailedMetricsWalker();
        walker.Visit(root);

        var linesOfCode = code.Split('\n').Length;
        
        // Revised Maintainability Formula (Simplified Halstead)
        var maintainability = Math.Max(0, 100 
            - (walker.Complexity * 1.5) 
            - (linesOfCode * 0.1) 
            - (walker.MaxNesting * 2));

        return new CodeMetrics
        {
            LinesOfCode = linesOfCode,
            CyclomaticComplexity = walker.Complexity,
            MaintainabilityIndex = Math.Round(maintainability, 1),
            MethodCount = walker.MethodCount,
            MaxNestingDepth = walker.MaxNesting,
            MaxParameters = walker.MaxParameters
        };
    }

    public List<string> DetectCodeSmells(string code)
    {
        var smells = new List<string>();
        if (string.IsNullOrWhiteSpace(code)) return smells;

        var tree = CSharpSyntaxTree.ParseText(code);
        var root = tree.GetRoot();
        var walker = new DetailedMetricsWalker();
        walker.Visit(root);

        // 1. Long Method (Arbitrary threshold: > 30 lines)
        var methods = root.DescendantNodes().OfType<MethodDeclarationSyntax>();
        if (methods.Any(m => m.ToString().Split('\n').Length > 30))
        {
            smells.Add("Long Method (LOC > 30)");
        }

        // 2. Long Parameter List
        if (walker.MaxParameters > 4)
        {
            smells.Add($"Long Parameter List (Max Params: {walker.MaxParameters})");
        }

        // 3. Deeply Nested Control Flow (Arrow Anti-Pattern)
        if (walker.MaxNesting > 3)
        {
            smells.Add($"Deeply Nested Control Flow (Depth: {walker.MaxNesting})");
        }

        // 4. High Cyclomatic Complexity
        if (walker.Complexity > 10)
        {
            smells.Add($"High Cyclomatic Complexity ({walker.Complexity})");
        }
        
        // 5. Large Class (Arbitrary threshold: > 10 methods)
        if(walker.MethodCount > 10)
        {
             smells.Add($"Large Class (Methods > 10)");
        }

        return smells;
    }
    class DetailedMetricsWalker : CSharpSyntaxWalker
    {
        public int Complexity { get; private set; } = 1;
        public int MethodCount { get; private set; } = 0;
        public int MaxParameters { get; private set; } = 0;
        
        public int MaxNesting { get; private set; } = 0;
        private int _currentDepth = 0;

        // Track Nesting Depth
        private void EnterScope()
        {
            _currentDepth++;
            if (_currentDepth > MaxNesting) MaxNesting = _currentDepth;
        }
        private void ExitScope() => _currentDepth--;

        // 1. Count Methods & Parameters
        public override void VisitMethodDeclaration(MethodDeclarationSyntax node)
        {
            MethodCount++;
            int paramCount = node.ParameterList.Parameters.Count;
            if (paramCount > MaxParameters) MaxParameters = paramCount;
            
            base.VisitMethodDeclaration(node);
        }

        // 2. Count Complexity & Nesting
        public override void VisitIfStatement(IfStatementSyntax node) 
        { 
            Complexity++; 
            EnterScope(); 
            base.VisitIfStatement(node); 
            ExitScope(); 
        }
        
        public override void VisitWhileStatement(WhileStatementSyntax node) 
        { 
            Complexity++; 
            EnterScope(); 
            base.VisitWhileStatement(node); 
            ExitScope(); 
        }

        public override void VisitForStatement(ForStatementSyntax node) 
        { 
            Complexity++; 
            EnterScope(); 
            base.VisitForStatement(node); 
            ExitScope(); 
        }
        
        public override void VisitForEachStatement(ForEachStatementSyntax node) 
        { 
            Complexity++; 
            EnterScope(); 
            base.VisitForEachStatement(node); 
            ExitScope(); 
        }

        // 3. Other decision points (no nesting increase usually)
        public override void VisitCaseSwitchLabel(CaseSwitchLabelSyntax node) { Complexity++; base.VisitCaseSwitchLabel(node); }
        public override void VisitCatchClause(CatchClauseSyntax node) { Complexity++; base.VisitCatchClause(node); }
        public override void VisitBinaryExpression(BinaryExpressionSyntax node)
        {
            if (node.IsKind(SyntaxKind.LogicalAndExpression) || node.IsKind(SyntaxKind.LogicalOrExpression))
                Complexity++;
            base.VisitBinaryExpression(node);
        }
    }
}