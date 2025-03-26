import React from "react";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type,
}) => {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="w-6 h-6 text-green-500" />,
    error: <XCircle className="w-6 h-6 text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
  };

  const bgColors = {
    success: "bg-green-50",
    error: "bg-red-50",
    warning: "bg-yellow-50",
    info: "bg-blue-50",
  };

  const textColors = {
    success: "text-green-800",
    error: "text-red-800",
    warning: "text-yellow-800",
    info: "text-blue-800",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={`max-w-md w-full mx-4 p-6 rounded-lg shadow-xl ${bgColors[type]}`}
      >
        <div className="flex items-start gap-4">
          {icons[type]}
          <div className="flex-1">
            <h3 className={`text-lg font-medium ${textColors[type]}`}>
              {title}
            </h3>
            <p className={`mt-2 text-sm ${textColors[type]}`}>{message}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-md ${textColors[type]} hover:bg-white/25`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
