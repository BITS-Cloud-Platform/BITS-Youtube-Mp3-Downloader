'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

type Job = {
  id: number;
  playlist_url: string;
  status: string;
  filename: string | null;
  file_size: number;
  total_items: number;
  completed_items: number;
  error: string | null;
  format: string;
};

type CookiesStatus = {
  cookies_loaded: boolean;
  size_bytes: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cookiesFile, setCookiesFile] = useState<File | null>(null);
  const [cookiesStatus, setCookiesStatus] = useState<CookiesStatus | null>(null);
  const [cookiesUploading, setCookiesUploading] = useState(false);
  const [cookiesMsg, setCookiesMsg] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) router.push('/login');
    fetchJobs();
    fetchCookiesStatus();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [token, router]);

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobs(res.data);
    } catch {
      router.push('/login');
    }
  };

  const fetchCookiesStatus = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/cookies/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCookiesStatus(res.data);
    } catch {
      setCookiesStatus(null);
    }
  };

  const submitJob = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    try {
      await axios.post(
        `${API_URL}/api/jobs`,
        { playlist_url: url },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUrl('');
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Gagal memulai download');
    } finally {
      setLoading(false);
    }
  };

  const uploadCookies = async () => {
    if (!cookiesFile) return;
    setCookiesUploading(true);
    setCookiesMsg('');
    const formData = new FormData();
    formData.append('file', cookiesFile);
    try {
      await axios.post(
        `${API_URL}/api/cookies/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setCookiesMsg('Cookies berhasil diunggah');
      setCookiesFile(null);
      fetchCookiesStatus();
    } catch (err: any) {
      setCookiesMsg(err.response?.data?.detail || 'Gagal mengunggah cookies');
    } finally {
      setCookiesUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const mb = bytes / (1024 * 1024);
    return mb < 100 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(1)} GB`;
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">BITS YouTube Downloader</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-zinc-400 hover:text-white border border-zinc-700 px-3 py-1 rounded-lg"
          >
            Keluar
          </button>
        </div>

        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800 mb-6">
          <h2 className="text-lg font-semibold mb-3">Cookies (Untuk Video Unlisted/Private)</h2>
          <p className="text-sm text-zinc-400 mb-3">
            Upload cookies.txt dari browser yang sudah login ke channel YouTube.
            Gunakan ekstensi <strong className="text-zinc-200">Get cookies.txt</strong>.
          </p>
          <div className="flex gap-3 items-end">
            <input
              type="file"
              accept=".txt"
              onChange={(e) => setCookiesFile(e.target.files?.[0] ?? null)}
              className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm file:mr-4 file:px-3 file:py-1 file:bg-zinc-700 file:text-white file:rounded file:border-0 file:text-sm"
            />
            <button
              onClick={uploadCookies}
              disabled={cookiesUploading || !cookiesFile}
              className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 disabled:opacity-50 text-sm"
            >
              {cookiesUploading ? 'Upload...' : 'Unggah Cookies'}
            </button>
          </div>
          {cookiesMsg && (
            <p className="text-sm mt-2 text-green-400">{cookiesMsg}</p>
          )}
          {cookiesStatus && (
            <p className="text-xs text-zinc-500 mt-1">
              Status: {cookiesStatus.cookies_loaded ? 'Cookies aktif' : 'Cookies tidak ditemukan'}
              {cookiesStatus.cookies_loaded && ` (${formatFileSize(cookiesStatus.size_bytes)})`}
            </p>
          )}
        </div>

        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800 mb-6">
          <h2 className="text-lg font-semibold mb-3">Submit Playlist</h2>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/playlist?list=..."
              className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-500 text-white text-sm"
            />
            <button
              onClick={submitJob}
              disabled={loading}
              className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 disabled:opacity-50 text-sm"
            >
              {loading ? 'Processing...' : 'Download'}
            </button>
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-3">{error}</p>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold mb-2">Jobs</h2>
          {jobs.length === 0 && (
            <p className="text-zinc-500 text-sm">Belum ada job. Submit playlist di atas.</p>
          )}
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{job.playlist_url}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                  <span>{job.total_items > 0 ? `${job.completed_items}/${job.total_items}` : '-'}</span>
                  <span>{formatFileSize(job.file_size)}</span>
                  <span className="capitalize">{job.status}</span>
                  {job.format && <span>.{job.format.toUpperCase()}</span>}
                </div>
                {job.error && (
                  <p className="text-red-400 text-xs mt-1">{job.error}</p>
                )}
              </div>
              {job.status === 'completed' && job.filename && (
                <a
                  href={`${API_URL}/api/download/${job.id}`}
                  className="ml-4 px-4 py-1.5 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 text-sm flex-shrink-0"
                >
                  Download
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}