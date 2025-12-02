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
import { Skeleton } from "@/components/ui/skeleton";
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
  Leaf,
  Mic,
  Tag,
  Navigation
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
  const [loading, setLoading] = useState(true);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  
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
    setLoading(true);
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .order("rating", { ascending: false });
    
    if (data) setRestaurants(data);
    setLoading(false);
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

  const searchSuggestions = searchQuery.length > 0 
    ? restaurants
        .filter(r => 
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const cartTotal = cartItems.reduce((sum, item) => sum + item.menu_items.price * item.quantity, 0);
  const deliveryFee = selectedRestaurant?.delivery_fee || 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center shadow-soft">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg bg-gradient-hero bg-clip-text text-transparent">FoodHub</h1>
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
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-white flex items-center justify-center animate-pulse">
                  {cartItems.length}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
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
            {/* Search Bar with Voice and Suggestions */}
            <div className="mb-6 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search for restaurants, cuisines, dishes…"
                  className="pl-10 pr-12 h-14 text-base shadow-soft"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary"
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Search Suggestions Dropdown */}
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <Card className="absolute top-full mt-2 w-full z-50 shadow-hover">
                  <CardContent className="p-0">
                    {searchSuggestions.map((restaurant) => (
                      <div
                        key={restaurant.id}
                        className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b last:border-0"
                        onClick={() => {
                          setSearchQuery(restaurant.name);
                          setShowSearchSuggestions(false);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{restaurant.name}</p>
                            <p className="text-xs text-muted-foreground">{restaurant.cuisine}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Category Filter Chips */}
            <ScrollArea className="mb-6">
              <div className="flex gap-2 pb-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap transition-all ${
                      selectedCategory === cat 
                        ? "shadow-chip font-bold scale-105" 
                        : "hover:shadow-soft"
                    }`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </ScrollArea>

            {/* Bottom Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 mb-6 h-12 bg-card shadow-soft">
                <TabsTrigger value="home" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </TabsTrigger>
                <TabsTrigger value="wishlist" className="gap-2">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Wishlist</span>
                </TabsTrigger>
                <TabsTrigger value="orders" className="gap-2">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Orders</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-2">
                  <Mic className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Chat</span>
                </TabsTrigger>
              </TabsList>

              {/* Home Tab - Restaurants */}
              <TabsContent value="home" className="space-y-4">
                {loading ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i}>
                        <Skeleton className="w-full h-48 rounded-t-lg" />
                        <CardContent className="p-4 space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <div className="flex justify-between">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRestaurants.map((restaurant) => (
                      <Card 
                        key={restaurant.id}
                        className="group cursor-pointer hover:shadow-hover transition-all duration-300 overflow-hidden"
                        onClick={() => handleRestaurantClick(restaurant)}
                      >
                        <div className="relative overflow-hidden rounded-t-lg h-48">
                          <img 
                            src={restaurant.image_url} 
                            alt={restaurant.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          {/* Rating Badge - Top Left */}
                          <Badge className="absolute top-3 left-3 bg-background/95 backdrop-blur shadow-soft">
                            <Star className="h-3 w-3 mr-1 fill-primary text-primary" />
                            {restaurant.rating}
                          </Badge>
                          {/* Offer Tag - Top Right */}
                          <Badge className="absolute top-3 right-3 bg-accent/95 backdrop-blur text-white shadow-soft">
                            <Tag className="h-3 w-3 mr-1" />
                            20% OFF
                          </Badge>
                          {/* Wishlist Heart */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-background/90 backdrop-blur hover:bg-background shadow-soft"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add to restaurant wishlist logic
                            }}
                          >
                            <Heart className="h-4 w-4 text-accent" />
                          </Button>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-bold text-lg mb-1">{restaurant.name}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                {restaurant.cuisine}
                                <span className="mx-1">•</span>
                                <Leaf className="h-3 w-3 text-secondary" />
                                Veg
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-3">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {restaurant.delivery_time}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Navigation className="h-3 w-3" />
                              1.2 km
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
                            <span className="text-muted-foreground">Min ₹{restaurant.min_order}</span>
                            <span className="text-muted-foreground">₹{restaurant.delivery_fee} delivery</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Wishlist Tab */}
              <TabsContent value="wishlist" className="space-y-4">
                {wishlistItems.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                    <p className="text-muted-foreground">Start adding your favorite dishes!</p>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {wishlistItems.map((item) => (
                      <Card key={item.id} className="group hover:shadow-hover transition-all">
                        <div className="relative overflow-hidden rounded-t-lg h-40">
                          <img 
                            src={item.menu_items.image_url} 
                            alt={item.menu_items.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90"
                            onClick={() => removeFromWishlist(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-1">{item.menu_items.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{item.menu_items.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-lg">₹{item.menu_items.price}</span>
                            <Button size="sm" onClick={() => addToCart(item.menu_items)}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
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
                    <p className="text-muted-foreground">Your orders will appear here</p>
                  </Card>
                ) : (
                  orders.map((order) => (
                    <Card key={order.id} className="hover:shadow-hover transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold">Order #{order.id.slice(0, 8)}</h3>
                              <Badge variant={
                                order.status === "delivered" ? "default" :
                                order.status === "delivering" ? "secondary" :
                                "outline"
                              }>
                                {order.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()} • ₹{order.total_amount}
                            </p>
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
                              <Star className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          )}
                        </div>
                        
                        {order.status === "delivering" && (
                          <div className="flex items-center gap-2 text-secondary">
                            <Truck className="h-4 w-4 animate-pulse" />
                            <span className="text-sm font-medium">Your order is on the way!</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* AI Chat Tab */}
              <TabsContent value="chat">
                <Card className="h-[600px] shadow-hover">
                  <VoiceChat isActive={activeTab === "chat"} />
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          // Restaurant Menu View
          <div>
            <Button 
              variant="ghost" 
              className="mb-4"
              onClick={() => setSelectedRestaurant(null)}
            >
              ← Back to Restaurants
            </Button>

            <Card className="mb-6 shadow-soft">
              <div className="relative h-48 overflow-hidden rounded-t-lg">
                <img 
                  src={selectedRestaurant.image_url} 
                  alt={selectedRestaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selectedRestaurant.name}</h2>
                    <p className="text-muted-foreground mb-3">{selectedRestaurant.cuisine}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        {selectedRestaurant.rating}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {selectedRestaurant.delivery_time}
                      </div>
                      <div>Min order: ₹{selectedRestaurant.min_order}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Filter for Menu */}
            <ScrollArea className="mb-6">
              <div className="flex gap-2 pb-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap transition-all ${
                      selectedCategory === cat 
                        ? "shadow-chip font-bold scale-105" 
                        : "hover:shadow-soft"
                    }`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-4">
              {filteredMenuItems.map((item) => (
                <Card key={item.id} className="hover:shadow-hover transition-all">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                            {item.is_vegetarian && (
                              <Badge variant="outline" className="border-secondary text-secondary">
                                <Leaf className="h-3 w-3 mr-1" />
                                Veg
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-primary text-primary" />
                            <span className="font-medium">{item.rating}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xl">₹{item.price}</span>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => addToWishlist(item)}
                            >
                              <Heart className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => addToCart(item)}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add to Cart
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg">
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
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
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Your Cart
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4 pr-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 pb-3 border-b">
                  <img 
                    src={item.menu_items.image_url} 
                    alt={item.menu_items.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.menu_items.name}</h4>
                    <p className="text-sm font-bold">₹{item.menu_items.price}</p>
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
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
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
            </div>
          </ScrollArea>
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>₹{cartTotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Delivery Fee</span>
              <span>₹{deliveryFee}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{cartTotal + deliveryFee}</span>
            </div>
          </div>
          <Button className="w-full" size="lg" onClick={proceedToCheckout}>
            Proceed to Checkout
          </Button>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-md">
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
                placeholder="Enter your delivery address"
                className="min-h-[80px]"
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
                  <SelectItem value="pin">Pay on Delivery (PIN)</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Items Total</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total Amount</span>
                <span>₹{cartTotal + deliveryFee}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckout} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Order</DialogTitle>
            <DialogDescription>How was your experience?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setReviewRating(rating)}
                >
                  <Star 
                    className={`h-8 w-8 ${
                      rating <= reviewRating 
                        ? "fill-primary text-primary" 
                        : "text-muted-foreground"
                    }`}
                  />
                </Button>
              ))}
            </div>
            <Textarea 
              placeholder="Share your experience (optional)"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="min-h-[100px]"
            />
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
