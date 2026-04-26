'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import Navbar from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useError } from '@/contexts/ErrorContext';
import { cn } from '@/lib/utils';

type UploadProgress = 'idle' | 'uploading' | 'analyzing' | 'done';

const progressCopy: Record<Exclude<UploadProgress, 'idle'>, { title: string; description: string }> = {
  uploading: {
    title: 'Uploading secure PDF',
    description: 'We are sending the report to your workspace and validating the file.',
  },
  analyzing: {
    title: 'Generating AI summary',
    description: 'Healthcare AI is extracting findings and preparing the report summary.',
  },
  done: {
    title: 'Finalizing patient record',
    description: 'Everything is ready. We are redirecting you back to the dashboard now.',
  },
};

export default function AddPatientPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showError } = useError();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>('idle');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.age.trim()) {
      newErrors.age = 'Age is required';
    } else if (parseInt(formData.age, 10) < 1 || parseInt(formData.age, 10) > 150) {
      newErrors.age = 'Age must be between 1 and 150';
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select a gender';
    }

    if (file && file.size > 10 * 1024 * 1024) {
      newErrors.file = 'File size must be less than 10MB';
    }

    if (file && file.type !== 'application/pdf') {
      newErrors.file = 'Please upload a PDF file only';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    const selectedFile = event.target.files[0];

    if (selectedFile.type !== 'application/pdf') {
      showError('Please upload PDF only', 'error');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      showError('File too large (max 10MB)', 'error');
      return;
    }

    setFile(selectedFile);
    setErrors((current) => ({ ...current, file: '' }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const patientRes = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          age: parseInt(formData.age, 10),
        }),
      });

      if (!patientRes.ok) {
        const err = await patientRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create patient. Please try again.');
      }

      const patient = await patientRes.json();

      if (file) {
        setUploadProgress('uploading');
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('patientId', patient._id);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Upload failed. Please try again');
        }

        setUploadProgress('analyzing');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setUploadProgress('done');
      }

      setLoading(false);
      router.push('/dashboard');
    } catch (error) {
      setLoading(false);
      setUploadProgress('idle');

      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          showError('Connection error. Please check your internet connection', 'error');
        } else if (error.message.includes('timeout')) {
          showError('Request timeout. Please try again', 'error');
        } else {
          showError(error.message, 'error');
        }
      } else {
        showError('An error occurred. Please try again', 'error');
      }
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const progressState = uploadProgress !== 'idle' ? progressCopy[uploadProgress] : null;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <Card className="overflow-hidden border-sky-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.98))]">
            <CardContent className="p-6 sm:p-8">
              <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 text-[11px] tracking-[0.2em]">
                NEW PATIENT
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Create a patient record and start AI analysis in one step.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Capture patient details, attach the PDF report, and let HealthAI prepare a
                clinician-friendly summary automatically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submission checklist</CardTitle>
              <CardDescription>Everything required for a clean intake.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Required fields</p>
                <p className="mt-1">Full name, phone, email, age, and gender.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Report file</p>
                <p className="mt-1">PDF format only, maximum size 10MB.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Processing</p>
                <p className="mt-1">AI analysis begins automatically after upload.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Patient details</CardTitle>
              <CardDescription>Use complete contact information for future report delivery.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Full Name"
                name="name"
                value={formData.name}
                error={errors.name}
                onChange={handleChange}
                placeholder="Enter patient's full name"
              />
              <Field
                label="Phone Number"
                name="phone"
                value={formData.phone}
                error={errors.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                type="tel"
              />
              <Field
                label="Email Address"
                name="email"
                value={formData.email}
                error={errors.email}
                onChange={handleChange}
                placeholder="patient@example.com"
                type="email"
              />
              <div className="grid gap-5 sm:grid-cols-2 sm:col-span-2">
                <Field
                  label="Age"
                  name="age"
                  value={formData.age}
                  error={errors.age}
                  onChange={handleChange}
                  placeholder="Age"
                  type="number"
                />
                <div className="space-y-2">
                  <label htmlFor="gender" className="text-sm font-medium text-slate-800">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={cn(
                      'flex h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-sky-400 focus-visible:ring-4 focus-visible:ring-sky-100',
                      errors.gender ? 'border-rose-300 focus-visible:ring-rose-100' : 'border-slate-200'
                    )}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender ? <p className="text-sm text-rose-600">{errors.gender}</p> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Medical report</CardTitle>
                <CardDescription>Upload a PDF report to trigger AI analysis.</CardDescription>
              </CardHeader>
              <CardContent>
                <label
                  htmlFor="report"
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition',
                    file
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-slate-300 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/60'
                  )}
                >
                  <input
                    id="report"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {!file ? (
                    <>
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                        <svg className="h-6 w-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M7 16a4 4 0 0 1-.88-7.9A5 5 0 1 1 15.9 6H16a5 5 0 0 1 1 9.9M15 13l-3-3m0 0-3 3m3-3v12"
                          />
                        </svg>
                      </div>
                      <p className="text-base font-medium text-slate-900">Drop a PDF or click to browse</p>
                      <p className="mt-2 text-sm text-slate-500">Secure upload, 10MB max, PDF only.</p>
                    </>
                  ) : (
                    <div className="w-full text-left">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M4 4a2 2 0 0 1 2-2h4.59A2 2 0 0 1 12 2.59L15.41 6A2 2 0 0 1 16 7.41V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-slate-950">{file.name}</p>
                            <p className="text-sm text-slate-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB uploaded
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </label>
                {errors.file ? <p className="mt-3 text-sm text-rose-600">{errors.file}</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ready to submit</CardTitle>
                <CardDescription>We will create the patient first, then process the report.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span>Patient email</span>
                    <span className="font-medium text-slate-900">
                      {formData.email || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span>Attachment</span>
                    <span className="max-w-[180px] truncate text-right font-medium text-slate-900">
                      {file ? file.name : 'Optional'}
                    </span>
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full rounded-xl" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Creating record &amp; analyzing report...
                    </>
                  ) : (
                    'Create patient record'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      </main>

      <Dialog open={uploadProgress !== 'idle'} onOpenChange={() => undefined}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{progressState?.title}</DialogTitle>
            <DialogDescription>{progressState?.description}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  'h-2 rounded-full bg-[linear-gradient(90deg,#0ea5e9,#2563eb)] transition-all duration-500',
                  uploadProgress === 'uploading' && 'w-1/3',
                  uploadProgress === 'analyzing' && 'w-2/3',
                  uploadProgress === 'done' && 'w-full'
                )}
              />
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
              <p className="text-sm text-slate-600">
                {uploadProgress === 'done'
                  ? 'Preparing dashboard redirect.'
                  : 'Please keep this window open while we finish processing.'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        className={error ? 'border-rose-300 focus-visible:ring-rose-100' : ''}
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
