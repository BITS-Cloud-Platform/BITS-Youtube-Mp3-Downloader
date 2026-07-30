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

interface User {
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
}

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info";
  } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        withCredentials: true,
      });
      setUsers(response.data);
      setError("");
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error("Admin access required");
        setTimeout(() => router.push("/dashboard"), 2000);
      } else if (err.response?.status === 401) {
        toast.error("Please login first");
        router.push("/login");
      } else {
        toast.error("Failed to load users");
        setError("Failed to load users");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleUserActive = async (userId: number, currentStatus: boolean) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/users/${userId}`,
        { is_active: !currentStatus },
        { withCredentials: true }
      );
      toast.success(`User ${!currentStatus ? "activated" : "deactivated"}`);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update user");
    }
  };

  const toggleUserAdmin = async (userId: number, currentStatus: boolean) => {
    setModalConfig({
      title: currentStatus ? "Remove Admin Access" : "Grant Admin Access",
      message: `Are you sure you want to ${currentStatus ? "remove" : "grant"} admin access for this user?`,
      onConfirm: async () => {
        try {
          await axios.put(
            `${API_URL}/api/admin/users/${userId}`,
            { is_admin: !currentStatus },
            { withCredentials: true }
          );
          toast.success(`Admin access ${!currentStatus ? "granted" : "removed"}`);
          fetchUsers();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Failed to update user");
        }
      },
      type: currentStatus ? "warning" : "info",
    });
    setModalOpen(true);
  };

  const deleteUser = async (userId: number, userEmail: string) => {
    setModalConfig({
      title: "Delete User",
      message: `Delete user ${userEmail}? This will remove all their jobs and files. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/api/admin/users/${userId}`, {
            withCredentials: true,
          });
          toast.success("User deleted successfully");
          fetchUsers();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Failed to delete user");
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
          <p className="text-gray-400 mt-4">Loading users...</p>
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
        <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-gray-400 mt-2">Manage user accounts and permissions</p>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition"
            >
              {/* User Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{user.name}</h3>
                  <p className="text-sm text-gray-400">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Jobs</div>
                  <div className="text-lg font-bold">{user.stats.total_jobs}</div>
                  <div className="text-xs text-gray-500">{user.stats.completed_jobs} done</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Storage</div>
                  <div className="text-lg font-bold">{user.stats.disk_usage.total_gb} GB</div>
                  <div className="text-xs text-gray-500">{user.stats.disk_usage.file_count} files</div>
                </div>
              </div>

              {/* Status & Role Badges */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => toggleUserActive(user.id, user.is_active)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition cursor-pointer ${
                    user.is_active
                      ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  }`}
                >
                  {user.is_active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => toggleUserAdmin(user.id, user.is_admin)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition cursor-pointer ${
                    user.is_admin
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20"
                      : "bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20"
                  }`}
                >
                  {user.is_admin ? "Admin" : "User"}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-800">
                <button
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium cursor-pointer"
                >
                  View
                </button>
                <button
                  onClick={() => deleteUser(user.id, user.email)}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm font-medium cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            No users found
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
