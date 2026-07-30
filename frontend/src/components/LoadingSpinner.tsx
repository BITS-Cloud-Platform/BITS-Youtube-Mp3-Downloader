export default function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4"
  };

  return (
    <div className={`inline-block ${sizeClasses[size]} border-gray-600 border-t-white rounded-full animate-spin ${className}`}></div>
  );
}
