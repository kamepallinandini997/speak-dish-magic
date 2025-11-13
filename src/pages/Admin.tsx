import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package, Store, Clock, CheckCircle, ChefHat, Truck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Order {
  id: string;
  user_id: string;
  restaurant_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  delivery_address: string;
  estimated_delivery_time: string;
  profiles: { full_name: string };
}

interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: boolean;
  is_vegetarian: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  delivery_time: string;
  min_order: number;
  delivery_fee: number;
}

const Admin = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchOrders();
      fetchMenuItems();
    }
  }, [selectedRestaurant]);

  useEffect(() => {
    if (!selectedRestaurant) return;

    // Subscribe to real-time order updates
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${selectedRestaurant}`
        },
        (payload) => {
          console.log('Order update received:', payload);
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRestaurant]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", session.user.id);

    if (!roles || roles.length === 0) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    const adminRole = roles.find(r => r.role === 'admin');
    const restaurantRole = roles.find(r => r.role === 'restaurant_owner');

    if (adminRole) {
      setUserRole('admin');
    } else if (restaurantRole) {
      setUserRole('restaurant_owner');
      setSelectedRestaurant(restaurantRole.restaurant_id);
    }
  };

  const fetchRestaurants = async () => {
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .order("name");
    if (data) setRestaurants(data);
  };

  const fetchOrders = async () => {
    const query = supabase
      .from("orders")
      .select("*, profiles(full_name)")
      .eq("restaurant_id", selectedRestaurant)
      .order("created_at", { ascending: false });

    const { data } = await query;
    if (data) setOrders(data as any);
  };

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", selectedRestaurant)
      .order("category, name");
    if (data) setMenuItems(data);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    let estimated_delivery_time = null;
    
    if (newStatus === 'delivering') {
      estimated_delivery_time = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }

    const { error } = await supabase
      .from("orders")
      .update({ 
        status: newStatus,
        ...(estimated_delivery_time && { estimated_delivery_time })
      })
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });
      fetchOrders();
    }
  };

  const updateMenuItem = async () => {
    if (!editingItem) return;

    const { error } = await supabase
      .from("menu_items")
      .update({
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        category: editingItem.category,
        image_url: editingItem.image_url,
        is_available: editingItem.is_available,
        is_vegetarian: editingItem.is_vegetarian,
      })
      .eq("id", editingItem.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Menu item updated",
      });
      setEditingItem(null);
      fetchMenuItems();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-5 h-5 text-yellow-500" />;
      case "confirmed": return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case "preparing": return <ChefHat className="w-5 h-5 text-orange-500" />;
      case "delivering": return <Truck className="w-5 h-5 text-purple-500" />;
      case "delivered": return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          {userRole === 'admin' && (
            <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedRestaurant && (
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="menu">Menu Items</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              {orders.map(order => (
                <Card key={order.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <span>Order #{order.id.slice(0, 8)}</span>
                      </div>
                      <Badge>${order.total_amount.toFixed(2)}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Customer:</span>
                        <p className="font-medium">{order.profiles?.full_name || 'Unknown'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Address:</span>
                        <p className="font-medium">{order.delivery_address}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ordered:</span>
                        <p className="font-medium">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      {order.estimated_delivery_time && (
                        <div>
                          <span className="text-muted-foreground">Est. Delivery:</span>
                          <p className="font-medium">{new Date(order.estimated_delivery_time).toLocaleTimeString()}</p>
                        </div>
                      )}
                    </div>
                    <Select value={order.status} onValueChange={(val) => updateOrderStatus(order.id, val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="delivering">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="menu" className="space-y-4">
              {editingItem && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle>Editing: {editingItem.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="Name"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    />
                    <Textarea
                      placeholder="Description"
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem({...editingItem, price: parseFloat(e.target.value)})}
                    />
                    <Input
                      placeholder="Category"
                      value={editingItem.category || ''}
                      onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                    />
                    <Input
                      placeholder="Image URL"
                      value={editingItem.image_url || ''}
                      onChange={(e) => setEditingItem({...editingItem, image_url: e.target.value})}
                    />
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingItem.is_available}
                          onChange={(e) => setEditingItem({...editingItem, is_available: e.target.checked})}
                        />
                        Available
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingItem.is_vegetarian}
                          onChange={(e) => setEditingItem({...editingItem, is_vegetarian: e.target.checked})}
                        />
                        Vegetarian
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={updateMenuItem}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.map(item => (
                  <Card key={item.id} className={!item.is_available ? "opacity-50" : ""}>
                    <CardHeader>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="secondary">${item.price}</Badge>
                        {!item.is_available && <Badge variant="destructive">Unavailable</Badge>}
                        {item.is_vegetarian && <Badge variant="outline">🌱 Veg</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button size="sm" onClick={() => setEditingItem(item)}>
                        Edit
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Admin;
