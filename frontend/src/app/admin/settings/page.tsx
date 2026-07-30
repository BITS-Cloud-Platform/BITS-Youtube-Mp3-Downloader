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

interface Setting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string | null;
}

interface CleanupResult {
  deleted_jobs: number;
  freed_gb: number;
  errors: string[];
  dry_run: boolean;
}

export default function AdminSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cleanupDays, setCleanupDays] = useState(30);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info";
  } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/settings`, {
        withCredentials: true,
      });
      setSettings(response.data);
      setError("");
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error("Admin access required");
        setTimeout(() => router.push("/dashboard"), 2000);
      } else if (err.response?.status === 401) {
        toast.error("Please login first");
        router.push("/login");
      } else {
        toast.error("Failed to load settings");
        setError("Failed to load settings");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/settings`,
        { key, value },
        { withCredentials: true }
      );
      fetchSettings();
      toast.success("Setting updated");
    } catch (err) {
      toast.error("Failed to update setting");
    }
  };

  const getSettingLabel = (key: string) => {
    const labels: { [key: string]: string } = {
      cleanup_retention_days: "Cleanup Retention Days",
      max_file_size_mb: "Max File Size (MB)",
      auto_cleanup_enabled: "Auto Cleanup Enabled",
    };
    return labels[key] || key;
  };

  const getSettingDescription = (key: string) => {
    const descriptions: { [key: string]: string } = {
      cleanup_retention_days: "Number of days to retain completed jobs before automatic cleanup",
      max_file_size_mb: "Maximum allowed file size for downloads in megabytes",
      auto_cleanup_enabled: "Automatically cleanup old completed jobs based on retention days",
    };
    return descriptions[key] || null;
  };

  const isToggleSetting = (key: string) => {
    return key === "auto_cleanup_enabled" || key.includes("enabled") || key.includes("active");
  };

  const toggleSetting = (key: string, currentValue: string) => {
    const newValue = currentValue === "true" ? "false" : "true";
    updateSetting(key, newValue);
  };

  const runCleanup = async (dryRun: boolean) => {
    setCleanupLoading(true);
    setCleanupResult(null);
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/cleanup`,
        { days: cleanupDays, dry_run: dryRun },
        { withCredentials: true }
      );
      setCleanupResult(response.data);
      toast.success(dryRun ? "Preview generated" : "Cleanup completed");
    } catch (err) {
      toast.error("Failed to run cleanup");
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleRunCleanup = () => {
    setModalConfig({
      title: "Run Cleanup",
      message: `Delete all jobs older than ${cleanupDays} days? This will permanently remove all associated files and cannot be undone.`,
      onConfirm: () => runCleanup(false),
      type: "danger",
    });
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-400 mt-4">Loading settings...</p>
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
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-400 mt-2">Configure system settings and maintenance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* System Settings Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg hover:border-gray-700 transition">
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">System Settings</h3>
              </div>
            </div>
            <div className="p-4">
              {settings.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No settings configured
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {settings.map((setting) => (
                    <div key={setting.key} className="bg-black/40 border border-gray-800 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            {getSettingLabel(setting.key)}
                          </label>
                          {getSettingDescription(setting.key) && (
                            <p className="text-xs text-gray-500 mb-3">
                              {getSettingDescription(setting.key)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {isToggleSetting(setting.key) ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleSetting(setting.key, setting.value)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer ${
                              setting.value === "true" ? "bg-blue-600" : "bg-gray-700"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                setting.value === "true" ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                          <span className="text-sm text-gray-400">
                            {setting.value === "true" ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      ) : (
                        <input
                          type={setting.key.includes("days") || setting.key.includes("size") || setting.key.includes("max") ? "number" : "text"}
                          defaultValue={setting.value || ""}
                          onBlur={(e) => {
                            if (e.target.value !== setting.value) {
                              updateSetting(setting.key, e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                        />
                      )}
                      
                      {setting.updated_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Updated: {new Date(setting.updated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* File Cleanup Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg hover:border-gray-700 transition">
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">File Cleanup</h3>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-400">
                Remove old completed jobs and free up disk space. This will delete jobs that have been completed for more than the specified number of days.
              </p>
              
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Delete jobs older than (days)
                </label>
                <input
                  type="number"
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(Number(e.target.value))}
                  min="1"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => runCleanup(true)}
                  disabled={cleanupLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
                >
                  {cleanupLoading && <LoadingSpinner size="sm" />}
                  {cleanupLoading ? "Running..." : "Preview Cleanup"}
                </button>
                <button
                  onClick={handleRunCleanup}
                  disabled={cleanupLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
                >
                  {cleanupLoading && <LoadingSpinner size="sm" />}
                  {cleanupLoading ? "Running..." : "Run Cleanup"}
                </button>
              </div>

              {cleanupResult && (
                <div
                  className={`p-4 rounded-lg border ${
                    cleanupResult.dry_run 
                      ? "bg-blue-500/10 border-blue-500/20" 
                      : "bg-green-500/10 border-green-500/20"
                  }`}
                >
                  <h3 className="font-semibold text-white mb-3 text-sm">
                    {cleanupResult.dry_run ? "Preview Results" : "Cleanup Complete"}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Jobs to delete:</span>
                      <span className="font-medium text-white">{cleanupResult.deleted_jobs}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Space to free:</span>
                      <span className="font-medium text-white">{cleanupResult.freed_gb} GB</span>
                    </div>
                    {cleanupResult.errors.length > 0 && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="font-medium text-red-400 mb-2 text-xs uppercase tracking-wide">Errors:</p>
                        <ul className="list-disc list-inside text-red-400 text-xs space-y-1">
                          {cleanupResult.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
