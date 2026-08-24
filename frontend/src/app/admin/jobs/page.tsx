"use client";

import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import AdminNavbar from "@/components/AdminNavbar";
import AdminFooter from "@/components/AdminFooter";
import LoadingSpinner from "@/components/LoadingSpinner";
import Modal from "@/components/Modal";
import { Listbox, Transition } from '@headlessui/react';

const API_URL = "";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, currentPage]);

  const fetchJobs = async () => {
    try {
      const params: any = {
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const response = await axios.get(`${API_URL}/api/admin/jobs`, {
        params,
        withCredentials: true,
      });
      setJobs(response.data.jobs);
      setTotalJobs(response.data.total);
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

  const totalPages = Math.ceil(totalJobs / itemsPerPage);

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

  const cancelJob = async (jobId: number, playlistName: string) => {
    setModalConfig({
      title: "Cancel Job",
      message: `Cancel job "${playlistName}"? The download will be stopped immediately.`,
      onConfirm: async () => {
        try {
          await axios.post(`${API_URL}/api/admin/jobs/${jobId}/cancel`, {}, {
            withCredentials: true,
          });
          toast.success("Job cancelled successfully");
          fetchJobs();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Failed to cancel job");
        } finally {
          setModalOpen(false);
        }
      },
      type: "warning",
    });
    setModalOpen(true);
  };

  const resumeJob = async (jobId: number, playlistName: string) => {
    setModalConfig({
      title: "Resume Job",
      message: `Resume job "${playlistName}"? The download will restart from where it stopped.`,
      onConfirm: async () => {
        try {
          await axios.post(`${API_URL}/api/admin/jobs/${jobId}/resume`, {}, {
            withCredentials: true,
          });
          toast.success("Job resumed successfully");
          fetchJobs();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Failed to resume job");
        } finally {
          setModalOpen(false);
        }
      },
      type: "info",
    });
    setModalOpen(true);
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

  const getAvatarColor = (email: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-indigo-500",
      "bg-teal-500",
    ];
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const statusOptions = [
    { value: 'all', label: 'All Status', emoji: '📋' },
    { value: 'completed', label: 'Completed', emoji: '✅' },
    { value: 'failed', label: 'Failed', emoji: '❌' },
    { value: 'downloading', label: 'Downloading', emoji: '⬇️' },
    { value: 'queued', label: 'Queued', emoji: '⏱️' },
    { value: 'partial', label: 'Partial', emoji: '◐' },
  ];

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
        <div className="mb-6">
          <div className="inline-flex items-center gap-2">
            <Listbox value={statusFilter} onChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <div className="relative">
                <Listbox.Button className="relative w-full min-w-[200px] cursor-pointer rounded-lg bg-gray-900/50 border border-gray-800 py-2 pl-4 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-700 transition">
                  <span className="flex items-center gap-2 text-sm">
                    <span>{statusOptions.find(opt => opt.value === statusFilter)?.emoji}</span>
                    <span>{statusOptions.find(opt => opt.value === statusFilter)?.label}</span>
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-gray-900 border border-gray-800 py-1 shadow-lg focus:outline-none">
                    {statusOptions.map((option) => (
                      <Listbox.Option
                        key={option.value}
                        value={option.value}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-2 pl-4 pr-10 ${
                            active ? 'bg-blue-600 text-white' : 'text-gray-300'
                          }`
                        }
                      >
                        {({ selected, active }) => (
                          <>
                            <span className={`flex items-center gap-2 text-sm ${selected ? 'font-medium' : 'font-normal'}`}>
                              <span>{option.emoji}</span>
                              <span>{option.label}</span>
                            </span>
                            {selected ? (
                              <span className={`absolute inset-y-0 right-0 flex items-center pr-3 ${active ? 'text-white' : 'text-blue-500'}`}>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          </div>
        </div>

        {/* Jobs List */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No jobs found
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 hover:bg-gray-800/50 transition group"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full ${getAvatarColor(job.user_email)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {getInitials(job.user_email)}
                    </div>

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-white truncate capitalize">{job.playlist_name || "Unknown Playlist"}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full font-medium transition cursor-pointer capitalize ${getStatusColor(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1 truncate">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {job.user_email}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                          {formatBytes(job.file_size)}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(job.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="hidden lg:flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/5 rounded-lg border border-blue-500/10">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-white font-medium">{job.completed_items}/{job.total_items}</span>
                        <span className="text-gray-400">Items</span>
                      </div>
                      <div className="w-24">
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ 
                              width: `${job.total_items > 0 ? (job.completed_items / job.total_items) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={job.playlist_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition cursor-pointer"
                        title="View URL"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      
                      {/* Cancel button - only for queued/downloading */}
                      {(job.status === "queued" || job.status === "downloading") && (
                        <button
                          onClick={() => cancelJob(job.id, job.playlist_name || "Unknown")}
                          className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition cursor-pointer"
                          title="Cancel Job"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      
                      {/* Resume button - only for failed/cancelled */}
                      {(job.status === "failed" || job.status === "cancelled" || job.status === "partial") && (
                        <button
                          onClick={() => resumeJob(job.id, job.playlist_name || "Unknown")}
                          className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition cursor-pointer"
                          title="Resume Job"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteJob(job.id, job.playlist_name || "Unknown")}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                        title="Delete Job"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalJobs)} of {totalJobs} jobs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium cursor-pointer"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition cursor-pointer ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium cursor-pointer"
              >
                Next
              </button>
            </div>
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
