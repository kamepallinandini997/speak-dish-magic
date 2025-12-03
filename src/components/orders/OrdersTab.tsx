import { useState, useMemo } from "react";
import { OrderCard } from "./OrderCard";
import { OrderFilters, OrderFilter, OrderSort } from "./OrderFilters";
import { EmptyOrders } from "./EmptyOrders";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method: string;
  delivery_address: string;
  restaurant_id: string;
}

interface OrdersTabProps {
  orders: Order[];
  onReview: (order: Order) => void;
  onBrowseRestaurants: () => void;
  userId: string | null;
  onCartUpdated: () => void;
}

export function OrdersTab({ orders, onReview, onBrowseRestaurants, userId, onCartUpdated }: OrdersTabProps) {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [sort, setSort] = useState<OrderSort>("recent");
  const { toast } = useToast();

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders];

    // Apply filter
    if (filter !== "all") {
      result = result.filter((order) => {
        if (filter === "pending") {
          return ["pending", "confirmed", "preparing", "delivering"].includes(order.status);
        }
        return order.status === filter;
      });
    }

    // Apply sort
    result.sort((a, b) => {
      switch (sort) {
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "amount-high":
          return b.total_amount - a.total_amount;
        case "amount-low":
          return a.total_amount - b.total_amount;
        default:
          return 0;
      }
    });

    return result;
  }, [orders, filter, sort]);

  const handleReorder = async (orderItems: any[]) => {
    if (!userId) return;

    try {
      // Add all items to cart
      for (const item of orderItems) {
        await supabase.from("cart").insert({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          user_id: userId,
        });
      }

      toast({
        title: "Items added to cart!",
        description: "Your previous order items have been added to cart.",
      });

      onCartUpdated();
    } catch (error) {
      toast({
        title: "Failed to reorder",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (orders.length === 0) {
    return <EmptyOrders onBrowseClick={onBrowseRestaurants} />;
  }

  return (
    <div className="space-y-3">
      {/* Compact Header with Filters */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredAndSortedOrders.length} order{filteredAndSortedOrders.length !== 1 ? "s" : ""}
        </p>
        <OrderFilters
          filter={filter}
          sort={sort}
          onFilterChange={setFilter}
          onSortChange={setSort}
        />
      </div>

      {/* Orders Grid */}
      {filteredAndSortedOrders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No orders match your filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {filteredAndSortedOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onReview={onReview}
              onReorder={handleReorder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
