// Utility Agent
// Handles informational queries: comparisons, sorting, filtering, restaurant info

interface ComparisonResult {
  item1: any;
  item2: any;
  comparison: {
    priceWinner: string;
    ratingWinner: string;
    caloriesWinner?: string;
    summary: string;
  };
}

interface RestaurantInfo {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  isOpen: boolean;
  menuItemCount: number;
}

export async function compareItems(
  itemId1: string,
  itemId2: string,
  supabase: any
): Promise<ComparisonResult | null> {
  const { data: items } = await supabase
    .from('menu_items')
    .select('*, restaurants(name)')
    .in('id', [itemId1, itemId2]);

  if (!items || items.length !== 2) return null;

  const [item1, item2] = items;

  const priceWinner = item1.price < item2.price ? item1.name : item2.name;
  const ratingWinner = item1.rating > item2.rating ? item1.name : item2.name;
  const caloriesWinner = item1.calories && item2.calories
    ? (item1.calories < item2.calories ? item1.name : item2.name)
    : undefined;

  let summary = `**${item1.name}** (₹${item1.price}) vs **${item2.name}** (₹${item2.price})\n\n`;
  summary += `• Better Price: ${priceWinner}\n`;
  summary += `• Higher Rating: ${ratingWinner}\n`;
  if (caloriesWinner) {
    summary += `• Fewer Calories: ${caloriesWinner}\n`;
  }

  return {
    item1,
    item2,
    comparison: { priceWinner, ratingWinner, caloriesWinner, summary },
  };
}

export async function compareRestaurants(
  restaurantId1: string,
  restaurantId2: string,
  supabase: any
): Promise<string> {
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('*')
    .in('id', [restaurantId1, restaurantId2]);

  if (!restaurants || restaurants.length !== 2) {
    return "I couldn't find both restaurants to compare.";
  }

  const [r1, r2] = restaurants;

  let comparison = `**Comparing ${r1.name} vs ${r2.name}**\n\n`;
  comparison += `| Aspect | ${r1.name} | ${r2.name} |\n`;
  comparison += `|--------|----------|----------|\n`;
  comparison += `| Rating | ${r1.rating}⭐ | ${r2.rating}⭐ |\n`;
  comparison += `| Cuisine | ${r1.cuisine} | ${r2.cuisine} |\n`;
  comparison += `| Delivery Time | ${r1.delivery_time} | ${r2.delivery_time} |\n`;
  comparison += `| Delivery Fee | ₹${r1.delivery_fee} | ₹${r2.delivery_fee} |\n`;
  comparison += `| Min Order | ₹${r1.min_order} | ₹${r2.min_order} |\n`;

  // Determine winner
  const r1Score = r1.rating * 20 - r1.delivery_fee;
  const r2Score = r2.rating * 20 - r2.delivery_fee;
  const winner = r1Score > r2Score ? r1.name : r2.name;

  comparison += `\n**Recommendation**: ${winner} offers better overall value!`;

  return comparison;
}

export async function getRestaurantInfo(
  restaurantId: string,
  supabase: any
): Promise<RestaurantInfo | null> {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) return null;

  // Get menu item count
  const { count } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true);

  return {
    id: restaurant.id,
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    rating: restaurant.rating,
    deliveryTime: restaurant.delivery_time,
    deliveryFee: restaurant.delivery_fee,
    minOrder: restaurant.min_order,
    isOpen: true, // Would need operating hours table for real implementation
    menuItemCount: count || 0,
  };
}

export async function sortMenuItems(
  restaurantId: string | null,
  sortBy: 'price' | 'rating' | 'calories' | 'name',
  ascending: boolean,
  supabase: any,
  limit: number = 20
): Promise<any[]> {
  let query = supabase
    .from('menu_items')
    .select('*, restaurants(name)')
    .eq('is_available', true);

  if (restaurantId) {
    query = query.eq('restaurant_id', restaurantId);
  }

  // Sort
  query = query.order(sortBy, { ascending });
  query = query.limit(limit);

  const { data } = await query;
  return data || [];
}

export async function filterMenuItems(
  filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    isVegetarian?: boolean;
    minRating?: number;
    maxCalories?: number;
    spiceLevel?: number;
    restaurantId?: string;
    cuisine?: string;
  },
  supabase: any,
  limit: number = 20
): Promise<any[]> {
  let query = supabase
    .from('menu_items')
    .select('*, restaurants(name, cuisine)')
    .eq('is_available', true);

  if (filters.restaurantId) {
    query = query.eq('restaurant_id', filters.restaurantId);
  }

  if (filters.category) {
    query = query.ilike('category', `%${filters.category}%`);
  }

  if (filters.minPrice !== undefined) {
    query = query.gte('price', filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    query = query.lte('price', filters.maxPrice);
  }

  if (filters.isVegetarian !== undefined) {
    query = query.eq('is_vegetarian', filters.isVegetarian);
  }

  if (filters.minRating !== undefined) {
    query = query.gte('rating', filters.minRating);
  }

  if (filters.maxCalories !== undefined && filters.maxCalories > 0) {
    query = query.lte('calories', filters.maxCalories);
  }

  if (filters.spiceLevel !== undefined) {
    query = query.lte('spice_level', filters.spiceLevel);
  }

  if (filters.cuisine) {
    query = query.eq('restaurants.cuisine', filters.cuisine);
  }

  query = query.limit(limit);

  const { data } = await query;
  return data || [];
}

export async function getNutritionInfo(menuItemId: string, supabase: any): Promise<string> {
  const { data: item } = await supabase
    .from('menu_items')
    .select('name, calories, protein, carbs, fat, allergens, ingredients, is_vegetarian')
    .eq('id', menuItemId)
    .single();

  if (!item) {
    return "I couldn't find nutritional information for this item.";
  }

  let info = `**Nutritional Information for ${item.name}**\n\n`;

  if (item.calories || item.protein || item.carbs || item.fat) {
    info += `📊 **Nutrition Facts**\n`;
    if (item.calories) info += `• Calories: ${item.calories} kcal\n`;
    if (item.protein) info += `• Protein: ${item.protein}g\n`;
    if (item.carbs) info += `• Carbs: ${item.carbs}g\n`;
    if (item.fat) info += `• Fat: ${item.fat}g\n`;
  }

  if (item.is_vegetarian) {
    info += `\n🥬 **Vegetarian**: Yes\n`;
  }

  if (item.allergens?.length > 0) {
    info += `\n⚠️ **Allergens**: ${item.allergens.join(', ')}\n`;
  }

  if (item.ingredients?.length > 0) {
    info += `\n🧾 **Ingredients**: ${item.ingredients.join(', ')}\n`;
  }

  if (!item.calories && !item.protein && !item.allergens?.length && !item.ingredients?.length) {
    info = `Detailed nutritional information for ${item.name} is not available yet.`;
  }

  return info;
}

export async function findCheapestItem(
  category: string | null,
  restaurantId: string | null,
  supabase: any
): Promise<any | null> {
  let query = supabase
    .from('menu_items')
    .select('*, restaurants(name)')
    .eq('is_available', true)
    .order('price', { ascending: true })
    .limit(1);

  if (category) {
    query = query.ilike('category', `%${category}%`);
  }

  if (restaurantId) {
    query = query.eq('restaurant_id', restaurantId);
  }

  const { data } = await query;
  return data?.[0] || null;
}

export async function findHighestRated(
  category: string | null,
  restaurantId: string | null,
  supabase: any,
  limit: number = 5
): Promise<any[]> {
  let query = supabase
    .from('menu_items')
    .select('*, restaurants(name)')
    .eq('is_available', true)
    .order('rating', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.ilike('category', `%${category}%`);
  }

  if (restaurantId) {
    query = query.eq('restaurant_id', restaurantId);
  }

  const { data } = await query;
  return data || [];
}
