'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (session) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (session) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">HealthAI</span>
            </div>

            {/* Sign In Button */}
            <Link
              href="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors duration-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="grid lg:grid-cols-3 gap-8 items-center">
          
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span>AI Powered Analysis</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Understand Your Health Reports Instantly
            </h1>

            {/* Description */}
            <p className="text-lg text-gray-600 leading-relaxed">
              Upload medical reports and get clear AI analysis in seconds. Get insights you can understand and act on.
            </p>

            {/* CTA Button */}
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Get Started
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-gray-900">10k+</div>
                <div className="text-sm text-gray-600">Reports</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-gray-900">98%</div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-gray-900">2s</div>
                <div className="text-sm text-gray-600">Analysis</div>
              </div>
            </div>
          </div>

          {/* Center Column - Upload Demo */}
          <div className="lg:col-span-1 flex justify-center">
            <div className="w-full max-w-sm">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-white shadow-lg hover:shadow-xl transition-shadow duration-200">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="text-gray-900 font-medium mb-2">Drop your report here</div>
                <div className="text-sm text-gray-500">Supports PDF</div>
              </div>
            </div>
          </div>

          {/* Right Column - Sample Report */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    JD
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">John Doe</div>
                    <div className="text-sm text-gray-500">Sample Report</div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                  <span>AI Analysis Complete</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Hemoglobin</span>
                  <span className="text-sm font-medium text-green-600">Normal</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Blood Sugar</span>
                  <span className="text-sm font-medium text-red-600">High</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Cholesterol</span>
                  <span className="text-sm font-medium text-yellow-600">Borderline</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Platelets</span>
                  <span className="text-sm font-medium text-green-600">Normal</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500 text-center">
                  Analysis completed in 2.3 seconds
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
