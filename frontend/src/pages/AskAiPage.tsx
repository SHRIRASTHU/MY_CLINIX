import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  ShieldAlert,
  FileText,
  Stethoscope,
  Bot,
  User,
  RotateCcw,
  BarChart3,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePatient } from '../hooks/usePatient';
import { aiService, CitationItem, ConversationSummary } from '../services/aiService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

interface PageChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: CitationItem[];
  recommendations?: string[];
  questions_for_doctor?: string[];
  disclaimer?: string;
}

export const AskAiPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedPatient } = usePatient();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<PageChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const role = (user?.role || 'patient').toLowerCase();

  const getInitialGreeting = (): PageChatMessage => {
    if (role === 'doctor') {
      return {
        id: 'welcome-doctor',
        sender: 'assistant',
        content: `Welcome, **Dr. ${user?.full_name || 'Physician'}**.\n\nI am **Ask MY CLINIX Clinical Decision Assistant**. I have direct evidentiary access to authorized clinical records in Supabase PostgreSQL.\n\nYou can query patient medication timelines, check abnormal lab panels, verify drug contraindications, or prepare structured consultation notes.`,
        timestamp: 'Just now',
        recommendations: selectedPatient
          ? [
              'Summarize this patient\'s clinical history',
              'Check for abnormal laboratory values',
              'Review medication contraindications',
              'Draft clinical progress note',
            ]
          : [
              'Summarize my authorized patient roster',
              'Which patients have unresolved conflicts?',
              'Recent laboratory abnormalities across roster',
            ],
        disclaimer:
          'Clinical Decision Support only. Findings must be validated by the attending physician before clinical action.',
      };
    }

    if (role === 'administrator') {
      return {
        id: 'welcome-admin',
        sender: 'assistant',
        content: `Welcome to **Ask MY CLINIX Platform Governance & Analytics**.\n\nI provide real-time platform statistics, physician verification data, active patient counts, document indexing volume, and clinical conflict metrics from Supabase PostgreSQL.`,
        timestamp: 'Just now',
        recommendations: [
          'How many patients and doctors are registered?',
          'Show real-time platform operational metrics',
          'Summarize unresolved clinical contradictions',
          'Audit log compliance and security status',
        ],
        disclaimer:
          'Administrative queries are audited and restricted strictly to platform metadata and governance data.',
      };
    }

    // Default: Patient
    const patientName = selectedPatient?.first_name || user?.full_name?.split(' ')[0] || 'there';
    return {
      id: 'welcome-patient',
      sender: 'assistant',
      content: `Hello ${patientName}! I am **Ask MY CLINIX**, your personal medical-record assistant.\n\nI can explain your laboratory test results, review your prescribed medications, explain medical terms, and help you prepare questions for your doctor.`,
      timestamp: 'Just now',
      recommendations: [
        'Explain my latest blood test results',
        'Which medications am I currently taking?',
        'What questions should I ask my doctor?',
        'Summarize my medical history timeline',
      ],
      disclaimer:
        'MY CLINIX AI answers strictly from your verified medical records and never provides a medical diagnosis or treatment plan. For emergencies, please seek immediate emergency care.',
    };
  };

  useEffect(() => {
    setMessages([getInitialGreeting()]);
    loadConversations();
  }, [selectedPatient?.id, user?.role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const list = await aiService.getConversations();
      setConversations(list);
    } catch {
      // Non-critical, ignore
    }
  };

  const handleStartNewChat = () => {
    setConversationId(null);
    setMessages([getInitialGreeting()]);
  };

  const handleSend = async (queryText?: string) => {
    const q = (queryText || question).trim();
    if (!q || loading) return;

    const userMsg: PageChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await aiService.chat({
        query: q,
        conversation_id: conversationId || undefined,
        patient_id: selectedPatient?.id,
      });

      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
        loadConversations();
      }

      const assistantMsg: PageChatMessage = {
        id: response.message_id || `ai-${Date.now()}`,
        sender: 'assistant',
        content: response.content,
        timestamp: response.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: response.citations,
        recommendations: response.recommendations,
        questions_for_doctor: response.questions_for_doctor,
        disclaimer: response.disclaimer,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          content:
            err?.message ||
            'I could not establish an evidentiary response from the currently accessible records. Please verify connectivity and try again.',
          timestamp: 'Now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (conv: ConversationSummary) => {
    try {
      setLoading(true);
      setConversationId(conv.id);
      const history = await aiService.getMessages(conv.id);
      if (history && history.length > 0) {
        setMessages(
          history.map((m) => ({
            id: m.id,
            sender: m.sender,
            content: m.message_content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            citations: m.citations,
            recommendations: m.recommendations,
            questions_for_doctor: m.questions_for_doctor,
            disclaimer: m.disclaimer,
          }))
        );
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Ask MY CLINIX AI</h1>
            <Badge variant="secondary" size="md">
              {role === 'doctor'
                ? 'Clinical Decision Support'
                : role === 'administrator'
                ? 'Platform Analytics & Governance'
                : 'Personal Health Assistant'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {role === 'doctor'
              ? 'Physician-grade clinical assistant grounded in authorized patient records.'
              : role === 'administrator'
              ? 'Real-time platform operations and metrics querying Supabase PostgreSQL.'
              : 'Answers patient queries exclusively from verified medical records with clickable citations.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleStartNewChat}
          >
            New Conversation
          </Button>
        </div>
      </div>

      {/* Clinical Guardrails Alert */}
      <Alert type="info" title="Evidence-Grounded Intelligence">
        MY CLINIX AI queries verified data directly from Supabase PostgreSQL. It attaches source citations to every factual claim, enforces role-based access isolation, and never makes unsupervised diagnoses.
      </Alert>

      {/* Main Chat Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Recent Conversations */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Saved Sessions</h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                {conversations.length}
              </span>
            </div>
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No previous sessions found.</p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectConversation(c)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex flex-col gap-0.5 ${
                      conversationId === c.id
                        ? 'bg-teal-50 border border-teal-200 text-teal-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{c.title || 'Consultation'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {selectedPatient && role !== 'administrator' && (
            <Card className="p-4 bg-slate-50 border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 mb-1">Active Patient Context</h4>
              <p className="text-xs text-slate-600">
                <strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong>
              </p>
              <p className="text-[11px] text-slate-500">DOB: {selectedPatient.date_of_birth} | Blood: {selectedPatient.blood_group}</p>
            </Card>
          )}
        </div>

        {/* Main Chat Window */}
        <div className="lg:col-span-3 flex flex-col h-[650px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-[#0f2b48] text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                      {role === 'doctor' ? (
                        <Stethoscope className="w-4 h-4" />
                      ) : role === 'administrator' ? (
                        <BarChart3 className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                  )}

                  <div className="max-w-[85%] space-y-2">
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#0f2b48] text-white rounded-br-xs shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-xs'
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.content}</div>

                      {/* Source Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider block">
                            Verified Source Citations:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.citations.map((c, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200"
                              >
                                <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-slate-800">{c.document_name}</strong>
                                  {c.page && <span> (Page {c.page})</span>}
                                  {c.text_span && (
                                    <p className="text-[11px] text-slate-500 italic mt-0.5">"{c.text_span}"</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Prompts */}
                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
                            Suggested Topics:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.recommendations.map((rec, i) => (
                              <button
                                key={i}
                                onClick={() => handleSend(rec)}
                                className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-lg transition-colors text-left"
                              >
                                {rec}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Questions for Doctor */}
                      {msg.questions_for_doctor && msg.questions_for_doctor.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 mb-1">
                            <Stethoscope className="w-4 h-4 text-blue-700" />
                            <span>Questions for Attending Physician:</span>
                          </div>
                          <ul className="list-disc list-inside text-xs text-blue-800 space-y-1">
                            {msg.questions_for_doctor.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Disclaimer */}
                      {msg.disclaimer && (
                        <p className="mt-3 text-[10px] text-slate-400 leading-tight">
                          {msg.disclaimer}
                        </p>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 block px-1">{msg.timestamp}</span>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2 items-center text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 max-w-xs shadow-xs">
                <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
                <span>Synthesizing response from records...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Input Area */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  role === 'administrator'
                    ? 'Ask about registered users, platform metrics, active doctors...'
                    : role === 'doctor'
                    ? 'Ask about patient charts, abnormal labs, contradictions, timeline...'
                    : 'Ask about reports, drugs, vitals, next consultation...'
                }
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0d9488] focus:bg-white text-slate-800"
                disabled={loading}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!question.trim() || loading}
                icon={<Send className="w-4 h-4" />}
              >
                Send
              </Button>
            </form>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5 text-teal-600" />
              <span>
                {role === 'administrator'
                  ? 'Real-time database analytics • Audited access'
                  : 'Evidence-grounded medical AI • Never provides unsupervised diagnoses'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
