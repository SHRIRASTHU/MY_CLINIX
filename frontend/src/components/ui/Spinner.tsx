import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string; label?: string }> = ({
  size = 'md',
  className = '',
  label,
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-6 gap-2 text-slate-500 ${className}`}>
      <Loader2 className={`${sizes[size]} animate-spin text-[#0d9488]`} />
      {label && <p className="text-xs font-medium text-slate-600">{label}</p>}
    </div>
  );
};
