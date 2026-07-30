"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import AdminNavbar from "@/components/AdminNavbar";
import AdminFooter from "@/components/AdminFooter";
import LoadingSpinner from "@/components/LoadingSpinner";
import Modal from "@/components/Modal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Job {
  id: number;
  user_email: string;
  user_id: number;
  playlist_name: string;
  playlist_url: string;
  status: string;
  file_size: number;
  total_items: number;
  completed_items: number;
  created_at: string;
  completed_at: string | null;
}

export default function AdminJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info";
  } | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  const fetchJobs = async () => {
    try {
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const response = await axios.get(`${API_URL}/api/admin/jobs`, {
        params,
        withCredentials: true,
      });
      setJobs(response.data);
      setError("");
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error("Admin access required");
        setTimeout(() => router.push("/dashboard"), 2000);
      } else if (err.response?.status === 401) {
        toast.error("Please login first");
        router.push("/login");
      } else {
        toast.error("Failed to load jobs");
        setError("Failed to load jobs");
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
      case "partial":
        return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border border-gray-500/20";
    }
  };

  const deleteJob = async (jobId: number, playlistName: string) => {
    setModalConfig({
      title: "Delete Job",
      message: `Delete job "${playlistName}"? This will remove all downloaded files. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/api/admin/jobs/${jobId}`, {
            withCredentials: true,
          });
          toast.success("Job deleted successfully");
          fetchJobs();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Failed to delete job");
        }
      },
      type: "danger",
    });
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-400 mt-4">Loading jobs...</p>
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
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-gray-400 mt-2">Monitor all download jobs across users</p>
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-400">
            Filter by status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm cursor-pointer"
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="downloading">Downloading</option>
            <option value="queued">Queued</option>
            <option value="partial">Partial</option>
          </select>
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition"
            >
              {/* Job Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 font-mono">#{job.id}</span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">
                    {job.playlist_name || "Unknown Playlist"}
                  </h3>
                  <p className="text-sm text-gray-400">{job.user_email}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{job.completed_items} / {job.total_items}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${job.total_items > 0 ? (job.completed_items / job.total_items) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Size</div>
                  <div className="text-sm font-bold">{formatBytes(job.file_size)}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Created</div>
                  <div className="text-sm font-bold">
                    {new Date(job.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-800">
                <a
                  href={job.playlist_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium text-center cursor-pointer"
                >
                  View URL
                </a>
                <button
                  onClick={() => deleteJob(job.id, job.playlist_name || "Unknown")}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm font-medium cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {jobs.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            No jobs found
          </div>
        )}
        </div>
      </div>

      <AdminFooter />
      
      {modalConfig && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={modalConfig.onConfirm}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          confirmText="Confirm"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}
