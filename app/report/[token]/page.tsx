'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import AiReportDisplay from '@/components/AiReportDisplay';

interface Patient {
  _id: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  gender: string;
  reportUrl?: string;
  aiSummary?: string;
  riskLevel?: string;
  issues?: string[];
  recommendations?: string[];
  resultsNeedingAttention?: string[];
  resultsThatNeedAttention?: Array<{
    testName: string;
    result: string;
    normalRange: string;
    status: string;
    whyImportant?: string;
  }>;
  keyTakeawaysIntro?: string;
  keyTakeaways?: string[];
  keyTakeawaysClosing?: string;
  actionPlanTitle?: string;
  actionPlanMarkdown?: string;
  actionPlan?: string[];
  finalSummary?: string;
  status: string;
  createdAt: string;
}

export default function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = use(params);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/public/report/${token}`);
        if (res.ok) {
          const data = await res.json();
          setPatient(data);
        } else if (res.status === 404) {
          setError('Report not found or has been removed');
        } else {
          setError('Failed to load report');
        }
      } catch (err) {
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [token]);

  const getRiskBadge = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading report..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 2.502-2.502V6.838c0-1.54 1.667-2.502 2.502-2.502z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            Go to HealthAI
          </button>
        </div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HealthAI Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">HealthAI</span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </button>
          </div>
        </div>
      </header>

      {/* Report Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Patient Info Header */}
          <div className="bg-white shadow-lg rounded-lg border border-gray-100">
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {patient.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className="text-sm text-gray-500">
                        Age: {patient.age} | Gender: {patient.gender}
                      </span>
                      {patient.riskLevel && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskBadge(patient.riskLevel)}`}>
                          Risk Level: {patient.riskLevel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-500">
                  Report generated on: {new Date(patient.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis Report */}
          {patient.aiSummary && (
            <AiReportDisplay
              patientName={patient.name}
              aiSummary={patient.aiSummary}
              riskLevel={patient.riskLevel}
              resultsNeedingAttention={patient.resultsNeedingAttention}
              resultsThatNeedAttention={patient.resultsThatNeedAttention}
              keyTakeaways={patient.keyTakeaways}
              actionPlan={patient.actionPlan}
              issues={patient.issues}
              recommendations={patient.recommendations}
              finalSummary={patient.finalSummary}
            />
          )}

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 2.502-2.502V6.838c0-1.54 1.667-2.502 2.502-2.502z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Important Disclaimer</h3>
                <p className="text-amber-700">
                  This is AI-generated medical report analysis. While we strive for accuracy, 
                  this analysis should not replace professional medical advice. Always consult 
                  with a qualified healthcare professional for medical decisions and treatment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            © 2026 HealthAI. All rights reserved. | Powered by AI Technology
          </div>
        </div>
      </footer>
    </div>
  );
}
