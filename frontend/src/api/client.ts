/**
 * API client for Paper Crawler FastAPI backend.
 */

import type {
  CrawlRequest,
  CrawlResponse,
  FetchJob,
  PaperDetail,
  PaperListResponse,
  RelatedPaper,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorMessage = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Use fallback error message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  /** Fetch health check status */
  async getHealth(): Promise<{ status: string; database: string }> {
    return request('/health');
  },

  /** Enqueue a background fetch job for a specific arXiv ID */
  async fetchPaper(arxivId: string): Promise<FetchJob> {
    return request<FetchJob>('/papers/fetch', {
      method: 'POST',
      body: JSON.stringify({ arxiv_id: arxivId }),
    });
  },

  /** Poll status of an ongoing ingestion job */
  async getJob(jobId: string): Promise<FetchJob> {
    return request<FetchJob>(`/jobs/${jobId}`);
  },

  /** Crawl query search results from arXiv Atom API */
  async crawlPapers(req: CrawlRequest): Promise<CrawlResponse> {
    return request<CrawlResponse>('/crawl', {
      method: 'POST',
      body: JSON.stringify({
        query: req.query,
        max_papers: req.max_papers || 20,
        category: req.category || undefined,
      }),
    });
  },

  /** Retrieve full paper details, text, and annotations */
  async getPaper(arxivId: string): Promise<PaperDetail> {
    return request<PaperDetail>(`/papers/${encodeURIComponent(arxivId)}`);
  },

  /** Search and list papers in library */
  async listPapers(params: {
    q?: string;
    category?: string;
    published_from?: string;
    published_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaperListResponse> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.append('q', params.q);
    if (params.category) searchParams.append('category', params.category);
    if (params.published_from) searchParams.append('published_from', params.published_from);
    if (params.published_to) searchParams.append('published_to', params.published_to);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.page_size) searchParams.append('page_size', params.page_size.toString());

    const qs = searchParams.toString();
    return request<PaperListResponse>(`/papers${qs ? `?${qs}` : ''}`);
  },

  /** Fetch top 5 semantically related papers via cosine distance */
  async getRelatedPapers(arxivId: string, limit: number = 5): Promise<RelatedPaper[]> {
    return request<RelatedPaper[]>(`/papers/${encodeURIComponent(arxivId)}/related?limit=${limit}`);
  },
};
