'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { User, Key, Mail, Shield, CheckCircle2, AlertCircle, ArrowLeft, Upload, LogOut } from 'lucide-react';

type CookiesStatus = {
  cookies_loaded: boolean;
  size_bytes: number;
};

const API_URL = "";
axios.defaults.withCredentials = true;

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ id: number; email: string; name: string; created_at: string } | null>(null);
  const [name, setName] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Cookies state
  const [cookiesFile, setCookiesFile] = useState<File | null>(null);
  const [cookiesStatus, setCookiesStatus] = useState<CookiesStatus | null>(null);
  const [cookiesUploading, setCookiesUploading] = useState(false);

  const fetchCookiesStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/cookies/status`);
      setCookiesStatus(res.data);
    } catch {
      setCookiesStatus(null);
    }
  };

  useEffect(() => {
    axios
      .get(`${API_URL}/api/auth/profile`)
      .then((res) => {
        setProfile(res.data);
        setName(res.data.name);
      })
      .catch(() => router.push('/login'));

    fetchCookiesStatus();
  }, [router]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/auth/update-profile`, { name });
      toast.success('Nama berhasil diubah');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal mengubah nama');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    try {
      await axios.post(`${API_URL}/api/auth/change-password`, { old_password: oldPassword, new_password: newPassword });
      toast.success('Password berhasil diubah');
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal mengubah password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const uploadCookies = async () => {
    if (!cookiesFile) return;
    setCookiesUploading(true);
    const formData = new FormData();
    formData.append('file', cookiesFile);
    try {
      await axios.post(`${API_URL}/api/cookies/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Cookies berhasil diunggah');
      setCookiesFile(null);
      fetchCookiesStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal mengunggah cookies');
    } finally {
      setCookiesUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
      sessionStorage.removeItem('access_token');
      toast.success('Logged out successfully');
    } catch {
      // ignore
    }
    router.push('/login');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-300 py-10 px-4 md:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header - Consistent with Dashboard */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 neo-flat rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 neo-pressed rounded-full flex items-center justify-center text-white">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">BITS YTMP3</h1>
              <p className="text-sm text-zinc-500">Profile</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="neo-button w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
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

        {/* Stacked 1-Column Cards (Consistent with Dashboard) */}
        <div className="space-y-8">
          {/* Account Info Card */}
          <div className="neo-flat rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="neo-pressed p-2 rounded-xl text-blue-400">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Informasi Akun</h2>
            </div>
            
            <form onSubmit={handleUpdateName} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-zinc-500 bg-zinc-950/20 p-3 rounded-xl border border-zinc-800/40">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{profile.email}</span>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Nama Lengkap</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="neo-input w-full px-5 py-3 rounded-xl text-white transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="neo-button-primary w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 text-sm"
              >
                {saving ? 'Menyimpan...' : 'Simpan Nama'}
              </button>
            </form>
          </div>

          {/* Cookies Setup Card */}
          <div className="neo-flat rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="neo-pressed p-2 rounded-xl text-yellow-500">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Akses Private</h2>
            </div>
            
            <div className="space-y-6">
              {/* Status Information */}
              <div className="neo-pressed rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Status Cookies:</span>
                  {cookiesStatus?.cookies_loaded ? (
                    <span className="text-green-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Aktif
                    </span>
                  ) : (
                    <span className="text-red-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Belum ada
                    </span>
                  )}
                </div>
                
                {cookiesStatus?.cookies_loaded && (
                  <div className="text-xs text-zinc-500 flex justify-between">
                    <span>Ukuran file:</span>
                    <span className="font-mono text-zinc-300">{formatFileSize(cookiesStatus.size_bytes)}</span>
                  </div>
                )}

                <p className="text-xs text-zinc-500 leading-relaxed pt-2 border-t border-zinc-800/60">
                  {cookiesStatus?.cookies_loaded 
                    ? "Cookies aktif memungkinkan download playlist private. Unggah file baru untuk mengganti."
                    : "Upload cookies.txt dari browser agar backend bisa mengakses playlist private."
                  }
                </p>
              </div>

              {/* Upload Field */}
              <div className="space-y-4">
                <div className="neo-pressed rounded-xl p-1 relative overflow-hidden group">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={(e) => setCookiesFile(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="text-center py-4 px-2 text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    {cookiesFile ? cookiesFile.name : (cookiesStatus?.cookies_loaded ? 'Ganti file cookies.txt' : 'Pilih file cookies.txt')}
                  </div>
                </div>

                <button
                  onClick={uploadCookies}
                  disabled={cookiesUploading || !cookiesFile}
                  className="neo-button-primary w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 text-sm"
                >
                  {cookiesUploading ? 'Mengunggah...' : (cookiesStatus?.cookies_loaded ? 'Ganti Cookies' : 'Upload Cookies')}
                </button>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="neo-flat rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="neo-pressed p-2 rounded-xl text-yellow-500">
                <Key className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Ganti Password</h2>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Password Lama</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="neo-input w-full px-5 py-3 rounded-xl text-white transition-all text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="neo-input w-full px-5 py-3 rounded-xl text-white transition-all text-sm"
                    placeholder="Min. 8 karakter"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordSaving}
                className="neo-button-primary w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 text-sm"
              >
                {passwordSaving ? 'Menyimpan...' : 'Ganti Password'}
              </button>
            </form>
          </div>
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
