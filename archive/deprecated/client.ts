import type {
  ComparisonResponse,
  PerformanceResponse,
} from '../types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

export async function getJSON<T = unknown>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

type UploadKind = 'positions' | 'equity' | 'trades' | 'benchmark';

const UPLOAD_ENDPOINT: Record<UploadKind, string> = {
  positions: '/api/upload',
  equity: '/api/upload',
  trades: '/api/upload/trades',
  benchmark: '/api/upload/benchmark',
};

export async function postCSV(kind: UploadKind, file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  const endpoint = UPLOAD_ENDPOINT[kind];
  const response = await fetch(`${BASE_URL}${endpoint}`, { method: 'POST', body: form });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Upload failed');
  }
  return response.json();
}

export async function getPerformance(symbol?: string): Promise<PerformanceResponse> {
  const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
  return getJSON<PerformanceResponse>(`/api/performance${query}`);
}

export async function getComparison(symbol?: string): Promise<ComparisonResponse> {
  const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
  return getJSON<ComparisonResponse>(`/api/comparison${query}`);
}

export async function listBenchmarkSymbols(): Promise<string[]> {
  const result = await getJSON<{ symbols: string[] }>('/api/benchmarks');
  return result.symbols;
}
