import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut,
  Plus,
  Edit,
  Trash2,
  Store,
  Clock,
  DollarSign,
  Package,
  CheckCircle,
  Truck,
  ChefHat,
  Star,
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

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  delivery_address: string;
  estimated_delivery_time: string;
}

const RestaurantDashboard = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [showRestaurantDialog, setShowRestaurantDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: 0,
    category: "",
    image_url: "",
    is_vegetarian: false,
    is_available: true
  });

  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    cuisine: "",
    delivery_time: "30-40 mins",
    min_order: 0,
    delivery_fee: 0,
    image_url: ""
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (restaurant?.id) {
      fetchMenuItems();
      fetchOrders();
      subscribeToOrders();
    }
  }, [restaurant?.id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    await fetchRestaurant(session.user.id);
  };

  const fetchRestaurant = async (uid: string) => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("restaurant_id")
      .eq("user_id", uid)
      .eq("role", "restaurant_owner")
      .single();

    if (roleData?.restaurant_id) {
      const { data: restaurantData } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", roleData.restaurant_id)
        .single();

      if (restaurantData) {
        setRestaurant(restaurantData);
        setRestaurantForm({
          name: restaurantData.name,
          cuisine: restaurantData.cuisine,
          delivery_time: restaurantData.delivery_time,
          min_order: restaurantData.min_order,
          delivery_fee: restaurantData.delivery_fee,
          image_url: restaurantData.image_url || ""
        });
      }
    }
  };

  const fetchMenuItems = async () => {
    if (!restaurant?.id) return;
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("category", { ascending: true });

    if (data) setMenuItems(data);
  };

  const fetchOrders = async () => {
    if (!restaurant?.id) return;
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });

    if (data) setOrders(data);
  };

  const subscribeToOrders = () => {
    if (!restaurant?.id) return;
    
    const channel = supabase
      .channel('restaurant-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        (payload) => {
          console.log('Order update:', payload);
          fetchOrders();
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Order! 🎉",
              description: "You have received a new order",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleUpdateRestaurant = async () => {
    if (!restaurant?.id) return;
    
    const { error } = await supabase
      .from("restaurants")
      .update(restaurantForm)
      .eq("id", restaurant.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({ title: "Restaurant updated successfully!" });
      setShowRestaurantDialog(false);
      fetchRestaurant(userId!);
    }
  };

  const handleSaveMenuItem = async () => {
    if (!restaurant?.id) return;

    if (editingItem) {
      const { error } = await supabase
        .from("menu_items")
        .update(menuForm)
        .eq("id", editingItem.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({ title: "Menu item updated!" });
      }
    } else {
      const { error } = await supabase
        .from("menu_items")
        .insert([{ ...menuForm, restaurant_id: restaurant.id }]);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({ title: "Menu item added!" });
      }
    }

    setShowMenuDialog(false);
    setEditingItem(null);
    setMenuForm({
      name: "",
      description: "",
      price: 0,
      category: "",
      image_url: "",
      is_vegetarian: false,
      is_available: true
    });
    fetchMenuItems();
  };

  const handleDeleteMenuItem = async (id: string) => {
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({ title: "Menu item deleted!" });
      fetchMenuItems();
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({ title: `Order marked as ${status}` });
      fetchOrders();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-muted";
      case "confirmed": return "bg-secondary";
      case "preparing": return "bg-accent";
      case "delivering": return "bg-primary";
      case "delivered": return "bg-secondary";
      default: return "bg-muted";
    }
  };

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Restaurant Found</CardTitle>
            <CardDescription>Please contact support to set up your restaurant.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-bold text-lg">{restaurant.name}</h1>
              <p className="text-xs text-muted-foreground">{restaurant.cuisine}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowRestaurantDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Restaurant
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="menu">Menu Items</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="grid gap-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                        <CardDescription>
                          {new Date(order.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="font-semibold">₹{order.total_amount}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Truck className="h-4 w-4" />
                      {order.delivery_address}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.status === "pending" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateOrderStatus(order.id, "confirmed")}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm
                        </Button>
                      )}
                      {order.status === "confirmed" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                        >
                          <ChefHat className="h-4 w-4 mr-2" />
                          Start Preparing
                        </Button>
                      )}
                      {order.status === "preparing" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateOrderStatus(order.id, "delivering")}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Out for Delivery
                        </Button>
                      )}
                      {order.status === "delivering" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateOrderStatus(order.id, "delivered")}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Delivered
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Menu Items Tab */}
          <TabsContent value="menu" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => {
                setEditingItem(null);
                setMenuForm({
                  name: "",
                  description: "",
                  price: 0,
                  category: "",
                  image_url: "",
                  is_vegetarian: false,
                  is_available: true
                });
                setShowMenuDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Menu Item
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {menuItems.map((item) => (
                <Card key={item.id} className="group overflow-hidden">
                  <div className="relative h-48 overflow-hidden bg-muted">
                    <img 
                      src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500"} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500";
                      }}
                    />
                    {item.is_vegetarian && (
                      <Badge className="absolute top-3 right-3 bg-secondary/95 backdrop-blur shadow-soft">
                        <Leaf className="h-3 w-3 mr-1" />
                        Veg
                      </Badge>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {item.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => {
                            setEditingItem(item);
                            setMenuForm({
                              name: item.name,
                              description: item.description,
                              price: item.price,
                              category: item.category,
                              image_url: item.image_url,
                              is_vegetarian: item.is_vegetarian,
                              is_available: item.is_available
                            });
                            setShowMenuDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleDeleteMenuItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">₹{item.price}</span>
                      <div className="flex gap-2">
                        {item.is_vegetarian && <Badge variant="secondary">Veg</Badge>}
                        <Badge variant={item.is_available ? "default" : "destructive"}>
                          {item.is_available ? "Available" : "Out of Stock"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Category: {item.category}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Menu Item Dialog */}
      <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"} Menu Item</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update" : "Create a new"} menu item for your restaurant
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={menuForm.name}
                onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={menuForm.description}
                onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  value={menuForm.price}
                  onChange={(e) => setMenuForm({ ...menuForm, price: parseFloat(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={menuForm.category} onValueChange={(value) => setMenuForm({ ...menuForm, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Biryani">Biryani</SelectItem>
                    <SelectItem value="Pizza">Pizza</SelectItem>
                    <SelectItem value="Burger">Burger</SelectItem>
                    <SelectItem value="Healthy">Healthy</SelectItem>
                    <SelectItem value="Desserts">Desserts</SelectItem>
                    <SelectItem value="Beverages">Beverages</SelectItem>
                    <SelectItem value="Starters">Starters</SelectItem>
                    <SelectItem value="Main Course">Main Course</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={menuForm.image_url}
                onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="vegetarian"
                  checked={menuForm.is_vegetarian}
                  onCheckedChange={(checked) => setMenuForm({ ...menuForm, is_vegetarian: checked })}
                />
                <Label htmlFor="vegetarian">Vegetarian</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={menuForm.is_available}
                  onCheckedChange={(checked) => setMenuForm({ ...menuForm, is_available: checked })}
                />
                <Label htmlFor="available">Available</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMenuDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMenuItem}>
              {editingItem ? "Update" : "Add"} Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restaurant Edit Dialog */}
      <Dialog open={showRestaurantDialog} onOpenChange={setShowRestaurantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
            <DialogDescription>Update your restaurant details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="r-name">Restaurant Name</Label>
              <Input
                id="r-name"
                value={restaurantForm.name}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cuisine">Cuisine</Label>
              <Input
                id="cuisine"
                value={restaurantForm.cuisine}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, cuisine: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="delivery_time">Delivery Time</Label>
                <Input
                  id="delivery_time"
                  value={restaurantForm.delivery_time}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, delivery_time: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="delivery_fee">Delivery Fee (₹)</Label>
                <Input
                  id="delivery_fee"
                  type="number"
                  value={restaurantForm.delivery_fee}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, delivery_fee: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="min_order">Minimum Order (₹)</Label>
              <Input
                id="min_order"
                type="number"
                value={restaurantForm.min_order}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, min_order: parseFloat(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-image_url">Restaurant Image URL</Label>
              <Input
                id="r-image_url"
                value={restaurantForm.image_url}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, image_url: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestaurantDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRestaurant}>Update Restaurant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantDashboard;
