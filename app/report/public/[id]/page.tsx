import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import connectDB from '@/lib/db';
import Patient from '@/models/Patient';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
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

export default async function PublicReportPage({ params }: PageProps) {
  const { id } = await params;

  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return notFound();
  }

  const patient = await Patient.findById(id).lean();

  if (!patient) {
    return notFound();
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-5xl space-y-6">
        <Card className="overflow-hidden border-sky-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.98))]">
          <CardContent className="p-6 sm:p-8">
            <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 text-[11px] tracking-[0.2em]">
              SHARED REPORT
            </Badge>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {patient.name}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Health report summary prepared for easy review.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant={getRiskVariant(patient.riskLevel ?? undefined)}>
                    {patient.riskLevel || 'Low'} risk
                  </Badge>
                  <Badge variant="secondary">
                    {new Date(patient.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
              {patient.reportUrl ? (
                <Button asChild variant="outline">
                  <a href={patient.reportUrl} target="_blank" rel="noopener noreferrer">
                    View original report
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[0.8fr,1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Patient details</CardTitle>
              <CardDescription>Basic context included with the report.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <InfoRow label="Age" value={String(patient.age)} />
              <InfoRow label="Gender" value={patient.gender} />
              <InfoRow label="Status" value={patient.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI summary</CardTitle>
              <CardDescription>Readable overview of the report findings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-7 text-slate-700">
                {patient.aiSummary || 'No summary available'}
              </p>
              <SectionList title="Key issues" items={patient.issues as string[] | undefined} />
              <SectionList
                title="Recommendations"
                items={patient.recommendations as string[] | undefined}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="border-amber-100 bg-amber-50/70">
          <CardHeader>
            <CardTitle>Important disclaimer</CardTitle>
            <CardDescription>
              This is an AI-generated report. Please consult a doctor for medical advice.
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

function SectionList({ title, items }: { title: string; items?: string[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h2>
      {items?.length ? (
        <ul className="mt-3 space-y-3">
          {items.map((item, index) => (
            <li key={index} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No {title.toLowerCase()} available.</p>
      )}
    </div>
  );
}
