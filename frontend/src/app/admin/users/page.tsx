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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

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

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditModalOpen(true);
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    
    try {
      await axios.put(
        `${API_URL}/api/admin/users/${editingUser.id}`,
        { name: editName, email: editEmail },
        { withCredentials: true }
      );
      toast.success("User updated successfully");
      setEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update user");
    }
  };

  const getAvatarColor = (name: string) => {
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
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
        <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-gray-400 mt-2">Manage user accounts and permissions</p>
        </div>

        {/* Users List */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
          {users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No users found
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-gray-800/50 transition group"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {getInitials(user.name)}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-white truncate">{user.name}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleUserActive(user.id, user.is_active)}
                            className={`px-2 py-0.5 text-xs rounded-full font-medium transition cursor-pointer flex items-center gap-1 ${
                              user.is_active
                                ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                            }`}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              {user.is_active ? (
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              ) : (
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              )}
                            </svg>
                            {user.is_active ? "Active" : "Inactive"}
                          </button>
                          <button
                            onClick={() => toggleUserAdmin(user.id, user.is_admin)}
                            className={`px-2 py-0.5 text-xs rounded-full font-medium transition cursor-pointer flex items-center gap-1 ${
                              user.is_admin
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20"
                                : "bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20"
                            }`}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {user.is_admin ? "Admin" : "User"}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1 truncate">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {user.email}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden lg:flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/5 rounded-lg border border-blue-500/10">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-white font-medium">{user.stats.total_jobs}</span>
                        <span className="text-gray-400">Jobs</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/5 rounded-lg border border-green-500/10">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-white font-medium">{user.stats.completed_jobs}</span>
                        <span className="text-gray-400">Done</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/5 rounded-lg border border-orange-500/10">
                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                        <span className="text-white font-medium">{user.stats.disk_usage.total_gb} GB</span>
                        <span className="text-gray-400">Storage</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition cursor-pointer"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition cursor-pointer"
                        title="Edit User"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.email)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                        title="Delete User"
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

      {/* Edit User Modal */}
      {editModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full p-6 scale-in">
            <h3 className="text-xl font-bold text-white mb-4">Edit User</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
