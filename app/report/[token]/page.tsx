'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AiReportDisplay from '@/components/AiReportDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

function getRiskVariant(riskLevel?: string) {
  switch (riskLevel) {
    case 'High':
      return 'destructive' as const;
    case 'Medium':
      return 'warning' as const;
    case 'Low':
      return 'success' as const;
    default:
      return 'secondary' as const;
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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
      } catch {
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Loading report..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-xl text-center">
          <CardHeader>
            <CardTitle>Report unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>Go to homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/60 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#1d4ed8)] shadow-lg shadow-sky-200">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 0 1 5.656 0L10 6.343l1.172-1.171a4 4 0 1 1 5.656 5.656L10 17.657l-6.828-6.829a4 4 0 0 1 0-5.656Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-slate-950">HealthAI</p>
              <p className="text-xs text-slate-500">Shared patient report</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>
            Home
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.45fr,0.9fr]">
          <Card className="overflow-hidden border-sky-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.98))]">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] text-xl font-semibold text-white shadow-lg shadow-sky-200">
                    {getInitials(patient.name)}
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-3 rounded-full px-3 py-1 text-[11px] tracking-[0.2em]">
                      AI REPORT
                    </Badge>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                      {patient.name}
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                      Patient snapshot prepared for readable remote sharing.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge variant={getRiskVariant(patient.riskLevel)}>
                        {patient.riskLevel ? `${patient.riskLevel} risk` : 'Risk pending'}
                      </Badge>
                      <Badge variant="secondary">
                        Generated {new Date(patient.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                </div>
                {patient.reportUrl ? (
                  <Button asChild variant="secondary" className="rounded-xl">
                    <a href={patient.reportUrl} target="_blank" rel="noopener noreferrer">
                      View original PDF
                    </a>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient details</CardTitle>
              <CardDescription>Core demographics included in the shared summary.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <InfoRow label="Age" value={`${patient.age} years`} />
              <InfoRow label="Gender" value={patient.gender} />
              <InfoRow label="Email" value={patient.email} />
              <InfoRow label="Phone" value={patient.phone} />
            </CardContent>
          </Card>
        </section>

        {patient.aiSummary ? (
          <Card>
            <CardHeader className="border-b border-slate-100 pb-5">
              <CardTitle>Readable AI summary</CardTitle>
              <CardDescription>
                A clean, shareable version of the report findings and recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
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
                keyTakeawaysIntro={patient.keyTakeawaysIntro}
                keyTakeawaysClosing={patient.keyTakeawaysClosing}
                actionPlanTitle={patient.actionPlanTitle}
                actionPlanMarkdown={patient.actionPlanMarkdown}
              />
            </CardContent>
          </Card>
        ) : null}

        <Card className="mt-8 border-amber-100 bg-amber-50/70">
          <CardHeader>
            <CardTitle>Important disclaimer</CardTitle>
            <CardDescription>
              This report is AI-generated and should be reviewed with a qualified healthcare professional.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
