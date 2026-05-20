import React, { useState, useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { cloneRepository, getFileContent } from '../../services/repositoryService';
import { refactorCode, runBenchmark } from '../../services/refactorService';
import styles from './RepositoryPage.module.css';
import { AiProvider, type BenchmarkResult, type CodeChange, type FileTreeNode, type RefactorResponse } from '../../types/api.types';
import { FileTree } from '../../components/FileTree/FileTree';
import { Spinner } from '../../components/spinner/Spinner';
import { MetricsDashboard } from '../../components/metrics-dashboard/MetricsDashboard';
import { BenchmarkDashboard } from '../../components/BenchmarkDashboard/BenchmarkDashboard';

export const RepositoryPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [fileTree, setFileTree] = useState<FileTreeNode | null>(null);
  const [activeTab, setActiveTab] = useState<'tree' | 'hotspots'>('tree');

  const [selectedFile, setSelectedFile] = useState<FileTreeNode | null>(null);
  const [originalCode, setOriginalCode] = useState<string>('');
  const [isFetchingFile, setIsFetchingFile] = useState(false);

  const [isRefactoring, setIsRefactoring] = useState(false);
  const [refactorData, setRefactorData] = useState<RefactorResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>(AiProvider.Gemini);

  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResult | null>(null);

  // --- NEW: Mass Refactor State ---
  const [isMassRefactoring, setIsMassRefactoring] = useState(false);
  const [massProgressIndex, setMassProgressIndex] = useState(0);
  // This dictionary caches the results of the mass refactor by file path
  const [massRefactorCache, setMassRefactorCache] = useState<Record<string, RefactorResponse>>({});

  // --- Refs ---
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  // Derived variable: Determines which refactor data to show for the currently selected file
  const activeRefactorData = selectedFile 
        ? massRefactorCache[selectedFile.fullPath] || refactorData 
        : null;

  // --- Tooltip Logic ---
  const applyDecorations = (editor: monaco.editor.IStandaloneCodeEditor, changes: CodeChange[]) => {
    if (!editor || !changes) return;
    if (decorationsCollection.current) {
        decorationsCollection.current.clear();
    }
    const newDecorations: monaco.editor.IModelDeltaDecoration[] = changes.map(change => ({
      range: new monaco.Range(change.lineNumber, 1, change.lineNumber, 1),
      options: {
        isWholeLine: true,
        className: 'refactor-highlight-line', 
        glyphMarginClassName: 'refactor-glyph-icon',
        hoverMessage: { 
            value: `**${change.principle}**\n\n${change.description}` 
        }
      }
    }));
    decorationsCollection.current = editor.createDecorationsCollection(newDecorations);
  };

  const flattenTree = (node: FileTreeNode): FileTreeNode[] => {
    let files: FileTreeNode[] = [];
    if (node.type === 'file') files.push(node);
    if (node.children) {
        node.children.forEach(child => { files = files.concat(flattenTree(child)); });
    }
    return files;
  };

  const topOffenders = React.useMemo(() => {
      if (!fileTree) return [];
      const allFiles = flattenTree(fileTree);
      return allFiles
          .filter(f => f.riskScore !== undefined)
          .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
          .slice(0, 10);
  }, [fileTree]);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    if (activeRefactorData && activeRefactorData.changes) {
        applyDecorations(editor, activeRefactorData.changes);
    }
  };

  useEffect(() => {
    if (editorRef.current && activeRefactorData?.changes) {
        applyDecorations(editorRef.current, activeRefactorData.changes);
    }
  }, [activeRefactorData]);

  // --- Handlers ---
  const handleClone = async () => {
    if (!url) return;
    setIsCloning(true);
    setFileTree(null); 
    setSelectedFile(null); 
    setRefactorData(null);
    setMassRefactorCache({}); // Clear mass cache on new clone
    try {
      const tree = await cloneRepository(url);
      setFileTree(tree);
    } catch (error) {
      alert("Failed to clone.");
    } finally {
      setIsCloning(false);
    }
  };

  useEffect(() => {
    const fetchCode = async () => {
      if (!selectedFile) return;
      setIsFetchingFile(true);
      setRefactorData(null); 
      
      try {
        const response = await getFileContent(selectedFile.fullPath);
        setOriginalCode(response.content);
      } catch (error) {
        setOriginalCode("// Error loading file.");
      } finally {
        setTimeout(() => setIsFetchingFile(false), 300);
      }
    };
    fetchCode();
  }, [selectedFile]);

  const handleRefactorCurrentFile = async () => {
    if (!originalCode || !selectedFile) return;
    setIsRefactoring(true);
    try {
      const response = await refactorCode({
        code: originalCode,
        language: 'csharp',
        provider: selectedProvider 
      });
      setRefactorData(response);
    } catch (error) {
      alert("Refactoring failed.");
    } finally {
      setIsRefactoring(false);
    }
  };

  // --- NEW: MASS REFACTOR SEQUENTIAL LOGIC ---
  const handleMassRefactor = async () => {
      if (topOffenders.length === 0) return;
      
      setIsMassRefactoring(true);
      setMassProgressIndex(0);
      
      for (let i = 0; i < topOffenders.length; i++) {
          const file = topOffenders[i];
          setMassProgressIndex(i + 1); // Update UI to show current file
          
          // Skip if we already successfully refactored this file in the cache
          if (massRefactorCache[file.fullPath]) continue; 

          try {
              // 1. Fetch the file content
              const fileContentResponse = await getFileContent(file.fullPath);
              
              // 2. Send to AI
              const aiResponse = await refactorCode({
                  code: fileContentResponse.content,
                  language: 'csharp',
                  provider: selectedProvider
              });

              // 3. Save to cache immediately so UI updates
              setMassRefactorCache(prev => ({
                  ...prev,
                  [file.fullPath]: aiResponse
              }));

          } catch (error) {
              console.error(`Failed to mass refactor ${file.name}`, error);
              // We continue the loop even if one file fails to prevent a complete halt
          }
      }
      setIsMassRefactoring(false);
  };

  const handleRunExperiment = async () => {
      // ... your existing experiment logic
      if (!originalCode || !selectedFile) return;
      setIsBenchmarking(true);
      setRefactorData(null); 
      setBenchmarkData(null); 
      try {
          const result = await runBenchmark({
              code: originalCode, language: 'csharp',
              providers: [AiProvider.Gemini, AiProvider.Groq, AiProvider.HuggingFace] 
          });
          setBenchmarkData(result);
      } catch (error) {
          alert("Benchmark failed.");
      } finally {
          setIsBenchmarking(false);
      }
  };

  // --- Render ---
  return (
    <div className={styles.container}>
      {/* TOOLBAR */}
      <div className={styles.toolbar}>
        <input 
          className={styles.input}
          placeholder="Paste GitHub Repository URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <select 
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(Number(e.target.value))}
            className={styles.select}
            disabled={isMassRefactoring}
        >
            <option value={AiProvider.OpenAi}>ChatGPT (OpenAI)</option>
            <option value={AiProvider.Groq}>Groq (Nvidia)</option>
            <option value={AiProvider.Gemini}>Gemini (Google)</option>
            <option value={AiProvider.HuggingFace}>Qwen (Hugging Face)</option>
        </select>
        <button className={styles.button} onClick={handleClone} disabled={isCloning || isMassRefactoring}>
          {isCloning ? 'Cloning...' : 'Analyze Repo'}
        </button>
      </div>

      <div className={styles.mainContent}>
        {/* SIDEBAR */}
        <div className={styles.sidebar}>
          {isCloning ? (
             <div style={{ padding: 20, textAlign: 'center' }}><Spinner /></div>
          ) : fileTree ? (
             <>
                <div className={styles.sidebarTabs}>
                    <button className={`${styles.tab} ${activeTab === 'tree' ? styles.tabActive : ''}`} onClick={() => setActiveTab('tree')}>
                        File Explorer
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'hotspots' ? styles.tabActive : ''}`} onClick={() => setActiveTab('hotspots')}>
                        Top 10 Hotspots
                    </button>
                </div>

                <div style={{ padding: '0' }}>
                    {activeTab === 'tree' ? (
                        <FileTree node={fileTree} onFileClick={(node) => setSelectedFile(node)} />
                    ) : (
                        <div className={styles.hotspotsContainer}>
                            
                            {/* NEW: MASS REFACTOR HEADER UI */}
                            <div className={styles.massRefactorHeader}>
                                <button 
                                    className={styles.massRefactorBtn}
                                    onClick={handleMassRefactor}
                                    disabled={isMassRefactoring || topOffenders.length === 0}
                                >
                                    {isMassRefactoring 
                                        ? `⚡ Processing ${massProgressIndex} of ${topOffenders.length}...` 
                                        : '✨ Auto-Fix All Hotspots'}
                                </button>
                                {isMassRefactoring && (
                                    <div className={styles.progressContainer}>
                                        <div 
                                            className={styles.progressBar} 
                                            style={{ width: `${(massProgressIndex / topOffenders.length) * 100}%` }} 
                                        />
                                    </div>
                                )}
                            </div>

                            {/* HOTSPOTS LIST */}
                            <div className={styles.hotspotList}>
                                {topOffenders.map((file, index) => {
                                    // Determine the status icon
                                    const isProcessed = !!massRefactorCache[file.fullPath];
                                    const isCurrentlyProcessing = isMassRefactoring && massProgressIndex === index + 1;
                                    
                                    return (
                                        <div 
                                            key={file.fullPath} 
                                            className={styles.hotspotItem}
                                            onClick={() => setSelectedFile(file)}
                                            style={{ backgroundColor: selectedFile?.fullPath === file.fullPath ? '#e2e8f0' : '' }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div className={styles.hotspotName}>
                                                    {index + 1}. {file.name}
                                                </div>
                                                {/* NEW: Status Icon */}
                                                <div className={styles.hotspotStatus}>
                                                    {isProcessed ? '✅' : isCurrentlyProcessing ? '⏳' : ''}
                                                </div>
                                            </div>
                                            <div className={styles.hotspotMetrics}>
                                                <span>Cmp: {file.cyclomaticComplexity}</span>
                                                <span className={styles.hotspotScore}>Risk: {Math.round(file.riskScore || 0)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
             </>
          ) : (
             <div className={styles.emptySidebar}>No repository loaded.</div>
          )}
        </div>
        
        {/* RIGHT CONTENT AREA */}
        <div className={styles.contentArea}>
            {!selectedFile ? (
              <div className={styles.emptyState}>
                  <div className={styles.emptyEmoji}>📁</div>
                  <p>Paste a GitHub URL to analyze the repository.</p>
              </div>
            ) : (
              <>
                  <div className={styles.fileHeader}>
                      <span className={styles.fileName}>{selectedFile.name}</span>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          className={styles.refactorBtn} 
                          onClick={handleRefactorCurrentFile}
                          disabled={isRefactoring || isFetchingFile || isMassRefactoring}
                        >
                          {isRefactoring ? 'Optimizing...' : '⚡ Refactor This File'}
                        </button>
                        <button 
                          className={styles.refactorBtn} 
                          style={{ backgroundColor: '#8b5cf6' }} 
                          onClick={handleRunExperiment}
                          disabled={isRefactoring || isBenchmarking || isMassRefactoring}
                        >
                          {isBenchmarking ? 'Running Race...' : '🧪 Run Experiment'}
                        </button>
                      </div>
                  </div>

                  {/* USE THE DERIVED activeRefactorData INSTEAD OF refactorData */}
                  {activeRefactorData ? (
                      <>
                        <div className={styles.splitEditorContainer}>
                            <div className={styles.editorPane}>
                                <div className={styles.paneTitle}>Original</div>
                                <Editor 
                                    height="100%" defaultLanguage="csharp" 
                                    value={originalCode} 
                                    options={{ readOnly: true, minimap: { enabled: false } }} 
                                />
                            </div>
                            <div className={styles.editorPane}>
                                <div className={styles.paneTitle} style={{ color: '#10b981' }}>Optimized Code</div>                                <Editor 
                                    height="100%" defaultLanguage="csharp" 
                                    value={activeRefactorData.refactoredCode} 
                                    onMount={handleEditorDidMount} 
                                    options={{ readOnly: true, minimap: { enabled: false }, glyphMargin: true }} 
                                />
                            </div>
                        </div>
                        
                        <div style={{ padding: '0 20px 40px 20px', flexShrink: 0 }}>
                            <MetricsDashboard response={activeRefactorData} />
                        </div>
                      </>
                  ) : (
                      <>
                        <div className={styles.singleEditorContainer}>
                            {isFetchingFile && <div className={styles.loadingOverlay}><Spinner /></div>}
                            <Editor 
                                height="100%" defaultLanguage="csharp" 
                                value={originalCode} 
                                options={{ readOnly: true, minimap: { enabled: false } }}
                            />
                        </div>

                        {(benchmarkData || isBenchmarking) && (
                            <div style={{ padding: '0 20px 40px 20px', flexShrink: 0 }}>
                                <BenchmarkDashboard result={benchmarkData} isLoading={isBenchmarking} />
                            </div>
                        )}
                      </>
                  )}
              </>
            )}
        </div>
      </div>
    </div>
  );
};