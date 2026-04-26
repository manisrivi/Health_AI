'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { label: 'Weak', barClassName: 'w-1/3 bg-rose-500', textClassName: 'text-rose-600' };
  }
  if (score === 2) {
    return { label: 'Medium', barClassName: 'w-2/3 bg-amber-500', textClassName: 'text-amber-600' };
  }
  return { label: 'Strong', barClassName: 'w-full bg-emerald-500', textClassName: 'text-emerald-600' };
}

export default function LoginPage() {
  const { status } = useSession();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    hospitalName: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const passwordStrength = getPasswordStrength(formData.password);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn('credentials', {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });
    setLoading(false);
    if (result?.ok) {
      router.push('/dashboard');
    } else {
      alert('Invalid credentials');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setLoading(false);
    if (res.ok) {
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      if (signInResult?.ok) {
        router.push('/dashboard');
      } else {
        setIsSignUp(false);
        alert('Account created successfully. Please sign in.');
      }
    } else {
      alert('Error creating account');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 px-4">
      <div className="max-w-md w-full">
        {/* Card Wrapper */}
        <Card className="shadow-xl">
          <CardContent className="p-8">
          {/* HealthAI Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">HealthAI</span>
            </div>
          </div>

          {/* Better Heading */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isSignUp ? 'Sign up to get started with HealthAI' : 'Sign in to your HealthAI account'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={isSignUp ? handleSignUp : handleSignIn}>
          {isSignUp && (
            <>
              <Input
                name="name"
                type="text"
                required
                className="rounded-lg"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
              />
              <Input
                name="hospitalName"
                type="text"
                required
                className="rounded-lg"
                placeholder="Hospital Name"
                value={formData.hospitalName}
                onChange={handleChange}
              />
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-[0.22em] text-slate-400">
                  <span className="bg-white px-3">Account access</span>
                </div>
              </div>
            </>
          )}
          <Input
            name="email"
            type="email"
            required
            className="rounded-lg"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
          />
          <div className="space-y-2">
          <Input
            name="password"
            type="password"
            required
            className="rounded-lg"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />
          {isSignUp && formData.password ? (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.barClassName}`} />
              </div>
              <p className={`text-xs font-medium ${passwordStrength.textClassName}`}>
                Password strength: {passwordStrength.label}
              </p>
            </div>
          ) : null}
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full justify-center rounded-lg"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Button>
        </form>
        <div className="text-center mt-6">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-purple-600 hover:text-purple-700 transition-colors duration-200"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
