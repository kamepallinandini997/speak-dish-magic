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
  MapPin,
  Package
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
  const [loading, setLoading] = useState(true);

  const deliveryPartner = deliveryPartners[Math.floor(order.id.charCodeAt(0) % deliveryPartners.length)];

  // Fetch order items immediately on mount for thumbnail preview
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
        "transition-all duration-300 hover:shadow-md overflow-hidden bg-card",
        isOpen && "shadow-lg ring-1 ring-primary/10"
      )}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-3 cursor-pointer">
            <div className="flex items-center gap-3">
              {/* Thumbnail Preview - Always visible */}
              <div className="flex-shrink-0 w-14 h-14 relative">
                {loading ? (
                  <div className="w-full h-full rounded-lg bg-muted animate-pulse" />
                ) : orderItems.length > 0 ? (
                  <div className="grid grid-cols-2 gap-0.5 w-full h-full rounded-lg overflow-hidden bg-muted">
                    {thumbnails.slice(0, thumbnails.length === 1 ? 1 : thumbnails.length === 2 ? 2 : 4).map((item, index) => (
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
                    <p className="font-semibold text-sm truncate">
                      #{order.id.slice(0, 8).toUpperCase()}
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
                <div className="flex items-center justify-between mt-1">
                  <span className="font-bold text-base text-primary">₹{order.total_amount}</span>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-300",
                    isOpen && "rotate-180"
                  )} />
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 animate-in slide-in-from-top-2 duration-300">
            <Separator />

            {/* Banner Image */}
            {orderItems.length > 0 && (
              <div className="w-full h-32 rounded-lg overflow-hidden">
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

            {/* Order Timeline */}
            <div>
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Status</h4>
              <OrderTimeline status={order.status} />
            </div>

            {/* Delivery Partner (for active orders) */}
            {(order.status === "delivering" || order.status === "preparing") && (
              <div className="flex items-center gap-2 p-2 bg-secondary/10 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-xs">{deliveryPartner}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {order.status === "delivering" ? "On the way" : "Will pick up soon"}
                  </p>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div>
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Items</h4>
              <div className="space-y-1.5">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/50">
                    <img
                      src={item.menu_items?.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60"}
                      alt={item.item_name}
                      className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{item.item_name}</p>
                      <p className="text-[10px] text-muted-foreground">x{item.quantity}</p>
                    </div>
                    <span className="font-semibold text-xs">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Delivered to</p>
                <p className="text-xs font-medium truncate">{order.delivery_address || "123 Main St, City"}</p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              {paymentMethodIcon[order.payment_method as keyof typeof paymentMethodIcon] || paymentMethodIcon.cash}
              <div>
                <p className="text-[10px] text-muted-foreground">Payment</p>
                <p className="text-xs font-medium">
                  {paymentMethodLabel[order.payment_method as keyof typeof paymentMethodLabel] || "Cash on Delivery"}
                </p>
              </div>
            </div>

            {/* Bill Summary */}
            <div className="p-2.5 bg-muted/30 rounded-lg border">
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Bill Summary</h4>
              <div className="space-y-1 text-xs">
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
                <Separator className="my-1.5" />
                <div className="flex justify-between font-bold text-sm">
                  <span>Total Paid</span>
                  <span className="text-primary">₹{order.total_amount}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {order.status === "delivered" && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => onReview(order)}
                >
                  <Star className="h-3.5 w-3.5 mr-1.5" />
                  Review
                </Button>
              )}
              <Button 
                size="sm"
                className="flex-1 h-9"
                onClick={() => onReorder(orderItems)}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reorder
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
