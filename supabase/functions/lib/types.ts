// Common types for queue processor library functions

export interface QueueJob {
  id: string;
  symbol: string;
  data_type: string;
  status: string;
  priority: number;
  retry_count: number;
  max_retries: number;
  created_at: string;
  estimated_data_size_bytes: number;
  job_metadata: Record<string, unknown>;
}

export interface ProcessJobResult {
  success: boolean;
  dataSizeBytes: number;
  error?: string;
}

