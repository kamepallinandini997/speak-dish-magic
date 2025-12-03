import { CheckCircle, Circle, Clock, ChefHat, Truck, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderTimelineProps {
  status: string;
}

const timelineSteps = [
  { id: "pending", label: "Placed", icon: Clock },
  { id: "confirmed", label: "Confirmed", icon: CheckCircle },
  { id: "preparing", label: "Preparing", icon: ChefHat },
  { id: "delivering", label: "On the Way", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Package },
];

const statusOrder = ["pending", "confirmed", "preparing", "delivering", "delivered"];

export function OrderTimeline({ status }: OrderTimelineProps) {
  const currentIndex = statusOrder.indexOf(status);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className="py-4 px-4 bg-destructive/10 rounded-xl text-center border border-destructive/20">
        <p className="text-sm text-destructive font-semibold">Order Cancelled</p>
        <p className="text-xs text-muted-foreground mt-1">This order has been cancelled</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-start justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-5 left-6 right-6 h-1 bg-muted rounded-full" />
        
        {/* Progress Line Active */}
        <div 
          className="absolute top-5 left-6 h-1 bg-emerald-500 rounded-full transition-all duration-700 ease-out"
          style={{ 
            width: currentIndex === 0 
              ? '0%' 
              : `calc(${(currentIndex / (timelineSteps.length - 1)) * 100}% - 48px)` 
          }}
        />

        {timelineSteps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                  isCompleted && "bg-emerald-500 border-emerald-500 text-white shadow-md",
                  isCurrent && "bg-emerald-500 border-emerald-500 text-white ring-4 ring-emerald-500/30 scale-110 shadow-lg",
                  isPending && "bg-background border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-2 font-medium text-center leading-tight",
                  (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
