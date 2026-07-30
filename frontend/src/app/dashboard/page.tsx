'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { DownloadCloud, CheckCircle2, Clock, AlertCircle, FileAudio, LogOut, User as UserIcon, RefreshCw, Trash2, XCircle } from 'lucide-react';

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
  playlist_name: string | null;
  status: string;
  filename: string | null;
  file_size: number;
  total_items: number;
  completed_items: number;
  error: string | null;
  format: string;
  progress: string | null;
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
    await handleResume(jobId);
  };

  const handleCancel = async (jobId: number) => {
    try {
      await axios.post(`${API_URL}/api/jobs/${jobId}/cancel`);
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Gagal membatalkan');
    }
  };

  const token = () => sessionStorage.getItem('access_token');

  const handleDownload = (job: Job) => {
    const a = document.createElement('a');
    a.href = `${API_URL}/api/download/${job.id}?token=${token()}`;
    a.download = job.filename || `download.m4a`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadMp3 = (job: Job) => {
    const a = document.createElement('a');
    a.href = `${API_URL}/api/download/${job.id}/mp3?token=${token()}`;
    a.download = (job.filename || 'audio').replace(/\.[^.]+$/, '.mp3');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadFormat = (job: Job, format: string) => {
    const a = document.createElement('a');
    a.href = `${API_URL}/api/download/${job.id}/${format}?token=${token()}`;
    a.download = (job.filename || 'audio').replace(/\.[^.]+$/, `.${format}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async (jobId: number) => {
    try {
      await axios.delete(`${API_URL}/api/jobs/${jobId}`);
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Gagal menghapus job');
    }
  };

  const handleDownloadItemFormat = (item: PlaylistItem, format: string) => {
    const safeTitle = item.title.replace(/[^\w\-_.]/g, '_');
    const a = document.createElement('a');
    a.href = `${API_URL}/api/download/item/${item.id}/${format}?token=${token()}`;
    a.download = `${safeTitle}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadItemM4a = (item: PlaylistItem) => {
    handleDownloadItemFormat(item, 'm4a');
  };

  const handleDownloadItemMp3 = (item: PlaylistItem) => {
    handleDownloadItemFormat(item, 'mp3');
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
      case 'partial': return <CheckCircle2 className="w-4 h-4 text-yellow-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-orange-500" />;
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
              className="neo-button w-10 h-10 rounded-full flex items-center justify-center cursor-pointer text-zinc-400 hover:text-white"
              title="Profile"
            >
              <UserIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="neo-button w-10 h-10 rounded-full flex items-center justify-center cursor-pointer text-red-400 hover:text-red-300"
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
              className="neo-button-primary px-8 py-3 rounded-xl font-semibold text-white disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
            >
              <DownloadCloud className="w-5 h-5" />
              {loading ? 'Processing...' : 'Convert'}
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
                  className="neo-pressed rounded-2xl p-4 space-y-1"
                >
                  {/* Completed single video: render as list item */}
                  {job.status === 'completed' && job.filename && job.total_items <= 1 ? (
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/20 transition-colors">
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-green-500" />
                        <p className="text-xs text-zinc-400 truncate" title={job.filename.replace(/\.[^.]+$/, '')}>
                          {job.filename.replace(/\.[^.]+$/, '')}
                        </p>
                        {job.file_size > 0 && (
                          <span className="text-[10px] text-zinc-600 flex-shrink-0">{formatFileSize(job.file_size)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <div className="neo-flat rounded-md flex items-center divide-x divide-zinc-700/30">
                          <button
                            onClick={() => handleDownload(job)}
                            className="h-6 px-1.5 flex items-center gap-0.5 cursor-pointer text-blue-400 transition-colors"
                            title="Download M4A"
                          >
                            <FileAudio className="w-3 h-3" />
                            <span className="text-[9px] font-semibold">m4a</span>
                          </button>
                          <button
                            onClick={() => handleDownloadMp3(job)}
                            className="h-6 px-1.5 flex items-center gap-0.5 cursor-pointer text-green-400 transition-colors"
                            title="Download MP3"
                          >
                            <FileAudio className="w-3 h-3" />
                            <span className="text-[9px] font-semibold">mp3</span>
                          </button>
                          <button
                            onClick={() => handleDownloadFormat(job, 'opus')}
                            className="h-6 px-1.5 flex items-center gap-0.5 cursor-pointer text-purple-400 transition-colors"
                            title="Download OPUS"
                          >
                            <FileAudio className="w-3 h-3" />
                            <span className="text-[9px] font-semibold">opus</span>
                          </button>
                          <button
                            onClick={() => handleDownloadFormat(job, 'ogg')}
                            className="h-6 px-1.5 flex items-center gap-0.5 cursor-pointer text-orange-400 transition-colors"
                            title="Download OGG"
                          >
                            <FileAudio className="w-3 h-3" />
                            <span className="text-[9px] font-semibold">ogg</span>
                          </button>
                          <button
                            onClick={() => handleDownloadFormat(job, 'flac')}
                            className="h-6 px-1.5 flex items-center gap-0.5 cursor-pointer text-cyan-400 transition-colors"
                            title="Download FLAC"
                          >
                            <FileAudio className="w-3 h-3" />
                            <span className="text-[9px] font-semibold">flac</span>
                          </button>
                          <button
                            onClick={() => handleDelete(job.id)}
                            className="h-6 px-1.5 flex items-center gap-0.5 cursor-pointer text-red-400 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Non-completed or playlist: original style */
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0" title={job.error || job.progress || ''}>
                            {getStatusIcon(job.status)}
                          </span>
                          <p className="text-sm font-medium text-white truncate" title={job.playlist_name || job.playlist_url}>
                            {job.playlist_name || (job.total_items > 1 ? 'YouTube Playlist' : 'Memproses...')}
                          </p>
                          {job.total_items > 0 && <span className="text-[10px] text-zinc-600 flex-shrink-0">{job.completed_items}/{job.total_items}</span>}
                        </div>
                        {job.total_items > 0 && job.status !== 'completed' && job.status !== 'partial' && job.status !== 'failed' && job.status !== 'cancelled' && job.total_items > 1 && (
                          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.round((job.completed_items / job.total_items) * 100)}%` }}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                          {(job.status === 'queued' || job.status === 'downloading') && (
                            <span className="text-blue-500">{job.status === 'queued' ? 'Mengantri' : 'Mengunduh'}</span>
                          )}
                          {job.file_size > 0 && <span className="text-[10px] text-zinc-600 flex-shrink-0">{formatFileSize(job.file_size)}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {(job.status === 'queued' || job.status === 'downloading') && (
                          <div className="neo-flat rounded-lg flex items-center">
                            <button
                              onClick={() => handleCancel(job.id)}
                              className="h-7 px-2 flex items-center justify-center cursor-pointer text-orange-400 hover:text-orange-300 transition-colors"
                              title="Batalkan"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {job.status !== 'completed' && job.items?.some(i => i.status === 'failed' || i.status === 'queued' || i.status === 'downloading') && job.status !== 'queued' && (
                          <div className="neo-flat rounded-lg flex items-center">
                            <button
                              onClick={() => handleResume(job.id)}
                              className="h-7 px-2 flex items-center justify-center cursor-pointer text-yellow-400 hover:text-yellow-300 transition-colors"
                              title={job.status === 'failed' ? 'Ulangi' : 'Lanjutkan'}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="neo-flat rounded-lg flex items-center">
                          <button
                            onClick={() => handleDelete(job.id)}
                            className="h-7 px-2 flex items-center justify-center cursor-pointer text-red-400 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render Playlist Items for Playlists only */}
                  {job.total_items > 1 && job.items && job.items.length > 0 && (
                    <div className="pt-3 border-t border-zinc-800/50 space-y-1">
                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                        {job.items.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/20 transition-colors"
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.status === 'completed' ? 'bg-green-500' : item.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`} />
                              <p className="text-xs text-zinc-400 truncate" title={item.title}>
                                {item.title}
                              </p>
                              {item.file_size > 0 && (
                                <span className="text-[10px] text-zinc-600 flex-shrink-0">{formatFileSize(item.file_size)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {item.status === 'completed' && (
                                <div className="neo-flat rounded-md flex items-center divide-x divide-zinc-700/30">
                                  <button
                                    onClick={() => handleDownloadItemFormat(item, 'm4a')}
                                    className="h-6 px-1.5 flex items-center gap-0.5 cursor-pointer text-blue-400 transition-colors"
                                    title="Download M4A"
                                  >
                                    <FileAudio className="w-3 h-3" />
                                    <span className="text-[9px] font-semibold">m4a</span>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadItemFormat(item, 'mp3')}
                                    className="h-6 px-1.5 flex items-center gap-0.5 cursor-pointer text-green-400 transition-colors"
                                    title="Download MP3"
                                  >
                                    <FileAudio className="w-3 h-3" />
                                    <span className="text-[9px] font-semibold">mp3</span>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadItemFormat(item, 'opus')}
                                    className="h-6 px-1.5 flex items-center gap-0.5 cursor-pointer text-purple-400 transition-colors"
                                    title="Download OPUS"
                                  >
                                    <FileAudio className="w-3 h-3" />
                                    <span className="text-[9px] font-semibold">opus</span>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadItemFormat(item, 'ogg')}
                                    className="h-6 px-1.5 flex items-center gap-0.5 cursor-pointer text-orange-400 transition-colors"
                                    title="Download OGG"
                                  >
                                    <FileAudio className="w-3 h-3" />
                                    <span className="text-[9px] font-semibold">ogg</span>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadItemFormat(item, 'flac')}
                                    className="h-6 px-1.5 flex items-center gap-0.5 cursor-pointer text-cyan-400 transition-colors"
                                    title="Download FLAC"
                                  >
                                    <FileAudio className="w-3 h-3" />
                                    <span className="text-[9px] font-semibold">flac</span>
                                  </button>
                                </div>
                              )}
                              {(item.status === 'failed' || ((item.status === 'queued' || item.status === 'downloading') && job.status === 'cancelled')) && (
                                <div className="neo-flat rounded-md flex items-center">
                                  <button
                                    onClick={() => handleRetryItem(job.id)}
                                    className="h-6 px-1.5 flex items-center justify-center cursor-pointer text-yellow-400 transition-colors"
                                    title="Retry"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
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
