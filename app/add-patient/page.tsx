'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useError } from '@/contexts/ErrorContext';

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
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    console.log('Validating form with data:', formData);
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
    } else if (parseInt(formData.age) < 1 || parseInt(formData.age) > 150) {
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
    console.log('Validation errors found:', newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log('Form is valid:', isValid);
    return isValid;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0];
      
      // Check file type
      if (selectedFile.type !== 'application/pdf') {
        showError('Please upload PDF only', 'error');
        return;
      }
      
      // Check file size
      if (selectedFile.size > 10 * 1024 * 1024) {
        showError('File too large (max 10MB)', 'error');
        return;
      }
      
      setFile(selectedFile);
      setErrors({ ...errors, file: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔵 Form submission started');
    console.log('🔵 FormData:', formData);
    console.log('🔵 Has file:', !!file, file?.name);

    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    console.log('Form validation passed, setting loading to true');
    setLoading(true);

    try {
      // First, create patient
      console.log('🔵 Step 1: Creating patient via /api/patients...');
      const patientRes = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          age: parseInt(formData.age),
        }),
      });

      console.log('🔵 Patient response status:', patientRes.status);

      if (!patientRes.ok) {
        const err = await patientRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create patient. Please try again.');
      }

      const patient = await patientRes.json();
      console.log('🔵 Patient created:', patient._id, patient.email);

      // Then, upload file if exists
      if (file) {
        console.log('🔵 Step 2: Uploading file via /api/upload...');
        console.log('🔵 Upload payload: patientId=', patient._id, 'file=', file.name);
        setUploadProgress('uploading');
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('patientId', patient._id);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        console.log('🔵 Upload response status:', uploadRes.status);

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          console.error('🔵 Upload error response:', errorData);
          throw new Error(errorData.error || 'Upload failed. Please try again');
        }

        const uploadResult = await uploadRes.json();
        console.log('🔵 Upload success response:', uploadResult);

        setUploadProgress('analyzing');
        // Simulate AI analysis time
        await new Promise(resolve => setTimeout(resolve, 2000));
        setUploadProgress('done');
      } else {
        console.log('🔵 No file attached. Skipping upload.');
      }

      setLoading(false);
      console.log('🔵 Form submission complete. Redirecting to /dashboard');
      router.push('/dashboard');
    } catch (error) {
      setLoading(false);
      setUploadProgress('idle');
      
      // Handle specific network errors
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Patient</h1>
            <p className="text-gray-600">Enter patient information and upload their medical report for AI analysis</p>
          </div>

          {/* Form Card */}
          <div className="bg-white shadow-lg rounded-lg border border-gray-100">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
              
              {/* Patient Information Section */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Patient Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter patient's full name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">{formData.name.length}/100 characters</p>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter phone number"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="patient@example.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                        Age <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="age"
                        id="age"
                        required
                        min="1"
                        max="150"
                        value={formData.age}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          errors.age ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Age"
                      />
                      {errors.age && (
                        <p className="mt-1 text-sm text-red-600">{errors.age}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="gender"
                        id="gender"
                        required
                        value={formData.gender}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          errors.gender ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.gender && (
                        <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Report Section */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Medical Report
                </h2>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-200">
                  <input
                    type="file"
                    name="report"
                    id="report"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {!file ? (
                    <label htmlFor="report" className="cursor-pointer">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-gray-900 font-medium mb-2">Drop your medical report here</p>
                      <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                      <p className="text-xs text-gray-400">Supports PDF files up to 10MB</p>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="text-red-500 hover:text-red-700 transition-colors duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                {errors.file && (
                  <p className="mt-2 text-sm text-red-600">{errors.file}</p>
                )}
              </div>

              {/* Progress Indicator */}
              {uploadProgress !== 'idle' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        {uploadProgress === 'uploading' && 'Uploading PDF...'}
                        {uploadProgress === 'analyzing' && 'AI is analyzing your report...'}
                        {uploadProgress === 'done' && 'Analysis complete!'}
                      </p>
                      <p className="text-xs text-blue-700">
                        {uploadProgress === 'uploading' && 'Please wait while we upload your file'}
                        {uploadProgress === 'analyzing' && 'This usually takes 2-3 seconds'}
                        {uploadProgress === 'done' && 'Redirecting to dashboard...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {uploadProgress === 'idle' && 'Creating Patient...'}
                      {uploadProgress === 'uploading' && 'Uploading Report...'}
                      {uploadProgress === 'analyzing' && 'Analyzing Report...'}
                      {uploadProgress === 'done' && 'Almost Done...'}
                    </>
                  ) : (
                    'Add Patient'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}