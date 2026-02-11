import React from 'react';
import { AiProvider } from '../../../../types/api.types';
import styles from './Controls.module.css';
import type { ControlsProps } from './Controls.props';

export const Controls: React.FC<ControlsProps> = ({
  selectedProvider,
  selectedLanguage,
  onProviderChange,
  onLanguageChange,
  onRefactorClick,
  isLoading
}) => {
  return (
    <div className={styles.container}>
      <select 
        className={styles.select}
        value={selectedProvider} 
        onChange={(e) => onProviderChange(Number(e.target.value))}
      >
        <option value={AiProvider.OpenAi}>ChatGPT (OpenAI)</option>
        <option value={AiProvider.Groq}>Groq (Nvdia)</option>
        <option value={AiProvider.Gemini}>Gemini (Google)</option>
        <option value={AiProvider.HuggingFace}>Qwen (Hugging Face)</option>
      </select>

      <select 
        className={styles.select}
        value={selectedLanguage} 
        onChange={(e) => onLanguageChange(e.target.value)}
      >
        <option value="csharp">C#</option>
        <option value="typescript">TypeScript</option>
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="java">Java</option>
      </select>

      <button 
        className={styles.button}
        onClick={onRefactorClick}
        disabled={isLoading}
      >
        {isLoading ? 'Refactoring...' : 'Refactor Code'}
      </button>
    </div>
  );
};