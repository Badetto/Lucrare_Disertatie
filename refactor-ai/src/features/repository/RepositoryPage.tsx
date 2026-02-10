import React, { useState, useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor'; // <--- Import Monaco
import { cloneRepository, getFileContent } from '../../services/repositoryService';
import { refactorCode } from '../../services/refactorService';
import styles from './RepositoryPage.module.css';
import { AiProvider, type CodeChange, type FileTreeNode, type RefactorResponse } from '../../types/api.types';
import { FileTree } from '../../components/FileTree/FileTree';
import { Spinner } from '../../components/spinner/Spinner';
import { MetricsDashboard } from '../../components/metrics-dashboard/MetricsDashboard';

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

  // --- Refs ---
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  // --- Tooltip Logic ---
  const applyDecorations = (editor: monaco.editor.IStandaloneCodeEditor, changes: CodeChange[]) => {
    if (!editor || !changes) return;

    // Clear old decorations
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
  // File risk logic
  const flattenTree = (node: FileTreeNode): FileTreeNode[] => {
    let files: FileTreeNode[] = [];
    if (node.type === 'file') {
        files.push(node);
    }
    if (node.children) {
        node.children.forEach(child => {
            files = files.concat(flattenTree(child));
        });
    }
    return files;
  };

  const topOffenders = React.useMemo(() => {
      if (!fileTree) return [];
      const allFiles = flattenTree(fileTree);
      // Sort descending by risk score, take top 10
      return allFiles
          .filter(f => f.riskScore !== undefined)
          .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
          .slice(0, 10);
  }, [fileTree]);

  // This fires when the "Optimized" editor is finally rendered
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    
    // CRITICAL FIX: Apply decorations immediately if data is already waiting
    if (refactorData && refactorData.changes) {
        applyDecorations(editor, refactorData.changes);
    }
  };

  // Also re-apply if refactorData updates while editor is already open
  useEffect(() => {
    if (editorRef.current && refactorData?.changes) {
        applyDecorations(editorRef.current, refactorData.changes);
    }
  }, [refactorData]);

  // --- Handlers ---
  const handleClone = async () => {
    if (!url) return;
    setIsCloning(true);
    setFileTree(null); 
    setSelectedFile(null); 
    setRefactorData(null); 
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
        provider: AiProvider.Gemini 
      });
      setRefactorData(response);
    } catch (error) {
      console.error(error);
      alert("Refactoring failed.");
    } finally {
      setIsRefactoring(false);
    }
  };

  // --- Render ---
  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <input 
          className={styles.input}
          placeholder="Paste GitHub Repository URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className={styles.button} onClick={handleClone} disabled={isCloning}>
          {isCloning ? 'Cloning...' : 'Analyze Repo'}
        </button>
      </div>

      <div className={styles.mainContent}>
        {/* 2. Sidebar (NOW WITH TABS) */}
        <div className={styles.sidebar}>
          {isCloning ? (
             <div style={{ padding: 20, textAlign: 'center' }}><Spinner /></div>
          ) : fileTree ? (
             <>
                {/* Tabs Header */}
                <div className={styles.sidebarTabs}>
                    <button 
                        className={`${styles.tab} ${activeTab === 'tree' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('tree')}
                    >
                        File Explorer
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'hotspots' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('hotspots')}
                    >
                        Top 10 Hotspots
                    </button>
                </div>

                {/* Tab Content */}
                <div style={{ padding: '10px 0' }}>
                    {activeTab === 'tree' ? (
                        <FileTree node={fileTree} onFileClick={(node) => setSelectedFile(node)} />
                    ) : (
                        <div className={styles.hotspotList}>
                            {topOffenders.map((file, index) => (
                                <div 
                                    key={file.fullPath} 
                                    className={styles.hotspotItem}
                                    onClick={() => setSelectedFile(file)}
                                    style={{ backgroundColor: selectedFile?.fullPath === file.fullPath ? '#e2e8f0' : '' }}
                                >
                                    <div className={styles.hotspotName}>
                                        {index + 1}. {file.name}
                                    </div>
                                    <div className={styles.hotspotMetrics}>
                                        <span>Cmp: {file.cyclomaticComplexity}</span>
                                        <span className={styles.hotspotScore}>Risk: {Math.round(file.riskScore || 0)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </>
          ) : (
             <div className={styles.emptySidebar}>No repository loaded.</div>
          )}
        </div>
        
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
                      <button 
                        className={styles.refactorBtn} 
                        onClick={handleRefactorCurrentFile}
                        disabled={isRefactoring || isFetchingFile}
                      >
                        {isRefactoring ? 'Optimizing...' : '⚡ Refactor This File'}
                      </button>
                  </div>

                  {refactorData ? (
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
                                <div className={styles.paneTitle} style={{ color: '#10b981' }}>Optimized</div>
                                <Editor 
                                    height="100%" defaultLanguage="csharp" 
                                    value={refactorData.refactoredCode} 
                                    onMount={handleEditorDidMount} 
                                    options={{ 
                                        readOnly: true, 
                                        minimap: { enabled: false },
                                        glyphMargin: true 
                                    }} 
                                />
                            </div>
                        </div>
                        
                        {/* Metrics Dashboard appears here if Backend sent metrics */}
                        <div style={{ padding: '0 20px 40px 20px', flexShrink: 0 }}>
                            <MetricsDashboard response={refactorData} />
                        </div>
                      </>
                  ) : (
                      <div className={styles.singleEditorContainer}>
                          {isFetchingFile && (
                              <div className={styles.loadingOverlay}><Spinner /></div>
                          )}
                          <Editor 
                              height="100%" defaultLanguage="csharp" 
                              value={originalCode} 
                              options={{ readOnly: true, minimap: { enabled: false } }}
                          />
                      </div>
                  )}
              </>
            )}
        </div>
      </div>
    </div>
  );
};