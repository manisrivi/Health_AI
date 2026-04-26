'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Navbar() {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={session ? '/dashboard' : '/'} className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#1d4ed8)] shadow-lg shadow-sky-200">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <span className="block text-base font-semibold tracking-tight text-slate-950">HealthAI</span>
              <span className="block text-xs text-slate-500">Clinical report workspace</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-3">
            {session ? (
              <>
                <Button asChild className="rounded-xl">
                  <Link href="/add-patient">Add Patient</Link>
                </Button>
                
                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-3 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] text-sm font-semibold text-white">
                      {getInitials(session.user.name || 'User')}
                    </div>
                    <div className="text-left">
                      <p className="max-w-28 truncate text-sm font-medium text-slate-900">{session.user.name}</p>
                      <p className="max-w-28 truncate text-xs text-slate-500">{session.user.email}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <Card className="absolute right-0 mt-3 w-56 overflow-hidden p-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-3">
                        <p className="text-sm font-medium text-slate-900">{session.user.name}</p>
                        <p className="truncate text-xs text-slate-500">{session.user.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        className="mt-2 block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        Sign Out
                      </button>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <Button asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-3">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {session ? (
                <>
                  <Link
                    href="/add-patient"
                    className="block rounded-xl px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Add Patient
                  </Link>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <p className="text-sm font-medium text-slate-900">{session.user.name}</p>
                      <p className="text-xs text-slate-500">{session.user.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="mt-2 block rounded-xl px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        signOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full rounded-xl px-3 py-2 text-left text-base font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <Button asChild className="w-full justify-center">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
