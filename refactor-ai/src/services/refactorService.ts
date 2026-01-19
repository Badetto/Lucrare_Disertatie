import axios from 'axios';
import type { RefactorRequest, RefactorResponse } from '../types/api.types';

// Create an axios instance with base URL (adjust port to your backend)
const apiClient = axios.create({
  baseURL: 'http://localhost:5153/api', // CHECK YOUR BACKEND PORT!
  headers: {
    'Content-Type': 'application/json',
  },
});

export const refactorCode = async (request: RefactorRequest): Promise<RefactorResponse> => {
  try {
    const response = await apiClient.post<RefactorResponse>('/Refactor/refactor', request);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};