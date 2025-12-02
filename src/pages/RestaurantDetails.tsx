import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  Star,
  Clock,
  Plus,
  Minus,
  Leaf,
  ShoppingCart
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

type DietFilter = "All" | "Veg" | "Non-Veg";

const RestaurantDetails = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDiet, setSelectedDiet] = useState<DietFilter>("All");
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const categories = ["All", "Biryani", "Pizza", "Burger", "Desserts", "Healthy", "Beverages"];
  const dietFilters: DietFilter[] = ["All", "Veg", "Non-Veg"];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurant();
      fetchMenuItems();
    }
  }, [restaurantId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);
  };

  const fetchRestaurant = async () => {
    if (!restaurantId) return;
    
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId)
      .single();

    if (error) {
      console.error("Error fetching restaurant:", error);
      return;
    }

    setRestaurant(data);
  };

  const fetchMenuItems = async () => {
    if (!restaurantId) return;

    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true);

    if (error) {
      console.error("Error fetching menu items:", error);
      return;
    }

    setMenuItems(data || []);
  };

  const addToCart = async (menuItem: MenuItem) => {
    if (!userId) return;

    const currentQuantity = cartQuantities[menuItem.id] || 0;
    const newQuantity = currentQuantity + 1;

    // Check if item already exists in cart
    const { data: existingItem } = await supabase
      .from("cart")
      .select("*")
      .eq("user_id", userId)
      .eq("menu_item_id", menuItem.id)
      .single();

    if (existingItem) {
      // Update quantity
      const { error } = await supabase
        .from("cart")
        .update({ quantity: existingItem.quantity + 1 })
        .eq("id", existingItem.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add item to cart",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Insert new item
      const { error } = await supabase
        .from("cart")
        .insert({
          user_id: userId,
          menu_item_id: menuItem.id,
          quantity: 1,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add item to cart",
          variant: "destructive",
        });
        return;
      }
    }

    setCartQuantities(prev => ({ ...prev, [menuItem.id]: newQuantity }));
    toast({
      title: "Added to cart",
      description: `${menuItem.name} added to your cart`,
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCartQuantities(prev => {
      const current = prev[itemId] || 0;
      const newQuantity = Math.max(0, current + delta);
      return { ...prev, [itemId]: newQuantity };
    });
  };

  const getFilteredMenuItems = () => {
    let filtered = menuItems;

    // Apply category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter(item => 
        item.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Apply diet filter
    if (selectedDiet === "Veg") {
      filtered = filtered.filter(item => item.is_vegetarian);
    } else if (selectedDiet === "Non-Veg") {
      filtered = filtered.filter(item => !item.is_vegetarian);
    }

    // Fallback logic: if no items match, show top 3 rated items
    if (filtered.length === 0 && menuItems.length > 0) {
      return menuItems
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);
    }

    return filtered;
  };

  const filteredMenuItems = getFilteredMenuItems();
  const hasNoResults = selectedCategory !== "All" || selectedDiet !== "All";

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{restaurant.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {restaurant.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {restaurant.delivery_time}
                </span>
                <span>{restaurant.cuisine}</span>
                <span>Min ₹{restaurant.min_order}</span>
              </div>
            </div>
            <Button
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              View Cart
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Filters Row - Below Restaurant Header */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2 flex items-center">
              Categories:
            </span>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground shadow-chip"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2 flex items-center">
              Diet:
            </span>
            {dietFilters.map((diet) => (
              <button
                key={diet}
                onClick={() => setSelectedDiet(diet)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  selectedDiet === diet
                    ? "bg-primary text-primary-foreground shadow-chip"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                {diet === "Veg" && <span>🟢</span>}
                {diet === "Non-Veg" && <span>🔴</span>}
                {diet}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div>
          {hasNoResults && filteredMenuItems.length < menuItems.length && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                No matching items found. Showing other recommendations.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMenuItems.map((item) => (
                <Card 
                  key={item.id} 
                  className="overflow-hidden hover:shadow-hover transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                    />
                    {item.is_vegetarian && (
                      <Badge className="absolute top-2 left-2 bg-green-500 hover:bg-green-600">
                        <Leaf className="h-3 w-3 mr-1" />
                        Veg
                      </Badge>
                    )}
                    {!item.is_vegetarian && (
                      <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
                        Non-Veg
                      </Badge>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {item.rating}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {item.description}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-xl font-bold text-primary">₹{item.price}</p>
                      
                      {cartQuantities[item.id] > 0 ? (
                        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold min-w-[20px] text-center">
                            {cartQuantities[item.id]}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => addToCart(item)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addToCart(item)}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
    </div>
  );
};

export default RestaurantDetails;