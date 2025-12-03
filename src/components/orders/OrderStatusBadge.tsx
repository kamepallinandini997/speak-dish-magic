import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Truck, ChefHat, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  pending: {
    label: "Pending",
    icon: <Clock className="h-4 w-4" />,
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  },
  confirmed: {
    label: "Confirmed",
    icon: <CheckCircle className="h-4 w-4" />,
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
  preparing: {
    label: "Preparing",
    icon: <ChefHat className="h-4 w-4" />,
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  },
  delivering: {
    label: "Out for Delivery",
    icon: <Truck className="h-4 w-4" />,
    className: "bg-secondary/20 text-secondary border-secondary/30",
  },
  delivered: {
    label: "Delivered",
    icon: <CheckCircle className="h-4 w-4" />,
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle className="h-4 w-4" />,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-3 py-1.5 text-sm font-semibold rounded-full shadow-sm flex items-center gap-1.5 border",
        config.className,
        className
      )}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
