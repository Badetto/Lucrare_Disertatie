import axios from 'axios';
import type { BenchmarkRequest, BenchmarkResult, RefactorRequest, RefactorResponse } from '../types/api.types';

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

export const runBenchmark = async (request: BenchmarkRequest): Promise<BenchmarkResult> => {
    try {
        const response = await apiClient.post<BenchmarkResult>(`/Refactor/benchmark`, request);
        return response.data;
    } catch (error) {
        console.error('Benchmark failed:', error);
        throw error;
    }
};