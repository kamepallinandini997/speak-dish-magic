import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
  Star,
  Clock,
  Store,
  Bike
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

interface Restaurant {
  id: string;
  name: string;
  image_url: string | null;
  delivery_fee: number;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method: string;
  delivery_address: string;
  restaurant_id: string;
  estimated_delivery_time?: string;
}

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (order: Order) => void;
  onReorder: (orderItems: OrderItem[]) => void;
}

const deliveryPartners = [
  { name: "Ravi Kumar", id: "DL1243" },
  { name: "Deepak Singh", id: "DL5621" },
  { name: "Suresh Reddy", id: "DL8934" },
  { name: "Anil Kumar", id: "DL2156" },
  { name: "Prasad M", id: "DL7823" },
  { name: "Krishna Rao", id: "DL4567" }
];

const statusOrder = ["pending", "confirmed", "preparing", "delivering", "delivered"];

export function OrderDetailModal({ order, open, onOpenChange, onReview, onReorder }: OrderDetailModalProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const deliveryPartner = order 
    ? deliveryPartners[Math.floor(order.id.charCodeAt(0) % deliveryPartners.length)]
    : deliveryPartners[0];

  useEffect(() => {
    if (order && open) {
      fetchOrderData();
    }
  }, [order?.id, open]);

  const fetchOrderData = async () => {
    if (!order) return;
    setLoading(true);
    
    const [itemsResponse, restaurantResponse] = await Promise.all([
      supabase
        .from("order_items")
        .select("*, menu_items(image_url)")
        .eq("order_id", order.id),
      order.restaurant_id 
        ? supabase
            .from("restaurants")
            .select("id, name, image_url, delivery_fee")
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

  if (!order) return null;

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = restaurant?.delivery_fee || 30;
  const taxes = Math.round(subtotal * 0.05);
  const discount = subtotal > 500 ? Math.round(subtotal * 0.1) : 0;
  
  // Calculate progress percentage
  const currentIndex = statusOrder.indexOf(order.status);
  const progressPercent = order.status === "cancelled" ? 0 : ((currentIndex + 1) / statusOrder.length) * 100;

  // Calculate estimated delivery time
  const orderTime = new Date(order.created_at);
  const estimatedMinutes = 35 + Math.floor(Math.random() * 15);
  const isActiveOrder = ["pending", "confirmed", "preparing", "delivering"].includes(order.status);

  // Payment method icons and labels
  const paymentConfig = {
    cash: { icon: <Banknote className="h-5 w-5 text-emerald-600" />, label: "Cash on Delivery", emoji: "💵" },
    card: { icon: <CreditCard className="h-5 w-5 text-blue-600" />, label: "Card Payment", emoji: "💳" },
    upi: { icon: <Smartphone className="h-5 w-5 text-purple-600" />, label: "UPI Payment", emoji: "📱" },
    pin: { icon: <Banknote className="h-5 w-5 text-emerald-600" />, label: "Cash on Delivery", emoji: "💵" },
  };

  const payment = paymentConfig[order.payment_method as keyof typeof paymentConfig] || paymentConfig.cash;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4 duration-300">
        {/* Banner Image */}
        <div className="w-full h-48 overflow-hidden relative">
          <img
            src={restaurant?.image_url || orderItems[0]?.menu_items?.image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600"}
            alt="Order"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          
          {/* Restaurant Info Overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-background border-2 border-background shadow-lg">
                {restaurant?.image_url ? (
                  <img
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground drop-shadow-sm">
                  {restaurant?.name || "Restaurant"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">Order Details</DialogTitle>
              <OrderStatusBadge status={order.status} />
            </div>
          </DialogHeader>

          {/* Estimated Delivery Time */}
          {isActiveOrder && (
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                <p className="font-bold text-lg text-primary">{estimatedMinutes} minutes</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {order.status !== "cancelled" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Order Progress</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          {/* Order Timeline */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Delivery Status</h4>
            <OrderTimeline status={order.status} />
          </div>

          <Separator />

          {/* Delivery Partner */}
          {(order.status === "delivering" || order.status === "preparing" || order.status === "confirmed") && (
            <div className="flex items-center gap-4 p-4 bg-secondary/5 rounded-xl border border-secondary/10">
              <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center">
                <Bike className="h-7 w-7 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-base">{deliveryPartner.name}</p>
                <p className="text-sm text-muted-foreground">
                  Delivery Partner • ID: {deliveryPartner.id}
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-9">
                <User className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Order Items */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Items ({orderItems.length})
            </h4>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-border/50">
                    <img
                      src={item.menu_items?.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60"}
                      alt={item.item_name}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-sm">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Delivery Address */}
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
              <p className="font-semibold mt-1">{order.delivery_address || "123 Main St, Hyderabad"}</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xl">
              {payment.emoji}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
              <p className="font-semibold mt-0.5">{payment.label}</p>
            </div>
          </div>

          <Separator />

          {/* Bill Summary */}
          <div className="p-4 bg-muted/20 rounded-xl border border-border/50">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Bill Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal || order.total_amount - deliveryFee - taxes + discount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-medium">₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxes & Charges (5%)</span>
                <span className="font-medium">₹{taxes || Math.round((order.total_amount - deliveryFee) * 0.05)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount Applied</span>
                  <span className="font-medium">-₹{discount}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-base">Total Paid</span>
                <span className="font-bold text-xl text-[hsl(24,95%,53%)]">₹{order.total_amount}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {order.status === "delivered" && (
              <Button 
                variant="outline" 
                className="flex-1 h-12"
                onClick={() => {
                  onReview(order);
                  onOpenChange(false);
                }}
              >
                <Star className="h-5 w-5 mr-2" />
                Rate Order
              </Button>
            )}
            <Button 
              className="flex-1 h-12 bg-[hsl(24,95%,53%)] hover:bg-[hsl(24,95%,45%)]"
              onClick={() => {
                onReorder(orderItems);
                onOpenChange(false);
              }}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reorder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
