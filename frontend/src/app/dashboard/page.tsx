'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { DownloadCloud, CheckCircle2, Clock, AlertCircle, FileAudio, LogOut, User as UserIcon, RefreshCw } from 'lucide-react';

type PlaylistItem = {
  id: number;
  title: string;
  status: string;
  file_size: number;
  error: string | null;
  completed_at: string | null;
};

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
  items?: PlaylistItem[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
axios.defaults.withCredentials = true;

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchJobs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/jobs`);
      setJobs(res.data);
    } catch {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const submitJob = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/api/jobs`, { playlist_url: url });
      setUrl('');
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Gagal memulai download');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch {
      // ignore
    }
    router.push('/login');
  };

  const handleResume = async (jobId: number) => {
    try {
      await axios.post(`${API_URL}/api/jobs/${jobId}/resume`);
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Gagal meresume job');
    }
  };

  const handleRetryItem = async (jobId: number) => {
    // Resume the whole job — it will skip completed items and retry failed ones
    await handleResume(jobId);
  };

  const handleDownload = async (job: Job) => {
    try {
      const res = await axios.get(`${API_URL}/api/download/${job.id}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = job.filename || `download.${job.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  const handleDownloadItem = async (item: PlaylistItem) => {
    try {
      const res = await axios.get(`${API_URL}/api/download/item/${item.id}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Clean title to a safe filename
      const safeTitle = item.title.replace(/[^\w\-_.]/g, '_');
      a.download = `${safeTitle}.m4a`; // we assume m4a as preferred, or we can look it up
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const mb = bytes / (1024 * 1024);
    return mb < 100 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(1)} GB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-300 py-10 px-4 md:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 neo-flat rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 neo-pressed rounded-full flex items-center justify-center text-white">
              <DownloadCloud className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">YTMp3.in</h1>
              <p className="text-sm text-zinc-500">Dashboard</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/profile')}
              className="neo-button w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
              title="Profile"
            >
              <UserIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="neo-button w-10 h-10 rounded-full flex items-center justify-center text-red-400 hover:text-red-300"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Submit Job */}
        <div className="neo-flat rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="neo-pressed p-2 rounded-xl text-blue-400">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">Download Video & Playlist</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... atau playlist?list=..."
              className="neo-input flex-1 px-5 py-3 rounded-xl text-white placeholder-zinc-600 transition-all"
            />
            <button
              onClick={submitJob}
              disabled={loading}
              className="neo-button-primary px-8 py-3 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? 'Processing...' : 'Download'}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-4 px-2">{error}</p>}
        </div>

        {/* Jobs List */}
        <div className="neo-flat rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="neo-pressed p-2 rounded-xl text-green-400">
              <FileAudio className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">Riwayat Download</h2>
          </div>
          
          {jobs.length === 0 ? (
            <div className="neo-pressed rounded-3xl p-12 text-center text-zinc-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada aktivitas download.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="neo-pressed rounded-2xl p-5 flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(job.status)}
                        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                          {job.status}
                        </span>
                        <span className="text-xs text-zinc-600 ml-auto sm:ml-0">
                          {job.total_items > 0 ? `${job.completed_items}/${job.total_items} items` : ''}
                        </span>
                      </div>
                      {job.total_items > 0 && job.status !== 'completed' && job.status !== 'failed' && (
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((job.completed_items / job.total_items) * 100)}%` }}
                          />
                        </div>
                      )}
                      <p className="text-sm font-medium text-white truncate w-full" title={job.playlist_url}>
                        {job.playlist_url}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                        {job.file_size > 0 && <span>{formatFileSize(job.file_size)}</span>}
                        {job.format && <span className="uppercase bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700/50">{job.format}</span>}
                      </div>
                      {job.error && (
                        <p className="text-red-400 text-xs mt-2 truncate bg-red-900/10 p-2 rounded-lg">{job.error}</p>
                      )}
                    </div>
                    
                    {job.status === 'completed' && job.filename && job.total_items <= 1 && (
                      <button
                        onClick={() => handleDownload(job)}
                        className="neo-button px-5 py-2.5 rounded-xl font-medium text-white text-sm whitespace-nowrap flex-shrink-0"
                      >
                        Simpan Audio
                      </button>
                    )}
                    
                    {(job.status === 'failed' || (job.status === 'completed' && job.completed_items < job.total_items)) && (
                      <button
                        onClick={() => handleResume(job.id)}
                        className="neo-button px-5 py-2.5 rounded-xl font-medium text-yellow-400 hover:text-yellow-300 text-sm whitespace-nowrap flex-shrink-0 border border-yellow-900/30"
                      >
                        {job.status === 'failed' ? 'Ulangi' : 'Lanjutkan (Resume)'}
                      </button>
                    )}
                  </div>

                  {/* Render Playlist Items for Playlists only */}
                  {job.total_items > 1 && job.items && job.items.length > 0 && (
                    <div className="mt-2 border-t border-zinc-800/80 pt-4 space-y-2">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Daftar File</p>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {job.items.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/30 hover:border-zinc-700/30 transition-all"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-zinc-300 truncate" title={item.title}>
                                {item.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                                <span className={`uppercase font-semibold ${item.status === 'completed' ? 'text-green-500' : item.status === 'failed' ? 'text-red-500' : 'text-blue-500'}`}>
                                  {item.status}
                                </span>
                                {item.file_size > 0 && <span>• {formatFileSize(item.file_size)}</span>}
                              </div>
                            </div>
                            {item.status === 'completed' && (
                              <button
                                onClick={() => handleDownloadItem(item)}
                                className="neo-button px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:text-blue-400 whitespace-nowrap flex-shrink-0"
                              >
                                Download
                              </button>
                            )}
                            {item.status === 'failed' && (
                              <button
                                onClick={() => handleRetryItem(job.id)}
                                className="neo-button px-3 py-1.5 rounded-lg text-xs font-medium text-yellow-400 hover:text-yellow-300 whitespace-nowrap flex-shrink-0"
                              >
                                <RefreshCw className="w-3 h-3 inline-block mr-1" />
                                Retry
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center pt-8">
          <p className="text-xs text-zinc-600 font-medium">
            Web Developed with <span className="text-red-500 text-sm align-middle">&hearts;</span> by{' '}
            <a href="https://bits.co.id" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">
              Banten IT Solutions
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
