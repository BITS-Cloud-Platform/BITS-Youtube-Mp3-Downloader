'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import ParticleBackground from '@/components/ParticleBackground';
import LoadingSpinner from '@/components/LoadingSpinner';

const API_URL = "";
axios.defaults.withCredentials = true;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, { email, name, password });
      sessionStorage.setItem('access_token', res.data.access_token);
      toast.success('Registration successful!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registrasi gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <ParticleBackground />
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen py-8">
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full max-w-md p-8 space-y-6 bg-zinc-900/80 backdrop-blur rounded-xl border border-zinc-800">
            <Link href="/" className="text-center block">
              <h1 className="text-3xl font-bold">BITS YTMP3</h1>
            </Link>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300">Nama</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full mt-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-500 text-white"
                  placeholder="Nama kamu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full mt-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-500 text-white"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full mt-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-500 text-white"
                  placeholder="Min. 8 karakter"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <LoadingSpinner size="sm" />}
                {loading ? 'Loading...' : 'Daftar'}
              </button>
            </form>

            <p className="text-center text-sm text-zinc-500">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-white hover:underline">
                Masuk
              </Link>
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-zinc-700">
          Web Developed with <span className="text-red-400">&hearts;</span> by{' '}
          <a href="https://bits.co.id" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white underline underline-offset-2">
            Banten IT Solutions
          </a>
        </p>
      </div>
    </div>
  );
}
