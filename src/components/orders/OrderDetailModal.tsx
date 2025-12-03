import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderTimeline } from "./OrderTimeline";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  Banknote, 
  Smartphone,
  RotateCcw,
  User,
  MapPin,
  Star
} from "lucide-react";

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
  restaurants?: {
    name: string;
    delivery_fee: number;
  };
}

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (order: Order) => void;
  onReorder: (orderItems: OrderItem[]) => void;
}

const deliveryPartners = ["Ravi Kumar", "Deepak Singh", "Suresh", "Anil", "Prasad", "Krishna"];

const paymentMethodIcon = {
  cash: <Banknote className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  upi: <Smartphone className="h-4 w-4" />,
  pin: <Banknote className="h-4 w-4" />,
};

const paymentMethodLabel = {
  cash: "Cash on Delivery",
  card: "Card Payment",
  upi: "UPI Payment",
  pin: "Cash on Delivery",
};

export function OrderDetailModal({ order, open, onOpenChange, onReview, onReorder }: OrderDetailModalProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const deliveryPartner = order ? deliveryPartners[Math.floor(order.id.charCodeAt(0) % deliveryPartners.length)] : "";

  useEffect(() => {
    if (order && open) {
      fetchOrderItems();
    }
  }, [order?.id, open]);

  const fetchOrderItems = async () => {
    if (!order) return;
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

  if (!order) return null;

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = order.restaurants?.delivery_fee || 30;
  const taxes = Math.round(subtotal * 0.05);
  const discount = subtotal > 500 ? Math.round(subtotal * 0.1) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Banner Image */}
        {orderItems.length > 0 && !loading && (
          <div className="w-full h-40 overflow-hidden">
            <img
              src={orderItems[0]?.menu_items?.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
              alt="Order"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400";
              }}
            />
          </div>
        )}

        <div className="p-4 space-y-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold">
                #{order.id.slice(0, 8).toUpperCase()}
              </DialogTitle>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </DialogHeader>

          {/* Order Timeline */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Status</h4>
            <OrderTimeline status={order.status} />
          </div>

          {/* Delivery Partner */}
          {(order.status === "delivering" || order.status === "preparing") && (
            <div className="flex items-center gap-2 p-3 bg-secondary/10 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{deliveryPartner}</p>
                <p className="text-xs text-muted-foreground">
                  {order.status === "delivering" ? "On the way" : "Will pick up soon"}
                </p>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Items</h4>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <img
                      src={item.menu_items?.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60"}
                      alt={item.item_name}
                      className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.item_name}</p>
                      <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                    </div>
                    <span className="font-semibold text-sm">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Address */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Delivered to</p>
              <p className="text-sm font-medium">{order.delivery_address || "123 Main St, City"}</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            {paymentMethodIcon[order.payment_method as keyof typeof paymentMethodIcon] || paymentMethodIcon.cash}
            <div>
              <p className="text-xs text-muted-foreground">Payment</p>
              <p className="text-sm font-medium">
                {paymentMethodLabel[order.payment_method as keyof typeof paymentMethodLabel] || "Cash on Delivery"}
              </p>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="p-3 bg-muted/30 rounded-lg border">
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Bill Summary</h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal || order.total_amount - deliveryFee - taxes + discount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxes (5%)</span>
                <span>₹{taxes || Math.round((order.total_amount - deliveryFee) * 0.05)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-secondary">
                  <span>Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Total Paid</span>
                <span className="text-primary">₹{order.total_amount}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {order.status === "delivered" && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  onReview(order);
                  onOpenChange(false);
                }}
              >
                <Star className="h-4 w-4 mr-2" />
                Review
              </Button>
            )}
            <Button 
              className="flex-1"
              onClick={() => {
                onReorder(orderItems);
                onOpenChange(false);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reorder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
