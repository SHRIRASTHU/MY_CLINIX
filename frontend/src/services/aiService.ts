import { apiRequest } from './apiClient';

export interface CitationItem {
  document_name: string;
  page?: number;
  text_span?: string;
}

export interface AIChatRequest {
  query: string;
  conversation_id?: string;
  patient_id?: string;
}

export interface AIChatResponse {
  conversation_id: string;
  message_id: string;
  query: string;
  content: string;
  role: string;
  citations: CitationItem[];
  recommendations: string[];
  questions_for_doctor: string[];
  disclaimer?: string;
  timestamp: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  role: string;
  patient_id?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface AIMessageItem {
  id: string;
  conversation_id: string;
  sender: 'user' | 'assistant';
  message_content: string;
  citations?: CitationItem[];
  recommendations?: string[];
  questions_for_doctor?: string[];
  disclaimer?: string;
  created_at: string;
}

export const aiService = {
  /**
   * Send a query to the centralized OpenAI chatbot endpoint.
   * Backed by role-based Supabase/PostgreSQL context retrieval and persistent memory.
   */
  chat: (payload: AIChatRequest): Promise<AIChatResponse> =>
    apiRequest<AIChatResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * List all conversations for the authenticated user.
   */
  getConversations: (): Promise<ConversationSummary[]> =>
    apiRequest<ConversationSummary[]>('/ai/conversations'),

  /**
   * Get all messages within a specific conversation.
   */
  getMessages: (conversationId: string): Promise<AIMessageItem[]> =>
    apiRequest<AIMessageItem[]>(`/ai/conversations/${conversationId}/messages`),

  /**
   * Start a new persistent conversation thread.
   */
  newConversation: (patientId?: string, title?: string): Promise<ConversationSummary> => {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId);
    if (title) params.append('title', title);
    const qs = params.toString();
    return apiRequest<ConversationSummary>(`/ai/conversations/new${qs ? `?${qs}` : ''}`, {
      method: 'POST',
    });
  },

  /**
   * Delete a specific conversation session.
   */
  deleteConversation: (conversationId: string): Promise<{ status: string; conversation_id: string }> =>
    apiRequest<{ status: string; conversation_id: string }>(`/ai/conversations/${conversationId}`, {
      method: 'DELETE',
    }),

  /**
   * Clear all conversations for the current user.
   */
  clearAllConversations: (): Promise<{ status: string; deleted_count: number }> =>
    apiRequest<{ status: string; deleted_count: number }>('/ai/conversations', {
      method: 'DELETE',
    }),
};
