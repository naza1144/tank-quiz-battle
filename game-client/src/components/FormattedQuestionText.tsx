import React from 'react';

interface FormattedQuestionTextProps {
  text: string;
  className?: string;
}

export const FormattedQuestionText: React.FC<FormattedQuestionTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Check if text contains markdown code blocks ```...```
  if (!text.includes('```')) {
    return <span className={`whitespace-pre-line ${className}`}>{text}</span>;
  }

  // Split by ```
  const parts = text.split(/```(?:python|py)?/gi);

  return (
    <div className={`space-y-2 ${className}`}>
      {parts.map((part, index) => {
        // Even indices are regular text, odd indices are code blocks
        if (index % 2 === 1) {
          const codeLines = part.trim();
          return (
            <div key={index} className="my-2 text-left">
              <pre className="bg-slate-950/90 text-emerald-300 p-3 rounded-lg border border-slate-700 font-mono text-xs sm:text-sm overflow-x-auto shadow-inner leading-snug">
                <code>{codeLines}</code>
              </pre>
            </div>
          );
        }

        const trimmed = part.trim();
        if (!trimmed) return null;

        return (
          <p key={index} className="leading-relaxed whitespace-pre-line text-left sm:text-center">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
};
