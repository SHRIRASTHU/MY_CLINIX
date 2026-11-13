export interface AuditLogEntry {
  id: string;
  action: string;
  outcome: string;
  actor_id?: string;
  actor_name?: string;
  actor_email?: string;
  actor_role?: string;
  patient_id?: string;
  document_id?: string;
  request_ip?: string;
  created_at: string;
  extra_context?: string;
}

export interface PaginatedAuditLogs {
  items: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
