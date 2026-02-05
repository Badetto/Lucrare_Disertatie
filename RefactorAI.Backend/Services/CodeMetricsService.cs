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