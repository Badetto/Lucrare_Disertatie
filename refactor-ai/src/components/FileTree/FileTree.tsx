import React, { useState } from 'react';
import styles from './FileTree.module.css';
import type { FileTreeProps } from './FileTree.props';

export const FileTree: React.FC<FileTreeProps> = ({ node, onFileClick, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isFolder = node.type === 'folder';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onFileClick(node);
    }
  };

  // Helper to determine the Risk Indicator Color
  const getRiskColor = (score?: number) => {
      if (!score) return 'transparent'; // Folders or uncalculated files
      if (score > 30) return '#ef4444'; // Red (High Risk)
      if (score > 15) return '#f59e0b'; // Yellow (Medium Risk)
      return '#10b981'; // Green (Low Risk/Good)
  };

  return (
    <div>
      <div 
        className={styles.item} 
        style={{ paddingLeft: `${level * 15 + 10}px` }}
        onClick={handleClick}
        title={node.riskScore ? `Risk Score: ${Math.round(node.riskScore)}` : ''}
      >
        <span className={`${styles.icon} ${isFolder ? styles.folderIcon : styles.fileIcon}`}>
          {isFolder ? (isOpen ? '📂' : '📁') : '📄'}
        </span>
        
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.name}
        </span>

        {/* The Risk Indicator Dot (Only for files) */}
        {!isFolder && (
            <span 
              style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getRiskColor(node.riskScore),
                  marginLeft: '8px',
                  flexShrink: 0
              }} 
            />
        )}
      </div>

      {isFolder && isOpen && node.children && (
        <div className={styles.children}>
          {node.children.map((child) => (
            <FileTree 
              key={child.fullPath} 
              node={child} 
              onFileClick={onFileClick} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};