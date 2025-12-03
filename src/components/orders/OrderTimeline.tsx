import { CheckCircle, Circle, Clock, ChefHat, Truck, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderTimelineProps {
  status: string;
}

const timelineSteps = [
  { id: "pending", label: "Order Placed", icon: Clock },
  { id: "confirmed", label: "Accepted", icon: CheckCircle },
  { id: "preparing", label: "Preparing", icon: ChefHat },
  { id: "delivering", label: "Out for Delivery", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Package },
];

const statusOrder = ["pending", "confirmed", "preparing", "delivering", "delivered"];

export function OrderTimeline({ status }: OrderTimelineProps) {
  const currentIndex = statusOrder.indexOf(status);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className="py-4 px-3 bg-destructive/5 rounded-lg text-center">
        <p className="text-sm text-destructive font-medium">This order was cancelled</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted" />
        <div 
          className="absolute top-4 left-0 h-0.5 bg-secondary transition-all duration-500"
          style={{ width: `${(currentIndex / (timelineSteps.length - 1)) * 100}%` }}
        />

        {timelineSteps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground",
                  isCurrent && "ring-4 ring-secondary/20 scale-110"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "text-xs mt-2 font-medium text-center max-w-16",
                  isCompleted ? "text-foreground" : "text-muted-foreground"
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
