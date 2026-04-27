export enum AiProvider {
  OpenAi = 0,
  Gemini = 1,
  HuggingFace = 2,
  Groq = 3,
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

export interface BenchmarkRequest {
  code: string;
  language: string;
  providers: AiProvider[];
}

export interface ProviderResult {
  providerName: string;
  durationSeconds: number;
  metrics: CodeMetrics;
  refactoredCode: string;
  isSuccess: boolean;
  errorMessage: string;
  explanation?: string;
  identifiedCodeSmells?: string[];
  appliedTechniques?: string[];
}

export interface BenchmarkResult {
  originalMetrics: CodeMetrics;
  results: ProviderResult[];
}

// --- PHASE 4: Database History Types ---

export interface AiRunResultDb {
    id: number;
    benchmarkRunId: number;
    providerName: string;
    durationSeconds: number;
    isSuccess: boolean;
    errorMessage: string;
    newComplexity: number;
    newLinesOfCode: number;
    newMaintainabilityIndex: number; // <-- NEW
    explanation: string;             // <-- NEW
    identifiedCodeSmells: string[];  // <-- NEW
    appliedTechniques: string[];     // <-- NEW
}

export interface BenchmarkRunDb {
    id: number;
    createdAt: string;
    originalComplexity: number;
    originalLinesOfCode: number;
    originalMaintainabilityIndex: number; // <-- NEW
    results: AiRunResultDb[];
}