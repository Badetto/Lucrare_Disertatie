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

  return (
    <div>
      <div 
        className={styles.item} 
        style={{ paddingLeft: `${level * 15 + 10}px` }} // Indentation
        onClick={handleClick}
      >
        <span className={`${styles.icon} ${isFolder ? styles.folderIcon : styles.fileIcon}`}>
          {isFolder ? (isOpen ? '📂' : '📁') : '📄'}
        </span>
        {node.name}
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