import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "red" | "yellow" | "blue" | "gray";
  className?: string;
}

const variants = {
  green: "bg-emerald-900/40 text-emerald-400 border-emerald-700/50",
  red: "bg-red-900/40 text-red-400 border-red-700/50",
  yellow: "bg-yellow-900/40 text-yellow-400 border-yellow-700/50",
  blue: "bg-blue-900/40 text-blue-400 border-blue-700/50",
  gray: "bg-gray-800 text-gray-400 border-gray-700"
};

export function Badge({ children, variant = "gray", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", variants[variant], className)}>
      {children}
    </span>
  );
}
