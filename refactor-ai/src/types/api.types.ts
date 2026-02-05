export enum AiProvider {
  OpenAi = 0,
  Gemini = 1,
  HuggingFace = 2,
}

export interface CodeChange {
  lineNumber: number;
  description: string;
  principle: string;
}

export interface RefactorRequest {
  code: string;
  language: string;
  provider: AiProvider;
}

export interface RefactorResponse {
  refactoredCode: string;
  explanation: string;
  changes: CodeChange[];
  metrics?: MetricsComparison;
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  methodCount: number;
  maxNestingDepth: number;
  maxParameters: number;
}

export interface MetricsComparison {
  oldMetrics: CodeMetrics;
  newMetrics: CodeMetrics;
}