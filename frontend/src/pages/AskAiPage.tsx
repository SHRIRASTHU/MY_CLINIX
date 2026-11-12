import React, { useState } from 'react';
import { BotMessageSquare, Sparkles, Send, ShieldAlert, BookOpen } from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const AskAiPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const [question, setQuestion] = useState('');

  const sampleQuestions = [
    'Which medicines are recorded in the patient\'s history?',
    'When was the latest blood test recorded?',
    'Which allergies are explicitly documented?',
    'Were any medications explicitly discontinued?',
    'Which investigations were performed in 2025?',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Ask MY CLINIX AI</h1>
            <Badge variant="secondary" size="md">
              Evidence-Grounded Query
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Answers queries exclusively from retrieved medical documents with verifiable source citations.
          </p>
        </div>
      </div>

      <Alert type="error" title="Clinical Guardrails">
        MY CLINIX AI answers strictly from retrieved evidence and attaches source citations to every factual claim. If documents cannot answer a query, it responds: <em>"I cannot establish this from the available medical records."</em> It will never make a diagnosis, offer treatment recommendations, or fabricate missing facts.
      </Alert>

      {selectedPatient ? (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Suggested Evidentiary Queries
            </p>
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={`Ask a question about ${selectedPatient.first_name}'s uploaded medical records...`}
                className="flex-1 px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488]"
              />
              <Button variant="secondary" size="md" icon={<Send className="w-4 h-4" />}>
                Query Records
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Alert type="warning" title="No Patient Selected">
          Please select a patient to launch the evidentiary AI question interface.
        </Alert>
      )}
    </div>
  );
};
