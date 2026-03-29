import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle: string;
  className?: string;
}

const StatCard = ({ icon: Icon, label, value, subtitle, className }: StatCardProps) => {
  return (
    <div className={cn("stat-card", className)}>
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-primary" />
        <span className="section-label text-[10px]">{label}</span>
      </div>
      <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
};

export default StatCard;
