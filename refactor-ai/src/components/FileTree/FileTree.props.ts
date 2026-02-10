import type { FileTreeNode } from "../../types/api.types";

export interface FileTreeProps {
  node: FileTreeNode;
  onFileClick: (node: FileTreeNode) => void;
  level?: number; // Internal prop for indentation
}