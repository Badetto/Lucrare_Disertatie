import axios from 'axios';
import type { FileTreeNode } from '../types/api.types';

const apiClient = axios.create({
  baseURL: 'http://localhost:5153/api', // Check port
  headers: { 'Content-Type': 'application/json' },
});

export const cloneRepository = async (url: string): Promise<FileTreeNode> => {
  const response = await apiClient.post<FileTreeNode>('/Repository/clone', { repositoryUrl: url });
  return response.data;
};

// We will use this in the next step
export const getFileContent = async (path: string): Promise<{ content: string }> => {
  const response = await apiClient.get<{ content: string }>(`/Repository/file?path=${encodeURIComponent(path)}`);
  return response.data;
};