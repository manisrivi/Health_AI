'use client';

import { SessionProvider } from 'next-auth/react';
import { ErrorProvider } from '@/contexts/ErrorContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ErrorProvider>
        {children}
      </ErrorProvider>
    </SessionProvider>
  );
}