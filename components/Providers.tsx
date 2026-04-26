'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { ErrorProvider } from '@/contexts/ErrorContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ErrorProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          theme="light"
          toastOptions={{
            style: {
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
            },
          }}
        />
      </ErrorProvider>
    </SessionProvider>
  );
}
