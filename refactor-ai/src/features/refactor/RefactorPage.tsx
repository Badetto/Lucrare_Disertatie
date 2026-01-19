import React, { useState, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor'; // Needed for types
import { AiProvider, type CodeChange } from '../../types/api.types'; // Import CodeChange
import { refactorCode } from '../../services/refactorService';
import { Controls } from './components/Controls/Component';
import { Spinner } from '../../components/spinner/Spinner';


const styles = {
  pageContainer: {
    height: '95vh',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '20px',
  },
  header: {
    marginBottom: '20px',
    textAlign: 'center' as const,
  },
  editorContainer: {
    display: 'flex',
    gap: '20px',
    flex: 1, // Takes up remaining height
    minHeight: 0, // Important for flex containers with scrollable content
  },
  pane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  paneHeader: {
    padding: '10px 15px',
    backgroundColor: '#f1f5f9',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: 'bold',
    color: '#475569',
  }
};

export const RefactorPage: React.FC = () => {
  const [code, setCode] = useState<string>('// Paste your C# code here...');
  const [provider, setProvider] = useState<AiProvider>(AiProvider.Gemini);
  const [language, setLanguage] = useState<string>('csharp');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);

  // We need a reference to the EDITOR INSTANCE to add decorations
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  // Store the decorations so we can clear them later
  const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Helper to apply tooltips
  const applyDecorations = (changes: CodeChange[]) => {
    if (!editorRef.current) return;

    // Convert API changes to Monaco decorations
    const newDecorations: monaco.editor.IModelDeltaDecoration[] = changes.map(change => ({
      range: new monaco.Range(change.lineNumber, 1, change.lineNumber, 1),
      options: {
        isWholeLine: true,
        className: 'refactor-highlight-line', // CSS class for line background
        glyphMarginClassName: 'refactor-glyph-icon', // CSS class for gutter icon
        hoverMessage: { 
            value: `**${change.principle}**\n\n${change.description}` 
        }
      }
    }));

    // Apply and save reference
    decorationsCollection.current = editorRef.current.createDecorationsCollection(newDecorations);
  };

  const handleRefactor = async () => {
    setIsLoading(true);
    setResult(null);
    
    // Clear old decorations if any
    if (decorationsCollection.current) {
        decorationsCollection.current.clear();
    }

    try {
      const response = await refactorCode({
        code: code,
        language: language,
        provider: provider
      });
      
      setResult(response.refactoredCode);

      // Wait a tiny bit for the editor to load the new text, then apply decorations
      setTimeout(() => {
          if (response.changes && response.changes.length > 0) {
              applyDecorations(response.changes);
          }
      }, 100);

    } catch (error) {
      alert("Failed to refactor. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <h1>AI Code Refactor</h1>
      </div>
      
      <Controls 
        selectedProvider={provider}
        selectedLanguage={language}
        onProviderChange={setProvider}
        onLanguageChange={setLanguage}
        onRefactorClick={handleRefactor}
        isLoading={isLoading}
      />

      <div style={styles.editorContainer}>
        {/* Input */}
        <div style={styles.pane}>
            <div style={styles.paneHeader}>Input Code</div>
            <Editor 
              height="100%"
              defaultLanguage="csharp"
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
            />
        </div>

        {/* Output */}
        <div style={styles.pane}>
            <div style={styles.paneHeader}>Refactored Result</div>
            {isLoading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spinner />
                </div>
            ) : (
                <Editor 
                  height="100%"
                  defaultLanguage="csharp"
                  language={language}
                  value={result || '// Result will appear here...'}
                  onMount={handleEditorDidMount} // Capture editor instance
                  options={{ 
                      readOnly: true, 
                      glyphMargin: true, // Enable the gutter for icons
                      domReadOnly: true
                  }}
                />
            )}
        </div>
      </div>
    </div>
  );
};