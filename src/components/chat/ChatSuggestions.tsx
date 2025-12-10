import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Sparkles, ChevronRight, Store, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string | null;
  restaurant_id: string | null;
  restaurants?: {
    name: string;
  };
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number | null;
  image_url: string | null;
  delivery_time: string | null;
}

interface ChatSuggestionsProps {
  messages: { role: string; content: string }[];
  isVisible: boolean;
  isMobileDrawer?: boolean;
  onRestaurantClick?: (restaurant: Restaurant) => void;
  onItemClick?: (item: MenuItem) => void;
}

export const ChatSuggestions = ({ 
  messages, 
  isVisible, 
  isMobileDrawer = false,
  onRestaurantClick,
  onItemClick
}: ChatSuggestionsProps) => {
  const [suggestedItems, setSuggestedItems] = useState<MenuItem[]>([]);
  const [suggestedRestaurants, setSuggestedRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const { toast } = useToast();

  // Extract keywords from conversation
  useEffect(() => {
    const extractKeywords = () => {
      const conversationText = messages
        .map((m) => m.content.toLowerCase())
        .join(" ");

      const keywords: string[] = [];

      // Restaurant names
      const restaurantNames = [
        "paradise biryani", "paradise", "dominos pizza", "dominos", "subway",
        "kfc", "sushi palace", "bawarchi", "shah ghouse", "pista house", "meghana"
      ];
      restaurantNames.forEach(name => {
        if (conversationText.includes(name)) {
          keywords.push(name);
        }
      });

      // Cuisine types
      const cuisines = [
        "chinese", "indian", "italian", "south indian", "north indian",
        "hyderabadi", "japanese", "american", "mexican", "thai", "korean"
      ];
      cuisines.forEach(cuisine => {
        if (conversationText.includes(cuisine)) {
          keywords.push(cuisine);
        }
      });

      // Cooking styles
      const cookingStyles = [
        "grilled", "fried", "tandoori", "steamed", "roasted", "baked",
        "curry", "kebab", "biryani", "tikka", "masala"
      ];
      cookingStyles.forEach(style => {
        if (conversationText.includes(style)) {
          keywords.push(style);
        }
      });

      // Dietary preferences
      const dietaryPrefs = [
        "veg", "vegetarian", "non-veg", "non vegetarian", "vegan",
        "gluten-free", "spicy", "mild", "healthy"
      ];
      dietaryPrefs.forEach(pref => {
        if (conversationText.includes(pref)) {
          keywords.push(pref);
        }
      });

      // Food categories
      const categories = [
        "biryani", "pizza", "burger", "sushi", "roll", "sub", "sandwich",
        "chicken", "mutton", "paneer", "dessert", "sweet", "drink", "beverage",
        "rice", "roti", "naan", "salad", "soup", "appetizer", "main course"
      ];
      categories.forEach(category => {
        if (conversationText.includes(category)) {
          keywords.push(category);
        }
      });

      // Remove duplicates and set
      const uniqueKeywords = Array.from(new Set(keywords));
      setKeywords(uniqueKeywords);
    };

    extractKeywords();
  }, [messages]);

  // Fetch suggestions based on keywords
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (keywords.length === 0 && messages.length === 0) {
        // Show default popular items
        setIsLoading(true);
        try {
          const { data: items } = await supabase
            .from("menu_items")
            .select("*, restaurants(name)")
            .eq("is_available", true)
            .order("rating", { ascending: false })
            .limit(6);

          const { data: restaurants } = await supabase
            .from("restaurants")
            .select("*")
            .order("rating", { ascending: false })
            .limit(4);

          setSuggestedItems(items || []);
          setSuggestedRestaurants(restaurants || []);
        } catch (error) {
          console.error("Error fetching suggestions:", error);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      if (keywords.length === 0) return;

      setIsLoading(true);
      try {
        // Search for menu items
        let itemsQuery = supabase
          .from("menu_items")
          .select("*, restaurants(name)")
          .eq("is_available", true);

        // Build search conditions for menu items
        // Try to match by name, category, description, or dietary preferences
        const itemConditions: string[] = [];
        keywords.forEach((kw) => {
          itemConditions.push(`name.ilike.%${kw}%`);
          itemConditions.push(`category.ilike.%${kw}%`);
          itemConditions.push(`description.ilike.%${kw}%`);
          
          // Handle dietary preferences
          if (kw === 'veg' || kw === 'vegetarian') {
            itemConditions.push(`is_vegetarian.eq.true`);
          }
          if (kw === 'non-veg' || kw === 'non vegetarian') {
            itemConditions.push(`is_vegetarian.eq.false`);
          }
        });

        const { data: items } = await itemsQuery
          .or(itemConditions.join(','))
          .limit(8);

        // Search for restaurants by name or cuisine
        const restaurantConditions: string[] = [];
        keywords.forEach((kw) => {
          restaurantConditions.push(`name.ilike.%${kw}%`);
          restaurantConditions.push(`cuisine.ilike.%${kw}%`);
        });

        const { data: restaurants } = await supabase
          .from("restaurants")
          .select("*")
          .or(restaurantConditions.join(','))
          .limit(4);

        setSuggestedItems(items || []);
        setSuggestedRestaurants(restaurants || []);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [keywords, messages.length]);

  const handleAddToCart = async (item: MenuItem) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Please login",
          description: "You need to be logged in to add items to cart",
          variant: "destructive",
        });
        return;
      }

      // Check if item already in cart
      const { data: existingItem } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("menu_item_id", item.id)
        .single();

      if (existingItem) {
        await supabase
          .from("cart")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
      } else {
        await supabase.from("cart").insert({
          user_id: session.user.id,
          menu_item_id: item.id,
          quantity: 1,
        });
      }

      toast({
        title: "Added to cart",
        description: `${item.name} has been added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  if (!isVisible) return null;

  // Mobile drawer variant - no outer container needed
  if (isMobileDrawer) {
    return (
      <div className="p-4 space-y-6">
        {/* Keywords */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize font-medium"
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-16 h-16 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Restaurants */}
        {!isLoading && suggestedRestaurants.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Store className="h-4 w-4" />
              Restaurants
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {suggestedRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="w-full h-20 rounded-lg bg-muted overflow-hidden mb-2">
                    {restaurant.image_url ? (
                      <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                        <Store className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{restaurant.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{restaurant.cuisine}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu Items */}
        {!isLoading && suggestedItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Menu Items
            </h4>
            <div className="space-y-3">
              {suggestedItems.map((item) => (
                <div key={item.id} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                        <UtensilsCrossed className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.restaurants?.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold text-primary">₹{item.price}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs hover:bg-primary hover:text-primary-foreground"
                        onClick={() => handleAddToCart(item)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && suggestedItems.length === 0 && suggestedRestaurants.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Start chatting to see suggestions</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hidden xl:flex flex-col w-80 border-l border-border bg-card/50">
      {/* Header */}
      <div className="p-4 border-b border-border sticky top-0 bg-card/95 backdrop-blur-md z-10">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Suggested for you
        </h3>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize font-medium animate-in fade-in-0 zoom-in-95"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Restaurants Section */}
          {!isLoading && suggestedRestaurants.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Store className="h-4 w-4" />
                Restaurants
              </h4>
              <div className="space-y-2">
                {suggestedRestaurants.map((restaurant) => (
                  <div
                    key={restaurant.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      if (onRestaurantClick) {
                        onRestaurantClick(restaurant);
                      }
                    }}
                  >
                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {restaurant.image_url ? (
                        <img
                          src={restaurant.image_url}
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{restaurant.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {restaurant.cuisine} • {restaurant.delivery_time}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Menu Items Section */}
          {!isLoading && suggestedItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Menu Items
              </h4>
              <div className="space-y-3">
                {suggestedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                          <UtensilsCrossed className="h-6 w-6 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.restaurants?.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-semibold text-primary">
                          ₹{item.price}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleAddToCart(item)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && suggestedItems.length === 0 && suggestedRestaurants.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Start chatting to see personalized suggestions
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
