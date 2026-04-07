export interface ApiCall {
  url: string;
  method: string;
  status: number;
  size: number;
  timestamp: number;
  data: unknown | null;
}

export interface DetectRequest {
  url: string;
  filters?: string[];
}

export interface DetectResponse {
  matchId: string | null;
  teamIds: string[];
  totalRecords: number;
  records: ApiCall[];
}

export interface ErrorResponse {
  message: string;
}
