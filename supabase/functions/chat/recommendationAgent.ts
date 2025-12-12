// Recommendation Agent
// Generates personalized food recommendations based on taste profile, context, and history

import { getTasteProfile, getUsuals, getDietaryRestrictions, getAllergens } from './profileAgent.ts';

interface RecommendationOptions {
  budget?: number;
  cuisine?: string;
  spiceLevel?: number;
  category?: string;
  isVegetarian?: boolean;
  isHealthy?: boolean;
  mealTime?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  limit?: number;
  excludeAllergens?: boolean;
}

interface RecommendedItem {
  id: string;
  name: string;
  description: string;
  price: number;
  restaurantId: string;
  restaurantName: string;
  category: string;
  rating: number;
  isVegetarian: boolean;
  spiceLevel?: number;
  calories?: number;
  matchScore: number;
  matchReason: string;
}

export async function getPersonalizedRecommendations(
  userId: string,
  options: RecommendationOptions,
  supabase: any
): Promise<RecommendedItem[]> {
  const profile = await getTasteProfile(userId, supabase);
  const allergens = options.excludeAllergens !== false ? await getAllergens(userId, supabase) : [];
  const dietary = await getDietaryRestrictions(userId, supabase);

  // Build dynamic query
  let query = supabase
    .from('menu_items')
    .select('*, restaurants(id, name, cuisine, rating)')
    .eq('is_available', true);

  // Apply budget filter
  if (options.budget) {
    query = query.lte('price', options.budget);
  }

  // Apply category filter
  if (options.category) {
    query = query.ilike('category', `%${options.category}%`);
  }

  // Apply vegetarian filter
  if (options.isVegetarian || dietary.includes('vegetarian')) {
    query = query.eq('is_vegetarian', true);
  }

  // Apply spice level filter
  if (options.spiceLevel) {
    query = query.lte('spice_level', options.spiceLevel);
  }

  // Limit results
  query = query.limit(options.limit || 20);

  const { data: items, error } = await query;

  if (error || !items) {
    console.error('Error fetching recommendations:', error);
    return [];
  }

  // Score and filter items
  const scoredItems: RecommendedItem[] = items
    .filter((item: any) => {
      // Filter out items with user allergens
      if (allergens.length > 0 && item.allergens) {
        const hasAllergen = item.allergens.some((a: string) => 
          allergens.some(ua => a.toLowerCase().includes(ua.toLowerCase()))
        );
        if (hasAllergen) return false;
      }
      return true;
    })
    .map((item: any) => {
      let score = 50; // Base score
      let reasons: string[] = [];

      // Cuisine preference match
      if (profile.cuisinePreferences.includes(item.restaurants?.cuisine)) {
        score += 20;
        reasons.push('matches your cuisine preference');
      }

      // Category preference match
      if (profile.favoriteCategories.includes(item.category)) {
        score += 15;
        reasons.push('popular category for you');
      }

      // Rating boost
      if (item.rating >= 4.5) {
        score += 15;
        reasons.push('highly rated');
      } else if (item.rating >= 4.0) {
        score += 10;
      }

      // Price within comfortable range
      if (item.price <= profile.priceRange.max * 0.7) {
        score += 5;
        reasons.push('good value');
      }

      // Spice level match
      if (item.spice_level) {
        const spiceDiff = Math.abs(item.spice_level - profile.spiceLevel);
        if (spiceDiff <= 1) {
          score += 10;
          reasons.push('matches your spice preference');
        }
      }

      // Health boost if requested
      if (options.isHealthy && item.calories && item.calories < 500) {
        score += 10;
        reasons.push('healthy option');
      }

      return {
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        restaurantId: item.restaurant_id,
        restaurantName: item.restaurants?.name || 'Unknown',
        category: item.category || 'Other',
        rating: item.rating || 4.0,
        isVegetarian: item.is_vegetarian || false,
        spiceLevel: item.spice_level,
        calories: item.calories,
        matchScore: Math.min(score, 100),
        matchReason: reasons.length > 0 ? reasons.join(', ') : 'popular choice',
      };
    });

  // Sort by score and return
  return scoredItems
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, options.limit || 10);
}

export async function getTrendingItems(supabase: any, limit: number = 10): Promise<RecommendedItem[]> {
  // Get most ordered items in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('menu_item_id, menu_items(*, restaurants(name))')
    .gte('created_at', sevenDaysAgo.toISOString())
    .limit(200);

  if (!orderItems) return [];

  // Count orders per item
  const itemCounts = new Map<string, { item: any; count: number }>();
  for (const oi of orderItems) {
    const key = oi.menu_item_id;
    if (oi.menu_items) {
      if (itemCounts.has(key)) {
        itemCounts.get(key)!.count++;
      } else {
        itemCounts.set(key, { item: oi.menu_items, count: 1 });
      }
    }
  }

  return Array.from(itemCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ item, count }) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      restaurantId: item.restaurant_id,
      restaurantName: item.restaurants?.name || 'Unknown',
      category: item.category || 'Other',
      rating: item.rating || 4.0,
      isVegetarian: item.is_vegetarian || false,
      spiceLevel: item.spice_level,
      calories: item.calories,
      matchScore: 80 + Math.min(count, 20),
      matchReason: `ordered ${count} times this week`,
    }));
}

export async function getSimilarItems(
  menuItemId: string,
  supabase: any,
  limit: number = 5
): Promise<RecommendedItem[]> {
  // Get the reference item
  const { data: refItem } = await supabase
    .from('menu_items')
    .select('*, restaurants(name, cuisine)')
    .eq('id', menuItemId)
    .single();

  if (!refItem) return [];

  // Find similar items by category and price range
  const priceRange = refItem.price * 0.3;
  const { data: similar } = await supabase
    .from('menu_items')
    .select('*, restaurants(name, cuisine)')
    .eq('category', refItem.category)
    .eq('is_available', true)
    .neq('id', menuItemId)
    .gte('price', refItem.price - priceRange)
    .lte('price', refItem.price + priceRange)
    .limit(limit * 2);

  if (!similar) return [];

  return similar
    .slice(0, limit)
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      restaurantId: item.restaurant_id,
      restaurantName: item.restaurants?.name || 'Unknown',
      category: item.category || 'Other',
      rating: item.rating || 4.0,
      isVegetarian: item.is_vegetarian || false,
      spiceLevel: item.spice_level,
      calories: item.calories,
      matchScore: 75,
      matchReason: `similar to ${refItem.name}`,
    }));
}

export async function getComboSuggestions(
  cartItems: any[],
  supabase: any
): Promise<{ drink?: RecommendedItem; side?: RecommendedItem; dessert?: RecommendedItem }> {
  const suggestions: { drink?: RecommendedItem; side?: RecommendedItem; dessert?: RecommendedItem } = {};

  // Check what's already in cart
  const hasMain = cartItems.some((i: any) => 
    ['Biryani', 'Pizza', 'Burger', 'Main Course'].includes(i.category)
  );
  const hasDrink = cartItems.some((i: any) => i.category === 'Beverages');
  const hasDessert = cartItems.some((i: any) => i.category === 'Desserts');

  if (hasMain && !hasDrink) {
    const { data: drinks } = await supabase
      .from('menu_items')
      .select('*, restaurants(name)')
      .eq('category', 'Beverages')
      .eq('is_available', true)
      .order('rating', { ascending: false })
      .limit(1);

    if (drinks?.[0]) {
      suggestions.drink = {
        id: drinks[0].id,
        name: drinks[0].name,
        description: drinks[0].description || '',
        price: drinks[0].price,
        restaurantId: drinks[0].restaurant_id,
        restaurantName: drinks[0].restaurants?.name || '',
        category: 'Beverages',
        rating: drinks[0].rating || 4.0,
        isVegetarian: true,
        matchScore: 70,
        matchReason: 'perfect pairing with your meal',
      };
    }
  }

  if (hasMain && !hasDessert) {
    const { data: desserts } = await supabase
      .from('menu_items')
      .select('*, restaurants(name)')
      .eq('category', 'Desserts')
      .eq('is_available', true)
      .order('rating', { ascending: false })
      .limit(1);

    if (desserts?.[0]) {
      suggestions.dessert = {
        id: desserts[0].id,
        name: desserts[0].name,
        description: desserts[0].description || '',
        price: desserts[0].price,
        restaurantId: desserts[0].restaurant_id,
        restaurantName: desserts[0].restaurants?.name || '',
        category: 'Desserts',
        rating: desserts[0].rating || 4.0,
        isVegetarian: desserts[0].is_vegetarian || false,
        matchScore: 65,
        matchReason: 'sweet ending to your meal',
      };
    }
  }

  return suggestions;
}
