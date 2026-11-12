import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Minus,
  Send,
  Bot,
  User,
  ShieldAlert,
  FileText,
  HelpCircle,
  Stethoscope,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { recordService } from '../services/recordService';
import { ChatMessage } from '../types/patient';
import { Button } from './ui/Button';

export const FloatingAiChatbot: React.FC = () => {
  const { selectedPatient } = usePatient();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting when patient changes or drawer opens
  useEffect(() => {
    if (selectedPatient && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg',
          sender: 'assistant',
          content: `Hello! I am **Ask MY CLINIX**, your evidentiary clinical assistant. I have synthesized **${selectedPatient.first_name}'s** verified medical records.\n\nYou can ask me to explain lab reports, review active medications, highlight health observations, or prepare questions for your next doctor's appointment.`,
          timestamp: 'Just now',
          recommendations: [
            'Explain my latest blood test results',
            'Which medications am I currently taking?',
            'What questions should I ask my doctor?',
            'Check for missing information in my record',
          ],
          disclaimer: 'MY CLINIX AI answers strictly from uploaded medical records and never provides a medical diagnosis or treatment plan. For emergencies, seek immediate medical care.',
        },
      ]);
    }
  }, [selectedPatient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || !selectedPatient || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const response = await recordService.askAi(selectedPatient.id, q);
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        content: response.content,
        timestamp: response.timestamp,
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
          content: 'I could not establish an evidentiary response from the currently accessible records. Please verify that documents are uploaded and try again.',
          timestamp: 'Now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button at Bottom-Right */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 group">
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#0f2b48] text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none flex items-center gap-1.5 border border-teal-500/30">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>Ask MY CLINIX</span>
          </div>

          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0f2b48] to-[#0d9488] text-white flex items-center justify-center shadow-[0_8px_25px_rgba(13,148,136,0.35)] hover:shadow-[0_10px_30px_rgba(13,148,136,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-teal-300/30 relative"
            title="Ask MY CLINIX AI Chatbot"
          >
            <Sparkles className="w-7 h-7 text-teal-200 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
          </button>
        </div>
      )}

      {/* Slide-over Right Chat Panel */}
      {isOpen && (
        <div
          className={`fixed bottom-0 right-0 z-50 bg-white shadow-2xl border-l border-slate-200 transition-all duration-300 flex flex-col ${
            isMinimized
              ? 'h-14 w-80 rounded-tl-2xl'
              : 'h-full sm:h-[92vh] sm:bottom-4 sm:right-4 w-full sm:w-[440px] sm:rounded-2xl border'
          }`}
        >
          {/* Header */}
          <div className="h-14 px-4 bg-[#0f2b48] text-white flex items-center justify-between sm:rounded-t-2xl shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-400/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight">Ask MY CLINIX</h3>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-400/30">
                    AI Assistant
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 -mt-0.5">
                  {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}'s Record Context` : 'Select Patient'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Body (Hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div key={msg.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-[#0f2b48] text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`max-w-[85%] space-y-2`}>
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isUser
                              ? 'bg-[#0f2b48] text-white rounded-br-xs shadow-xs'
                              : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          <div className="whitespace-pre-line">{msg.content}</div>

                          {/* Supporting Document Citations */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider block">
                                Evidentiary Source Citations:
                              </span>
                              {msg.citations.map((c, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-slate-800">{c.document_name}</strong>
                                    {c.page && <span> (Page {c.page})</span>}
                                    {c.text_span && <p className="text-[10px] text-slate-500 italic mt-0.5">"{c.text_span}"</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Suggested Follow-up Prompts */}
                          {msg.recommendations && msg.recommendations.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-slate-100">
                              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
                                Suggested Topics:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.recommendations.map((rec, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleSend(rec)}
                                    className="text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-2 py-1 rounded-md transition-colors text-left"
                                  >
                                    {rec}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Questions for Doctor */}
                          {msg.questions_for_doctor && msg.questions_for_doctor.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-slate-100 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-900 mb-1">
                                <Stethoscope className="w-3.5 h-3.5 text-blue-700" />
                                <span>Questions for Your Doctor:</span>
                              </div>
                              <ul className="list-disc list-inside text-[11px] text-blue-800 space-y-0.5">
                                {msg.questions_for_doctor.map((q, i) => (
                                  <li key={i}>{q}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Disclaimer */}
                          {msg.disclaimer && (
                            <p className="mt-2.5 text-[10px] text-slate-400 leading-tight">
                              {msg.disclaimer}
                            </p>
                          )}
                        </div>

                        <span className="text-[9px] text-slate-400 block px-1">{msg.timestamp}</span>
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex gap-2 items-center text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 max-w-xs">
                    <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
                    <span>Analyzing patient record evidence...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-white border-t border-slate-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask about reports, drugs, vitals..."
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] focus:bg-white text-slate-800"
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!inputQuery.trim() || loading}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    Send
                  </Button>
                </form>
                <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[9px] text-slate-400">
                  <ShieldAlert className="w-3 h-3 text-teal-600" />
                  <span>Never provides diagnoses • Grounded in patient records</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
