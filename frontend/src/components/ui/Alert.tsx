import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  className = '',
}) => {
  const styles = {
    info: 'bg-blue-50/80 border-blue-200 text-blue-900',
    success: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50/80 border-amber-200 text-amber-900',
    error: 'bg-rose-50/80 border-rose-200 text-rose-900',
  };

  const icons = {
    info: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
  };

  return (
    <div className={`p-4 rounded-xl border flex gap-3 text-sm ${styles[type]} ${className}`}>
      {icons[type]}
      <div className="flex-1">
        {title && <h5 className="font-semibold text-xs uppercase tracking-wider mb-1">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
};
