'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import ErrorAlert from '@/components/ErrorAlert';

interface ErrorContextType {
  showError: (message: string, type?: 'error' | 'warning' | 'success' | 'info') => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [error, setError] = useState<{ message: string; type: 'error' | 'warning' | 'success' | 'info' } | null>(null);

  const showError = (message: string, type: 'error' | 'warning' | 'success' | 'info' = 'error') => {
    setError({ message, type });
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <ErrorContext.Provider value={{ showError, clearError }}>
      {children}
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <ErrorAlert
            message={error.message}
            type={error.type}
            onClose={clearError}
          />
        </div>
      )}
    </ErrorContext.Provider>
  );
}
