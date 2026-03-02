import React, { useState, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor'; 
import { refactorCode, runBenchmark } from '../../services/refactorService';

import styles from './RefactorPage.module.css';
import { AiProvider, type BenchmarkResult, type CodeChange, type RefactorResponse } from '../../types/api.types';
import { Controls } from './components/Controls/Component';
import { MetricsDashboard } from '../../components/metrics-dashboard/MetricsDashboard';
import { Spinner } from '../../components/spinner/Spinner';
import { BenchmarkDashboard } from '../../components/BenchmarkDashboard/BenchmarkDashboard';

export const RefactorPage: React.FC = () => {
  const [code, setCode] = useState<string>('// Paste your C# code here...');
  const [provider, setProvider] = useState<AiProvider>(AiProvider.Gemini);
  const [language, setLanguage] = useState<string>('csharp');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResult | null>(null);
  
  // Stores the full response (Refactored Code + Metrics)
  const [responseData, setResponseData] = useState<RefactorResponse | null>(null);

  // --- REFS (For Monaco Editor) ---
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // --- LOGIC: TOOLTIPS ---
  const applyDecorations = (changes: CodeChange[]) => {
    if (!editorRef.current) return;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = changes.map(change => ({
      range: new monaco.Range(change.lineNumber, 1, change.lineNumber, 1),
      options: {
        isWholeLine: true,
        className: 'refactor-highlight-line', // Global CSS class (index.css)
        glyphMarginClassName: 'refactor-glyph-icon', // Global CSS class (index.css)
        hoverMessage: { 
            value: `**${change.principle}**\n\n${change.description}` 
        }
      }
    }));

    decorationsCollection.current = editorRef.current.createDecorationsCollection(newDecorations);
  };

  // --- LOGIC: REFACTOR API CALL ---
  const handleRefactor = async () => {
    setIsLoading(true);
    setResponseData(null); // Clear previous results to hide dashboard
    
    // Clear old tooltips
    if (decorationsCollection.current) {
        decorationsCollection.current.clear();
    }

    try {
      const response = await refactorCode({
        code: code,
        language: language,
        provider: provider
      });
      
      setResponseData(response);

      // Wait 100ms for Editor to render new text, then apply tooltips
      setTimeout(() => {
          if (response.changes && response.changes.length > 0) {
              applyDecorations(response.changes);
          }
      }, 100);

    } catch (error) {
      console.error(error);
      alert("Failed to refactor. Please checks the backend console.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunExperiment = async () => {
    if (!code) return;

    setIsBenchmarking(true);
    setResponseData(null); // Clear single mode results
    setBenchmarkData(null); // Clear previous benchmark results

    try {
      const result = await runBenchmark({
        code: code,
        language: 'csharp',
        providers: [AiProvider.Gemini, AiProvider.Groq, AiProvider.HuggingFace] 
      });
      setBenchmarkData(result);
    } catch (error) {
      alert("Benchmark failed. Check console for details.");
      console.error(error);
    } finally {
      setIsBenchmarking(false);
    }
  };
  
  // --- RENDER ---
  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1>AI Code Refactor</h1>
      </div>
      
      <Controls 
        selectedProvider={provider}
        selectedLanguage={language}
        onProviderChange={setProvider}
        onLanguageChange={setLanguage}
        onRefactorClick={handleRefactor}
        isLoading={isLoading}
        onBenchmarkClick={handleRunExperiment}
        isBenchmarking={isBenchmarking}
      />

      {/* Editor Section */}
      <div className={styles.editorContainer}>
        {/* Input Pane */}
        <div className={styles.pane}>
            <div className={styles.paneHeader}>Input Code</div>
            <Editor 
              height="100%"
              defaultLanguage="csharp"
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{ minimap: { enabled: false } }}
            />
        </div>

        {/* Output Pane */}
        <div className={styles.pane}>
            <div className={styles.paneHeader}>Refactored Result</div>
            {isLoading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spinner />
                </div>
            ) : (
                <Editor 
                  height="100%"
                  defaultLanguage="csharp"
                  language={language}
                  value={responseData?.refactoredCode || '// Result will appear here...'}
                  onMount={handleEditorDidMount}
                  options={{ 
                      readOnly: true, 
                      glyphMargin: true,
                      domReadOnly: true,
                      minimap: { enabled: false }
                  }}
                />
            )}
        </div>
      </div>

      {/* Metrics Dashboard Section (Only appears if we have data) */}
      {responseData?.metrics && (
        <div className={styles.dashboardSection}>
            <h2 className={styles.dashboardTitle}>Metrics Analysis</h2>
            <MetricsDashboard response={responseData} />
        </div>
      )}
      {(benchmarkData || isBenchmarking) && (
        <div className={styles.dashboardSection} style={{ marginTop: '20px' }}>
            <BenchmarkDashboard result={benchmarkData} isLoading={isBenchmarking} />
        </div>
      )}

    </div>
  );
};