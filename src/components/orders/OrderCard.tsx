import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderTimeline } from "./OrderTimeline";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChevronDown, 
  Star, 
  CreditCard, 
  Banknote, 
  Smartphone,
  RotateCcw,
  User,
  MapPin
} from "lucide-react";
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
  restaurants?: {
    name: string;
    delivery_fee: number;
  };
}

interface OrderCardProps {
  order: Order;
  onReview: (order: Order) => void;
  onReorder: (orderItems: OrderItem[]) => void;
}

// Random delivery partner names
const deliveryPartners = ["Ravi Kumar", "Deepak Singh", "Suresh", "Anil", "Prasad", "Krishna"];

export function OrderCard({ order, onReview, onReorder }: OrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const deliveryPartner = deliveryPartners[Math.floor(order.id.charCodeAt(0) % deliveryPartners.length)];

  useEffect(() => {
    if (isOpen && orderItems.length === 0) {
      fetchOrderItems();
    }
  }, [isOpen]);

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

  // Get thumbnails for preview (up to 3)
  const thumbnails = orderItems.slice(0, 3);
  const remainingCount = orderItems.length - 3;

  // Calculate bill details
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = order.restaurants?.delivery_fee || 30;
  const taxes = Math.round(subtotal * 0.05);
  const discount = subtotal > 500 ? Math.round(subtotal * 0.1) : 0;
  const finalAmount = subtotal + deliveryFee + taxes - discount;

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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        "transition-all duration-300 hover:shadow-hover overflow-hidden",
        isOpen && "shadow-hover ring-1 ring-primary/10"
      )}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 sm:p-6 cursor-pointer">
            <div className="flex gap-4">
              {/* Thumbnail Preview */}
              <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 relative">
                {orderItems.length > 0 ? (
                  <div className="grid grid-cols-2 gap-0.5 w-full h-full rounded-lg overflow-hidden bg-muted">
                    {thumbnails.map((item, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          "overflow-hidden bg-muted",
                          thumbnails.length === 1 && "col-span-2 row-span-2",
                          thumbnails.length === 2 && "row-span-2",
                          thumbnails.length === 3 && index === 0 && "row-span-2"
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
                      <div className="absolute bottom-1 right-1 bg-foreground/80 text-background text-xs px-1.5 py-0.5 rounded-full font-medium">
                        +{remainingCount}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full rounded-lg bg-muted animate-pulse" />
                )}
              </div>

              {/* Order Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-base sm:text-lg truncate">
                      Order #{order.id.slice(0, 8)}
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
                  
                  {/* Status Badge - Top Right */}
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold text-lg text-primary">₹{order.total_amount}</span>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform duration-300",
                    isOpen && "rotate-180"
                  )} />
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 sm:px-6 pb-6 space-y-5 animate-in slide-in-from-top-2 duration-300">
            <Separator />

            {/* Order Timeline */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Order Status</h4>
              <OrderTimeline status={order.status} />
            </div>

            {/* Delivery Partner (for active orders) */}
            {(order.status === "delivering" || order.status === "preparing") && (
              <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg">
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
              <h4 className="text-sm font-semibold mb-3">Items Ordered</h4>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <img
                        src={item.menu_items?.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60"}
                        alt={item.item_name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-semibold text-sm">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery Address */}
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Delivered to</p>
                <p className="text-sm font-medium">{order.delivery_address || "123 Main St, City"}</p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {paymentMethodIcon[order.payment_method as keyof typeof paymentMethodIcon] || paymentMethodIcon.cash}
              <div>
                <p className="text-xs text-muted-foreground">Payment Method</p>
                <p className="text-sm font-medium">
                  {paymentMethodLabel[order.payment_method as keyof typeof paymentMethodLabel] || "Cash on Delivery"}
                </p>
              </div>
            </div>

            {/* Bill Summary */}
            <div className="p-4 bg-muted/30 rounded-lg border">
              <h4 className="text-sm font-semibold mb-3">Bill Summary</h4>
              <div className="space-y-2 text-sm">
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
                    <span>Discount (10%)</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total Paid</span>
                  <span className="text-primary">₹{order.total_amount}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {order.status === "delivered" && (
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onReview(order)}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Write a Review
                </Button>
              )}
              <Button 
                className="flex-1 shadow-chip"
                onClick={() => onReorder(orderItems)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reorder
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
