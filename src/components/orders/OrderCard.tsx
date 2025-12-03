import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { RotateCcw, Navigation, Package } from "lucide-react";

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

export function OrderCard({ order, onClick, onReorder }: OrderCardProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderData();
  }, [order.id, order.restaurant_id]);

  const fetchOrderData = async () => {
    setLoading(true);
    
    const [itemsResponse, restaurantResponse] = await Promise.all([
      supabase
        .from("order_items")
        .select("*, menu_items(image_url)")
        .eq("order_id", order.id),
      order.restaurant_id 
        ? supabase
            .from("restaurants")
            .select("id, name")
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

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const isActiveOrder = ["pending", "confirmed", "preparing", "delivering"].includes(order.status);
  const firstItemImage = orderItems[0]?.menu_items?.image_url;

  return (
    <Card 
      className="bg-white dark:bg-card border border-border/40 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col h-full">
        {/* Top Section: Image + Info */}
        <div className="flex gap-3 flex-1">
          {/* Item Image - Rectangular */}
          <div className="flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-muted">
            {loading ? (
              <div className="w-full h-full animate-pulse bg-muted" />
            ) : firstItemImage ? (
              <img
                src={firstItemImage}
                alt="Order item"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Order Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            {/* Restaurant Name */}
            <p className="font-semibold text-sm text-foreground truncate">
              {loading ? "Loading..." : (restaurant?.name || "Restaurant")}
            </p>

            {/* Date & Time */}
            <p className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>

            {/* Item Count & Price Row */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
              <span className="font-bold text-base text-[hsl(24,95%,53%)]">
                ₹{order.total_amount}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge - with soft tint */}
        <div className="mt-3">
          <OrderStatusBadge status={order.status} className="text-xs py-1 px-2.5" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
          {isActiveOrder && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs flex-1 rounded-lg"
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
            className="h-8 text-xs flex-1 rounded-lg"
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