import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Package, MapPin, RotateCcw, Navigation } from "lucide-react";
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

interface Restaurant {
  id: string;
  name: string;
  image_url: string | null;
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
  onReorder: (orderItems: OrderItem[]) => void;
}

// Status background colors
const statusBgColors: Record<string, string> = {
  pending: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50",
  confirmed: "bg-blue-50 dark:bg-blue-950/20 border-blue-200/50",
  preparing: "bg-blue-50 dark:bg-blue-950/20 border-blue-200/50",
  delivering: "bg-blue-50 dark:bg-blue-950/20 border-blue-200/50",
  delivered: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50",
  cancelled: "bg-red-50 dark:bg-red-950/20 border-red-200/50",
};

export function OrderCard({ order, onClick, onReorder }: OrderCardProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderData();
  }, [order.id, order.restaurant_id]);

  const fetchOrderData = async () => {
    setLoading(true);
    
    // Fetch order items and restaurant in parallel
    const [itemsResponse, restaurantResponse] = await Promise.all([
      supabase
        .from("order_items")
        .select("*, menu_items(image_url)")
        .eq("order_id", order.id),
      order.restaurant_id 
        ? supabase
            .from("restaurants")
            .select("id, name, image_url")
            .eq("id", order.restaurant_id)
            .single()
        : Promise.resolve({ data: null })
    ]);
    
    if (itemsResponse.data) {
      setOrderItems(itemsResponse.data);
    }
    if (restaurantResponse.data) {
      setRestaurant(restaurantResponse.data);
    }
    setLoading(false);
  };

  const thumbnails = orderItems.slice(0, 3);
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const isActiveOrder = ["pending", "confirmed", "preparing", "delivering"].includes(order.status);

  // Get short address
  const shortAddress = order.delivery_address 
    ? order.delivery_address.split(",")[0].trim()
    : "No address";

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-lg cursor-pointer",
        "h-fit w-full rounded-xl border shadow-sm",
        statusBgColors[order.status] || "bg-card border-border/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Restaurant Info */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {restaurant?.image_url ? (
              <img
                src={restaurant.image_url}
                alt={restaurant.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">
              {loading ? "Loading..." : (restaurant?.name || "Restaurant")}
            </p>
            <p className="text-xs text-muted-foreground">
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

        <div className="flex items-center gap-3">
          {/* Thumbnail Preview */}
          <div className="flex-shrink-0 w-16 h-16 relative">
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
              </div>
            ) : (
              <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Order Info */}
          <div className="flex-1 min-w-0">
            {/* Item Count */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Price */}
            <p className="font-bold text-xl text-[hsl(24,95%,53%)]">₹{order.total_amount}</p>

            {/* Address Preview */}
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground truncate">{shortAddress}</p>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          {isActiveOrder && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <Navigation className="h-3.5 w-3.5 mr-1.5" />
              Track
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onReorder(orderItems);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reorder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
