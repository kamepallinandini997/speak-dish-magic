import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VoiceChat } from "@/components/VoiceChat";
import { 
  Sparkles, 
  MessageCircle, 
  ShoppingCart, 
  Heart, 
  Package, 
  LogOut,
  Star,
  Clock,
  Plus,
  Minus,
  X,
  CheckCircle
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
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchRestaurants();
    fetchCart();
    fetchWishlist();
    fetchOrders();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchRestaurants = async () => {
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("rating", { ascending: false });
    
    if (!error && data) setRestaurants(data);
  };

  const fetchCart = async () => {
    const { data, error } = await supabase
      .from("cart")
      .select("*, menu_items(*)")
      .order("created_at", { ascending: false });
    
    if (!error && data) setCartItems(data);
  };

  const fetchWishlist = async () => {
    const { data, error } = await supabase
      .from("wishlist")
      .select("*, menu_items(*)")
      .order("created_at", { ascending: false });
    
    if (!error && data) setWishlistItems(data);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) setOrders(data);
  };

  const fetchMenuItems = async (restaurantId: string) => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId);
    
    if (!error && data) setMenuItems(data);
  };

  const handleRestaurantClick = async (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    await fetchMenuItems(restaurant.id);
  };

  const addToCart = async (menuItem: MenuItem) => {
    const { error } = await supabase
      .from("cart")
      .upsert({
        menu_item_id: menuItem.id,
        quantity: 1,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Added to cart!",
        description: `${menuItem.name} has been added to your cart`,
      });
      fetchCart();
    }
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

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.menu_items.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold">Smart Food Assistant</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowCart(true)}
                className="relative"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItems.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center">
                    {cartItems.length}
                  </Badge>
                )}
              </Button>
              
              <Button onClick={handleLogout} variant="outline" size="icon">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="restaurants" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-4">
            <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="restaurants" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <Card 
                  key={restaurant.id}
                  className="cursor-pointer hover:shadow-hover transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                  onClick={() => handleRestaurantClick(restaurant)}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={restaurant.image_url} 
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {restaurant.name}
                      <Badge variant="secondary" className="gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        {restaurant.rating}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span>{restaurant.cuisine}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {restaurant.delivery_time}
                      </span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="wishlist">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistItems.map((item) => (
                <Card key={item.id}>
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={item.menu_items.image_url} 
                      alt={item.menu_items.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>{item.menu_items.name}</CardTitle>
                    <CardDescription>₹{item.menu_items.price}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => addToCart(item.menu_items)} className="w-full">
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Order #{order.id.slice(0, 8)}
                      <Badge>{order.status}</Badge>
                    </CardTitle>
                    <CardDescription>
                      {new Date(order.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span>Total: ₹{order.total_amount}</span>
                      <span className="text-muted-foreground">{order.payment_method}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <VoiceChat />
          </TabsContent>
        </Tabs>
      </main>

      {/* Voice Chat FAB */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-hover"
        onClick={() => setShowVoiceChat(true)}
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* Voice Chat Dialog */}
      <Dialog open={showVoiceChat} onOpenChange={setShowVoiceChat}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Voice Assistant</DialogTitle>
          </DialogHeader>
          <VoiceChat />
        </DialogContent>
      </Dialog>

      {/* Menu Dialog */}
      <Dialog open={!!selectedRestaurant} onOpenChange={() => setSelectedRestaurant(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRestaurant?.name} Menu</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <Card key={item.id}>
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {item.name}
                    <Badge variant="secondary">₹{item.price}</Badge>
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => addToCart(item)} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your Cart</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4 border-b pb-4">
                <img 
                  src={item.menu_items.image_url} 
                  alt={item.menu_items.name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-semibold">{item.menu_items.name}</h4>
                  <p className="text-muted-foreground">₹{item.menu_items.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {cartItems.length > 0 && (
              <>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-primary">₹{totalAmount.toFixed(2)}</span>
                </div>
                <Button className="w-full" size="lg">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Proceed to Checkout
                </Button>
              </>
            )}
            
            {cartItems.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;