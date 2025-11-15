import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VoiceChat } from "@/components/VoiceChat";
import { 
  Sparkles, 
  ShoppingCart, 
  Heart, 
  Package, 
  LogOut,
  Star,
  Clock,
  Plus,
  Minus,
  X,
  CheckCircle,
  User,
  Truck,
  ChefHat,
  MapPin,
  Search,
  Filter,
  Leaf
} from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  image_url: string;
  delivery_time: string;
  min_order: number;
  delivery_fee: number;
}

interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  rating: number;
  is_vegetarian: boolean;
  is_available: boolean;
}

interface CartItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  menu_items: MenuItem;
}

const Dashboard = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState("home");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [deliveryAddress, setDeliveryAddress] = useState("123 Main St, City");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const categories = ["All", "Biryani", "Pizza", "Burger", "Healthy", "Desserts", "Beverages"];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchRestaurants();
      fetchCart();
      fetchWishlist();
      fetchOrders();
      subscribeToOrders();
    }
  }, [userId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUserId(session.user.id);
      
      // Check if user is restaurant owner
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "restaurant_owner")
        .maybeSingle();
      
      if (roleData) {
        navigate("/restaurant-dashboard");
      }
    }
  };

  const subscribeToOrders = () => {
    if (!userId) return;

    const channel = supabase
      .channel('user-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          fetchOrders();
          
          if (payload.new && (payload.new as any).status === 'delivering') {
            toast({
              title: "Order on the way! 🚚",
              description: "Your order is out for delivery",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchRestaurants = async () => {
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .order("rating", { ascending: false });
    
    if (data) setRestaurants(data);
  };

  const fetchCart = async () => {
    const { data } = await supabase
      .from("cart")
      .select("*, menu_items(*)")
      .order("created_at", { ascending: false });
    
    if (data) setCartItems(data);
  };

  const fetchWishlist = async () => {
    const { data } = await supabase
      .from("wishlist")
      .select("*, menu_items(*)")
      .order("created_at", { ascending: false });
    
    if (data) setWishlistItems(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setOrders(data);
  };

  const fetchMenuItems = async (restaurantId: string) => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true);
    
    if (data) setMenuItems(data);
  };

  const handleRestaurantClick = async (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    await fetchMenuItems(restaurant.id);
  };

  const addToCart = async (menuItem: MenuItem) => {
    if (!userId) return;

    const existingItem = cartItems.find(item => item.menu_item_id === menuItem.id);
    
    if (existingItem) {
      await updateCartQuantity(existingItem.id, existingItem.quantity + 1);
      toast({ title: "Cart updated!", description: `${menuItem.name} quantity increased` });
      return;
    }

    const { error } = await supabase
      .from("cart")
      .insert({
        menu_item_id: menuItem.id,
        quantity: 1,
        user_id: userId,
      });

    if (!error) {
      toast({ title: "Added to cart!", description: menuItem.name });
      fetchCart();
    }
  };

  const addToWishlist = async (menuItem: MenuItem) => {
    if (!userId) return;

    const { error } = await supabase
      .from("wishlist")
      .insert({
        menu_item_id: menuItem.id,
        user_id: userId,
      });

    if (!error) {
      toast({ title: "Added to wishlist!" });
      fetchWishlist();
    }
  };

  const removeFromWishlist = async (wishlistId: string) => {
    await supabase.from("wishlist").delete().eq("id", wishlistId);
    toast({ title: "Removed from wishlist" });
    fetchWishlist();
  };

  const updateCartQuantity = async (cartId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      await supabase.from("cart").delete().eq("id", cartId);
    } else {
      await supabase.from("cart").update({ quantity: newQuantity }).eq("id", cartId);
    }
    fetchCart();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const proceedToCheckout = () => {
    if (cartItems.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleCheckout = async () => {
    if (!userId || cartItems.length === 0) return;

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.menu_items.price * item.quantity,
      0
    );

    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          restaurant_id: cartItems[0].menu_items.restaurant_id,
          total_amount: totalAmount,
          status: "pending",
          payment_method: paymentMethod,
          delivery_address: deliveryAddress,
          estimated_delivery_time: new Date(Date.now() + 40 * 60000).toISOString(),
        })
        .select()
        .single();

      if (orderError || !order) {
        toast({ title: "Error placing order", variant: "destructive" });
        return;
      }

      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.menu_items.price,
        item_name: item.menu_items.name,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        toast({ title: "Error creating order items", variant: "destructive" });
        return;
      }

      await supabase.from("cart").delete().eq("user_id", userId);

      toast({
        title: "Order placed! 🎉",
        description: `Order #${order.id.slice(0, 8)} • Total: ₹${totalAmount}`,
      });

      setShowCheckout(false);
      fetchCart();
      fetchOrders();
      setActiveTab("orders");
    } catch (error) {
      toast({ title: "Checkout failed", variant: "destructive" });
    }
  };

  const submitReview = async () => {
    if (!reviewOrder) return;

    const { error } = await supabase
      .from("order_reviews")
      .insert({
        order_id: reviewOrder.id,
        user_id: userId!,
        rating: reviewRating,
        comment: reviewComment,
      });

    if (!error) {
      toast({ title: "Review submitted!" });
      setShowReview(false);
      setReviewOrder(null);
      setReviewRating(5);
      setReviewComment("");
    }
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cartItems.reduce((sum, item) => sum + item.menu_items.price * item.quantity, 0);
  const deliveryFee = selectedRestaurant?.delivery_fee || 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">FoodHub</h1>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{deliveryAddress}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative" 
              onClick={() => setShowCart(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-white flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {!selectedRestaurant ? (
          <>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search for restaurants, cuisines..."
                  className="pl-10 h-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Category Filter */}
            <ScrollArea className="mb-6">
              <div className="flex gap-2 pb-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="whitespace-nowrap"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </ScrollArea>

            {/* Bottom Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="home">Home</TabsTrigger>
                <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
              </TabsList>

              {/* Home Tab - Restaurants */}
              <TabsContent value="home" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredRestaurants.map((restaurant) => (
                    <Card 
                      key={restaurant.id}
                      className="group cursor-pointer hover:shadow-hover transition-all"
                      onClick={() => handleRestaurantClick(restaurant)}
                    >
                      <div className="relative overflow-hidden rounded-t-lg">
                        <img 
                          src={restaurant.image_url} 
                          alt={restaurant.name}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                        />
                        <Badge className="absolute top-3 right-3 bg-background/90">
                          <Star className="h-3 w-3 mr-1 fill-primary text-primary" />
                          {restaurant.rating}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-1">{restaurant.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{restaurant.cuisine}</p>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {restaurant.delivery_time}
                          </div>
                          <div className="text-muted-foreground">
                            Min ₹{restaurant.min_order}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Wishlist Tab */}
              <TabsContent value="wishlist" className="space-y-4">
                {wishlistItems.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                    <p className="text-muted-foreground">Start adding items to your wishlist</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {wishlistItems.map((item) => (
                      <Card key={item.id}>
                        <div className="relative">
                          <img 
                            src={item.menu_items.image_url} 
                            alt={item.menu_items.name}
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                          {item.menu_items.is_vegetarian && (
                            <Badge className="absolute top-2 left-2" variant="secondary">
                              <Leaf className="h-3 w-3 mr-1" />
                              Veg
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-1">{item.menu_items.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {item.menu_items.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">₹{item.menu_items.price}</span>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => addToCart(item.menu_items)}>
                                Add to Cart
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => removeFromWishlist(item.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="space-y-4">
                {orders.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                    <p className="text-muted-foreground">Start ordering delicious food</p>
                  </Card>
                ) : (
                  orders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={
                            order.status === "delivered" ? "bg-secondary" :
                            order.status === "delivering" ? "bg-primary" :
                            order.status === "preparing" ? "bg-accent" :
                            "bg-muted"
                          }>
                            {order.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-semibold">₹{order.total_amount}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{order.delivery_address}</span>
                          </div>
                        </div>

                        {order.status === "delivered" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setReviewOrder(order);
                              setShowReview(true);
                            }}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Rate Order
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Chat Tab */}
              <TabsContent value="chat">
                <VoiceChat isActive={activeTab === "chat"} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          /* Restaurant Menu */
          <div>
            <Button 
              variant="ghost" 
              className="mb-4"
              onClick={() => {
                setSelectedRestaurant(null);
                setMenuItems([]);
              }}
            >
              ← Back to Restaurants
            </Button>

            <Card className="mb-6">
              <div className="relative h-48">
                <img 
                  src={selectedRestaurant.image_url} 
                  alt={selectedRestaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-2">{selectedRestaurant.name}</h2>
                <p className="text-muted-foreground mb-4">{selectedRestaurant.cuisine}</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-semibold">{selectedRestaurant.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{selectedRestaurant.delivery_time}</span>
                  </div>
                  <div>
                    Delivery ₹{selectedRestaurant.delivery_fee}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Menu */}
            <div className="mb-4">
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12"
              />
            </div>

            {/* Category Filter */}
            <ScrollArea className="mb-6">
              <div className="flex gap-2 pb-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="whitespace-nowrap"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </ScrollArea>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMenuItems.map((item) => (
                <Card key={item.id}>
                  <div className="relative">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                    {item.is_vegetarian && (
                      <Badge className="absolute top-2 left-2" variant="secondary">
                        <Leaf className="h-3 w-3 mr-1" />
                        Veg
                      </Badge>
                    )}
                    <Badge className="absolute top-2 right-2 bg-background/90">
                      <Star className="h-3 w-3 mr-1 fill-primary text-primary" />
                      {item.rating}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">₹{item.price}</span>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => addToWishlist(item)}>
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => addToCart(item)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Your Cart</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Cart is empty
              </div>
            ) : (
              <>
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img 
                      src={item.menu_items.image_url} 
                      alt={item.menu_items.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{item.menu_items.name}</h4>
                      <p className="text-sm text-primary">₹{item.menu_items.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="icon" 
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button 
                        size="icon"
                        variant="outline" 
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₹{cartTotal + deliveryFee}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          {cartItems.length > 0 && (
            <DialogFooter>
              <Button onClick={proceedToCheckout} className="w-full">
                Proceed to Checkout
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>Complete your order</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Delivery Address</label>
              <Textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter delivery address"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash on Delivery</SelectItem>
                  <SelectItem value="card">Debit/Credit Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span>Subtotal</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Delivery Fee</span>
                <span>₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{cartTotal + deliveryFee}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckout}>
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={reviewRating >= rating ? "default" : "outline"}
                    size="icon"
                    onClick={() => setReviewRating(rating)}
                  >
                    <Star className={reviewRating >= rating ? "fill-current" : ""} />
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Comment</label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReview(false)}>
              Cancel
            </Button>
            <Button onClick={submitReview}>
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
