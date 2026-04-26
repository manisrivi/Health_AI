'use client';

import { use, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import AiReportDisplay from '@/components/AiReportDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';
import Navbar from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useError } from '@/contexts/ErrorContext';

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
  resultsThatNeedAttention?: {
    testName: string;
    result: string;
    normalRange: string;
    status: string;
    whyImportant?: string;
  }[];
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

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showError } = useError();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { id } = use(params);

  const handleDownloadReport = async () => {
    if (!patient?.aiSummary) {
      showError('No AI report available to download', 'error');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = margin;

      const addWrappedText = (
        text: string,
        options?: { fontSize?: number; color?: [number, number, number]; gap?: number }
      ) => {
        doc.setFontSize(options?.fontSize ?? 11);
        if (options?.color) {
          doc.setTextColor(...options.color);
        } else {
          doc.setTextColor(51, 65, 85);
        }
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
        lines.forEach((line: string) => {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += (options?.fontSize ?? 11) + 5;
        });
        y += options?.gap ?? 8;
      };

      const addList = (items: string[]) => {
        items.filter(Boolean).forEach((item) => addWrappedText(`• ${item}`));
      };

      doc.setFillColor(124, 58, 237);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 92, 18, 18, 'F');
      doc.setFillColor(255, 255, 255);
      doc.circle(margin + 26, y + 28, 15, 'F');
      doc.setTextColor(124, 58, 237);
      doc.setFontSize(16);
      doc.text('H+', margin + 17, y + 33);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('HealthAI', margin + 52, y + 30);
      doc.setFontSize(11);
      doc.text('AI Healthcare Report Analyzer', margin + 52, y + 48);
      doc.setFontSize(13);
      doc.text(`Patient: ${patient.name}`, margin + 52, y + 72);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 140, y + 72);
      y += 120;

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.text(`Risk Level: ${patient.riskLevel || 'Not assessed'}`, margin, y);
      y += 28;

      doc.setFontSize(14);
      doc.text('AI Summary', margin, y);
      y += 18;
      addWrappedText(patient.aiSummary, { gap: 12 });

      if (patient.issues?.length) {
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.text('Key Issues', margin, y);
        y += 18;
        addList(patient.issues);
      }

      if (patient.recommendations?.length) {
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.text('Recommendations', margin, y);
        y += 18;
        addList(patient.recommendations);
      }

      if (patient.actionPlan?.length) {
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.text(patient.actionPlanTitle || 'Action Plan', margin, y);
        y += 18;
        addList(patient.actionPlan);
      }

      if (patient.finalSummary) {
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.text('Final Summary', margin, y);
        y += 18;
        addWrappedText(patient.finalSummary, { gap: 12 });
      }

      addWrappedText(
        'This report is for informational purposes only and does not replace professional medical advice.',
        { fontSize: 10, color: [100, 116, 139], gap: 0 }
      );

      doc.save(`${patient.name.replace(/\s+/g, '_')}_HealthAI_Report.pdf`);
      showError('Report downloaded successfully', 'success');
    } catch {
      showError('Failed to download report', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!session || !id) return;
      setIsFetching(true);
      const res = await fetch(`/api/patients/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPatient(data);
      } else if (res.status === 404) {
        router.push('/dashboard');
      }
      setIsFetching(false);
    };

    fetchPatient();
  }, [session, id, router]);

  if (status === 'loading' || isFetching || !patient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Loading patient details..." />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="rounded-xl">
            ← Back to Dashboard
          </Button>
        </div>
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.55fr,0.85fr]">
          <Card className="overflow-hidden border-sky-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.98))]">
            <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] text-xl font-semibold text-white shadow-lg shadow-sky-200">
                    {getInitials(patient.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-sky-700">Patient overview</p>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                      {patient.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">ID {patient._id.slice(-8)}</Badge>
                      <Badge variant={getRiskVariant(patient.riskLevel)}>
                        {patient.riskLevel ? `${patient.riskLevel} risk` : 'Risk pending'}
                      </Badge>
                      <Badge variant={patient.status === 'Completed' ? 'success' : 'warning'}>
                        {patient.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:min-w-52">
                  {patient.reportUrl ? (
                    <Button asChild variant="secondary" className="rounded-xl">
                      <a href={patient.reportUrl} target="_blank" rel="noopener noreferrer">
                        View original report
                      </a>
                    </Button>
                  ) : null}
                  <Button className="rounded-xl" onClick={handleDownloadReport} disabled={isGeneratingPdf}>
                    {isGeneratingPdf ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Generating PDF...
                      </>
                    ) : (
                      'Download AI report'
                    )}
                  </Button>
                </div>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Review patient demographics, AI findings, and follow-up guidance in a format that
                stays easy to scan during clinical workflows.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick facts</CardTitle>
              <CardDescription>Core patient information at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <InfoTile label="Phone" value={patient.phone} />
              <InfoTile label="Email" value={patient.email} />
              <InfoTile label="Age" value={`${patient.age} years`} />
              <InfoTile label="Gender" value={patient.gender} />
              <InfoTile label="Created" value={new Date(patient.createdAt).toLocaleDateString()} />
            </CardContent>
          </Card>
        </section>

        {patient.status === 'Completed' ? (
          <Card>
            <CardHeader className="border-b border-slate-100 pb-5">
              <CardTitle>AI clinical summary</CardTitle>
              <CardDescription>
                Plain-language findings for faster patient review. This is not a diagnosis.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <AiReportDisplay
                patientName={patient.name}
                aiSummary={patient.aiSummary}
                riskLevel={patient.riskLevel}
                resultsNeedingAttention={patient.resultsNeedingAttention}
                resultsThatNeedAttention={patient.resultsThatNeedAttention}
                keyTakeawaysIntro={patient.keyTakeawaysIntro}
                keyTakeaways={patient.keyTakeaways}
                keyTakeawaysClosing={patient.keyTakeawaysClosing}
                actionPlanTitle={patient.actionPlanTitle}
                actionPlanMarkdown={patient.actionPlanMarkdown}
                actionPlan={patient.actionPlan}
                issues={patient.issues}
                recommendations={patient.recommendations}
                finalSummary={patient.finalSummary}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Analysis in progress</CardTitle>
              <CardDescription>
                The uploaded PDF is still being processed. Refresh this page in a moment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
                AI analysis has not completed yet for this patient.
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
