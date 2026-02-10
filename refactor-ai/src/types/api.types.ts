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
  identifiedCodeSmells?: string[];
  appliedTechniques?: string[];
  toolDetectedSmells?: string[];
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

export interface FileTreeNode {
  name: string;
  fullPath: string;
  type: 'file' | 'folder';
  children: FileTreeNode[];

  cyclomaticComplexity?: number;
  linesOfCode?: number;
  maxNestingDepth?: number;
  riskScore?: number;
}

export interface CloneRequest {
  repositoryUrl: string;
}