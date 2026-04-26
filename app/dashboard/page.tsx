'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import SkeletonLoader from '@/components/SkeletonLoader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useError } from '@/contexts/ErrorContext';

interface Patient {
  _id: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  gender: string;
  status: string;
  riskLevel?: 'Low' | 'Medium' | 'High';
  createdAt: string;
  publicToken?: string;
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'Completed':
      return 'success' as const;
    case 'Pending':
      return 'warning' as const;
    case 'Failed':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
}

function getRiskVariant(riskLevel?: string, status?: string) {
  switch (riskLevel) {
    case 'Low':
      return 'success' as const;
    case 'Medium':
      return 'warning' as const;
    case 'High':
      return 'destructive' as const;
    default:
      return status === 'Completed' ? ('default' as const) : ('secondary' as const);
  }
}

function getRiskLabel(riskLevel?: string, status?: string) {
  if (riskLevel) return `${riskLevel} risk`;
  if (status === 'Completed') return 'Risk pending';
  return 'Not assessed';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showError } = useError();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Patient | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (!session) return;

    fetch('/api/patients')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Patient[]) => {
        setPatients(data);
        setFilteredPatients(data);
      });
  }, [session]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    const trimmedQuery = value.trim().toLowerCase();
    setFilteredPatients(
      trimmedQuery
        ? patients.filter((patient) => patient.name.toLowerCase().includes(trimmedQuery))
        : patients
    );
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;

    const res = await fetch(`/api/patients/${pendingDelete._id}`, { method: 'DELETE' });
    if (res.ok) {
      const updatedPatients = patients.filter((patient) => patient._id !== pendingDelete._id);
      setPatients(updatedPatients);
      setFilteredPatients(
        query.trim()
          ? updatedPatients.filter((patient) =>
              patient.name.toLowerCase().includes(query.trim().toLowerCase())
            )
          : updatedPatients
      );
      showError('Patient deleted successfully.', 'success');
    } else {
      showError('Failed to delete patient.', 'error');
    }
    setPendingDelete(null);
  };

  const handleShare = async (publicToken?: string) => {
    if (!publicToken) {
      showError('Report link not available. Please wait for analysis to complete.', 'error');
      return;
    }

    const publicUrl = `${window.location.origin}/report/${publicToken}`;

    try {
      await navigator.clipboard.writeText(publicUrl);
      showError('Report link copied to clipboard!', 'success');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = publicUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showError('Report link copied to clipboard!', 'success');
    }
  };

  if (status === 'loading') {
    return <SkeletonLoader />;
  }

  if (!session) {
    return null;
  }

  const completedCount = patients.filter((patient) => patient.status === 'Completed').length;
  const pendingCount = patients.filter((patient) => patient.status !== 'Completed').length;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8">
          <Card className="overflow-hidden border-sky-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.98))]">
            <CardContent className="flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 text-[11px] tracking-[0.2em]">
                  CARE OPERATIONS
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Patient reporting, organized for a clinical workflow.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                  Search patients, monitor report status, and share AI-ready summaries from one
                  polished dashboard.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-xl">
                  <Link href="/add-patient">Add Patient</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <StatCard
            iconClassName="bg-purple-100 text-purple-700"
            label="Total Patients"
            value={patients.length}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M17 20h5v-2a3 3 0 0 0-5.36-1.86M17 20H7m10 0v-2c0-.65-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 0 1 5.36-1.86M7 20v-2c0-.65.13-1.28.36-1.86m0 0a5 5 0 0 1 9.28 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            }
          />
          <StatCard
            iconClassName="bg-emerald-100 text-emerald-700"
            label="Completed Analyses"
            value={completedCount}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 12 2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
          />
          <StatCard
            iconClassName="bg-amber-100 text-amber-700"
            label="Pending Review"
            value={pendingCount}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
          />
        </section>

        <Card>
          <CardHeader className="gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Patient registry</CardTitle>
              <CardDescription>
                Review records, open reports, and manage sharing from a single table.
              </CardDescription>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                />
              </svg>
              <Input
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search patients by name"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M17 20h5v-2a3 3 0 0 0-5.36-1.86M17 20H7m10 0v-2c0-.65-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 0 1 5.36-1.86M7 20v-2c0-.65.13-1.28.36-1.86m0 0a5 5 0 0 1 9.28 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-950">No patients found</h3>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  {query
                    ? 'Try a different name or clear your search to restore the full list.'
                    : 'Add your first patient to start analyzing healthcare reports.'}
                </p>
                <Button asChild className="mt-6 rounded-xl">
                  <Link href="/add-patient">Add Patient</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Patient</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Demographics</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patient) => (
                      <TableRow key={patient._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                              {getInitials(patient.name)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-950">{patient.name}</p>
                              <p className="text-xs text-slate-500">ID {patient._id.slice(-8)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm text-slate-700">{patient.email}</p>
                            <p className="text-xs text-slate-500">{patient.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm text-slate-700">{patient.age} years</p>
                            <p className="text-xs text-slate-500">{patient.gender}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={getStatusVariant(patient.status)}>{patient.status}</Badge>
                            <Badge variant={getRiskVariant(patient.riskLevel, patient.status)}>
                              {getRiskLabel(patient.riskLevel, patient.status)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(patient.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button asChild variant="outline" size="sm" className="rounded-lg">
                              <Link href={`/patient/${patient._id}`}>View</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="rounded-lg">
                              <Link href={`/edit-patient/${patient._id}`}>Edit</Link>
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="rounded-lg"
                              disabled={!patient.publicToken}
                              onClick={() => handleShare(patient.publicToken)}
                            >
                              Share
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => setPendingDelete(patient)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete patient record?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `This will permanently remove ${pendingDelete.name} and their associated report record.`
                : 'This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon,
  iconClassName,
  label,
  value,
}: {
  icon: ReactNode;
  iconClassName: string;
  label: string;
  value: number;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex  items-start justify-between gap-4 p-6">
        <div className="flex min-w-0 flex-col justify-between self-stretch">
          <p className="text-sm font-medium leading-5 text-slate-500">{label}</p>
          <p className="mt-4 text-3xl font-semibold leading-none tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
