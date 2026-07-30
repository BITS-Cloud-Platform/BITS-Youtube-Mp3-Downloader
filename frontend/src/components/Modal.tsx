"use client";

import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const typeColors = {
    danger: "from-red-500 to-red-600",
    warning: "from-orange-500 to-orange-600",
    info: "from-blue-500 to-blue-600",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full shadow-2xl animate-scale-in">
        {/* Header */}
        <div className={`bg-gradient-to-r ${typeColors[type]} p-6 rounded-t-lg`}>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-300">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition text-sm font-medium cursor-pointer"
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 bg-gradient-to-r ${typeColors[type]} text-white rounded-md hover:opacity-90 transition text-sm font-medium cursor-pointer`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
