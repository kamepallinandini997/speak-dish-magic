// Profile & Taste Modeling Agent
// Builds personal taste models, manages "Usuals", tracks preferences

interface UserTasteProfile {
  spiceLevel: number; // 1-5
  cuisinePreferences: string[];
  dietaryRestrictions: string[];
  allergens: string[];
  priceRange: { min: number; max: number };
  favoriteCategories: string[];
  mealTimePreferences: Record<string, string[]>;
}

interface Usual {
  menuItemId: string;
  itemName: string;
  restaurantId: string;
  restaurantName: string;
  orderCount: number;
  lastOrderedAt: string;
}

export async function getUsuals(userId: string, supabase: any, limit: number = 5): Promise<Usual[]> {
  // Get most ordered items from order history
  const { data: orderItems, error } = await supabase
    .from('order_items')
    .select(`
      menu_item_id,
      item_name,
      orders!inner(user_id, restaurant_id, restaurants(name))
    `)
    .eq('orders.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !orderItems) {
    console.error('Error fetching usuals:', error);
    return [];
  }

  // Count occurrences
  const itemCounts = new Map<string, Usual>();
  for (const item of orderItems) {
    const key = item.menu_item_id;
    if (itemCounts.has(key)) {
      const existing = itemCounts.get(key)!;
      existing.orderCount++;
    } else {
      itemCounts.set(key, {
        menuItemId: item.menu_item_id,
        itemName: item.item_name,
        restaurantId: item.orders?.restaurant_id || '',
        restaurantName: item.orders?.restaurants?.name || 'Unknown',
        orderCount: 1,
        lastOrderedAt: new Date().toISOString(),
      });
    }
  }

  // Sort by order count and return top N
  return Array.from(itemCounts.values())
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, limit);
}

export async function getTasteProfile(userId: string, supabase: any): Promise<UserTasteProfile> {
  // Fetch stored preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId);

  const profile: UserTasteProfile = {
    spiceLevel: 3,
    cuisinePreferences: [],
    dietaryRestrictions: [],
    allergens: [],
    priceRange: { min: 0, max: 1000 },
    favoriteCategories: [],
    mealTimePreferences: {},
  };

  if (preferences) {
    for (const pref of preferences) {
      switch (pref.preference_type) {
        case 'spice_level':
          profile.spiceLevel = pref.preference_value?.level || 3;
          break;
        case 'cuisine':
          profile.cuisinePreferences.push(pref.preference_key);
          break;
        case 'diet':
          profile.dietaryRestrictions.push(pref.preference_key);
          break;
        case 'allergen':
          profile.allergens.push(pref.preference_key);
          break;
        case 'price_range':
          profile.priceRange = pref.preference_value || { min: 0, max: 1000 };
          break;
        case 'category':
          profile.favoriteCategories.push(pref.preference_key);
          break;
      }
    }
  }

  // Infer from order history if no explicit preferences
  if (profile.cuisinePreferences.length === 0) {
    const inferred = await inferPreferencesFromHistory(userId, supabase);
    profile.cuisinePreferences = inferred.cuisines;
    profile.favoriteCategories = inferred.categories;
  }

  return profile;
}

async function inferPreferencesFromHistory(userId: string, supabase: any): Promise<{
  cuisines: string[];
  categories: string[];
}> {
  const { data: orders } = await supabase
    .from('orders')
    .select('restaurant_id, restaurants(cuisine)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const cuisineCounts = new Map<string, number>();
  if (orders) {
    for (const order of orders) {
      const cuisine = order.restaurants?.cuisine;
      if (cuisine) {
        cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) || 0) + 1);
      }
    }
  }

  // Get top 3 cuisines
  const topCuisines = Array.from(cuisineCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cuisine]) => cuisine);

  // Get frequent categories from order items
  const { data: items } = await supabase
    .from('order_items')
    .select('menu_items(category)')
    .eq('orders.user_id', userId)
    .limit(50);

  const categoryCounts = new Map<string, number>();
  if (items) {
    for (const item of items) {
      const category = item.menu_items?.category;
      if (category) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    }
  }

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  return { cuisines: topCuisines, categories: topCategories };
}

export async function savePreference(
  userId: string,
  type: string,
  key: string,
  value: any,
  supabase: any
): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      preference_type: type,
      preference_key: key,
      preference_value: value,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,preference_type,preference_key',
    });

  if (error) {
    console.error('Error saving preference:', error);
  }
}

export async function getDietaryRestrictions(userId: string, supabase: any): Promise<string[]> {
  const { data } = await supabase
    .from('user_preferences')
    .select('preference_key')
    .eq('user_id', userId)
    .eq('preference_type', 'diet');

  return data?.map((d: any) => d.preference_key) || [];
}

export async function getAllergens(userId: string, supabase: any): Promise<string[]> {
  const { data } = await supabase
    .from('user_preferences')
    .select('preference_key')
    .eq('user_id', userId)
    .eq('preference_type', 'allergen');

  return data?.map((d: any) => d.preference_key) || [];
}
