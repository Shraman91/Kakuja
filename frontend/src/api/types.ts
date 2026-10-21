/**
 * Data contracts and TypeScript interfaces for Paper Crawler.
 */

export type AnnotationCategory = 'result' | 'method' | 'dataset' | 'concept';

export interface Annotation {
  id: string;
  paper_id: string;
  category: AnnotationCategory;
  start_offset: number;
  end_offset: number;
  text: string;
  score: number;
}

export interface PaperListItem {
  id: string;
  arxiv_id: string;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  published_at?: string;
  pdf_url?: string;
  created_at: string;
}

export interface PaperDetail extends PaperListItem {
  full_text?: string;
  annotations: Annotation[];
}

export interface PaperListResponse {
  items: PaperListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface RelatedPaper extends PaperListItem {
  similarity_score: number;
}

export type JobStatus =
  | 'queued'
  | 'fetching_metadata'
  | 'downloading_pdf'
  | 'analyzing'
  | 'completed'
  | 'failed';

export interface FetchJob {
  id: string;
  arxiv_id: string;
  status: JobStatus;
  progress: number;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface CrawlRequest {
  query: string;
  max_papers?: number;
  category?: string;
}

export interface CrawlResponse {
  batch_id: string;
  query: string;
  category?: string;
  queued_count: number;
  skipped_count: number;
  jobs: FetchJob[];
}
