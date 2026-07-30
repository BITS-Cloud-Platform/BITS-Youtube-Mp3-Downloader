"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import AdminNavbar from "@/components/AdminNavbar";
import AdminFooter from "@/components/AdminFooter";
import LoadingSpinner from "@/components/LoadingSpinner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Job {
  id: number;
  playlist_name: string;
  status: string;
  file_size: number;
  created_at: string;
  completed_at: string | null;
}

interface UserDetail {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  stats: {
    total_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    disk_usage: {
      total_gb: number;
      file_count: number;
    };
  };
  jobs: Job[];
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUserDetail();
  }, [userId]);

  const fetchUserDetail = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/users/${userId}`, {
        withCredentials: true,
      });
      setUser(response.data);
      setError("");
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error("Admin access required");
        router.push("/admin");
      } else if (err.response?.status === 401) {
        toast.error("Please login first");
        router.push("/login");
      } else {
        toast.error("Failed to load user details");
        setError("Failed to load user details");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-400 border border-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "downloading":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "queued":
        return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border border-gray-500/20";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-400 mt-4">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400">{error || "User not found"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <AdminNavbar />

      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Back Button */}
          <button
            onClick={() => router.push("/admin/users")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Users
          </button>

          {/* User Info Header */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
                <p className="text-gray-400">{user.email}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Joined: {new Date(user.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 text-xs rounded-full font-medium ${
                    user.is_active
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {user.is_active ? "Active" : "Inactive"}
                </span>
                <span
                  className={`px-3 py-1 text-xs rounded-full font-medium ${
                    user.is_admin
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                  }`}
                >
                  {user.is_admin ? "Admin" : "User"}
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Total Jobs</div>
                <div className="text-2xl font-bold">{user.stats.total_jobs}</div>
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Completed</div>
                <div className="text-2xl font-bold text-green-400">{user.stats.completed_jobs}</div>
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Failed</div>
                <div className="text-2xl font-bold text-red-400">{user.stats.failed_jobs}</div>
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Storage Used</div>
                <div className="text-2xl font-bold text-orange-400">{user.stats.disk_usage.total_gb} GB</div>
                <div className="text-xs text-gray-500 mt-1">{user.stats.disk_usage.file_count} files</div>
              </div>
            </div>
          </div>

          {/* Jobs List */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-xl font-semibold">Recent Jobs</h2>
            </div>

            {user.jobs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No jobs found
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {user.jobs.map((job) => (
                  <div key={job.id} className="p-4 hover:bg-gray-800/50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white mb-1">
                          {job.playlist_name || "Unknown Playlist"}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>ID: #{job.id}</span>
                          <span>•</span>
                          <span>{formatBytes(job.file_size)}</span>
                          <span>•</span>
                          <span>{new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AdminFooter />
    </div>
  );
}
