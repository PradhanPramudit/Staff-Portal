import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, prefixNode, suffixNode, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixNode && (
            <div className="absolute left-3 pointer-events-none text-zinc-500 text-sm select-none">
              {prefixNode}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded border bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:opacity-75 ${
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-zinc-300 dark:border-zinc-700'
            } ${prefixNode ? 'pl-8' : ''} ${suffixNode ? 'pr-8' : ''} ${className}`}
            {...props}
          />
          {suffixNode && (
            <div className="absolute right-3 pointer-events-none text-zinc-500 text-sm select-none">
              {suffixNode}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
