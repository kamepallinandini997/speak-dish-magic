import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  price: number;
  menu_item_id: string;
  menu_items?: {
    image_url: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method: string;
  delivery_address: string;
  restaurant_id: string;
}

interface OrderCardProps {
  order: Order;
  onClick: () => void;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderItems();
  }, [order.id]);

  const fetchOrderItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("order_items")
      .select("*, menu_items(image_url)")
      .eq("order_id", order.id);
    
    if (data) {
      setOrderItems(data);
    }
    setLoading(false);
  };

  const thumbnails = orderItems.slice(0, 3);
  const remainingCount = orderItems.length - 3;

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md cursor-pointer",
        "bg-card h-fit w-full rounded-xl border border-border/50 shadow-sm"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Thumbnail Preview */}
          <div className="flex-shrink-0 w-20 h-20 relative">
            {loading ? (
              <div className="w-full h-full rounded-lg bg-muted animate-pulse" />
            ) : orderItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-0.5 w-full h-full rounded-lg overflow-hidden bg-muted">
                {thumbnails.slice(0, thumbnails.length === 1 ? 1 : thumbnails.length === 2 ? 2 : 4).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "overflow-hidden bg-muted",
                      thumbnails.length === 1 && "col-span-2 row-span-2"
                    )}
                  >
                    <img
                      src={item.menu_items?.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100"}
                      alt={item.item_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100";
                      }}
                    />
                  </div>
                ))}
                {remainingCount > 0 && (
                  <div className="absolute bottom-0.5 right-0.5 bg-foreground/80 text-background text-[10px] px-1 py-0.5 rounded-full font-medium">
                    +{remainingCount}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Order Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-base text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="font-bold text-lg text-primary">₹{order.total_amount}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
