"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import AdminNavbar from "@/components/AdminNavbar";
import AdminFooter from "@/components/AdminFooter";
import LoadingSpinner from "@/components/LoadingSpinner";

const API_URL = "";

interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  jobs: {
    total: number;
    completed: number;
    failed: number;
    queued: number;
    downloading: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    used_percent: number;
  };
  system: {
    cpu_percent: number;
    memory_percent: number;
    memory_used_gb: number;
    memory_total_gb: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/stats`, {
        withCredentials: true,
      });
      setStats(response.data);
      setError("");
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error("Admin access required");
        setTimeout(() => router.push("/dashboard"), 2000);
      } else if (err.response?.status === 401) {
        toast.error("Please login first");
        router.push("/login");
      } else {
        toast.error("Failed to load stats");
        setError("Failed to load stats");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-400 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <AdminNavbar />

      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Stats Grid - 5 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Users Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Users</p>
                  <p className="text-2xl font-bold">{stats?.users.total}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-400">{stats?.users.active}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                <span className="text-gray-400">{stats?.users.inactive}</span>
              </div>
            </div>
          </div>

          {/* Jobs Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Jobs</p>
                  <p className="text-2xl font-bold">{stats?.jobs.total}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-green-500">{stats?.jobs.completed}</span>
              <span className="text-gray-500">/</span>
              <span className="text-gray-400">{stats?.jobs.total} completed</span>
            </div>
          </div>

          {/* CPU Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">CPU</p>
                  <p className="text-2xl font-bold">{stats?.system.cpu_percent}%</p>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              Load average
            </div>
          </div>

          {/* Memory Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Memory</p>
                  <p className="text-2xl font-bold">{stats?.system.memory_percent}%</p>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {stats?.system.memory_used_gb} / {stats?.system.memory_total_gb} GB
            </div>
          </div>

          {/* Disk Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center group-hover:bg-orange-500/20 transition">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Disk</p>
                  <p className="text-2xl font-bold">{stats?.disk.used_percent}%</p>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {stats?.disk.used_gb} / {stats?.disk.total_gb} GB
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* System Resources - 2 columns */}
          <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-lg">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">System Resources</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* CPU */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">CPU Usage</span>
                  <span className="text-sm font-semibold">{stats?.system.cpu_percent}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.system.cpu_percent}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Load average
                </div>
              </div>

              {/* Memory */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Memory Usage</span>
                  <span className="text-sm font-semibold">{stats?.system.memory_percent}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.system.memory_percent}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {stats?.system.memory_used_gb} / {stats?.system.memory_total_gb} GB
                </div>
              </div>

              {/* Disk */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Disk Usage</span>
                  <span className="text-sm font-semibold">{stats?.disk.used_percent}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.disk.used_percent}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {stats?.disk.used_gb} / {stats?.disk.total_gb} GB
                </div>
              </div>
            </div>
          </div>

          {/* Job Activity - 1 column, 2x2 grid */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Job Status</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-4 bg-green-500/5 border border-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-500 mb-1">{stats?.jobs.completed}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Completed</div>
                </div>
                <div className="text-center p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-red-500 mb-1">{stats?.jobs.failed}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Failed</div>
                </div>
                <div className="text-center p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500 mb-1">{stats?.jobs.downloading}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Downloading</div>
                </div>
                <div className="text-center p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-500 mb-1">{stats?.jobs.queued}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Queued</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <AdminFooter />
    </div>
  );
}
