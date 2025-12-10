// Memory management functions for stateful conversation

export interface UserMemory {
  preferences: Array<{ key: string; value: any }>;
  lastOrder: any | null;
  defaultAddress: string | null;
  cartState: any | null;
  restaurantPreferences: Array<{ restaurantId: string; restaurantName: string }>;
}

export async function getUserMemory(userId: string, supabase: any): Promise<UserMemory> {
  const { data, error } = await supabase
    .from('user_memory')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user memory:', error);
    return {
      preferences: [],
      lastOrder: null,
      defaultAddress: null,
      cartState: null,
      restaurantPreferences: [],
    };
  }

  const preferences = (data || [])
    .filter((m: any) => m.memory_type === 'preference')
    .map((m: any) => ({ key: m.memory_key, value: m.memory_value }));

  const lastOrder = (data || []).find((m: any) => m.memory_type === 'last_order')?.memory_value || null;

  const defaultAddress = (data || []).find((m: any) => m.memory_type === 'default_address')?.memory_value || null;

  const cartState = (data || []).find((m: any) => m.memory_type === 'cart_state')?.memory_value || null;

  const restaurantPreferences = (data || [])
    .filter((m: any) => m.memory_type === 'restaurant_preference')
    .map((m: any) => ({ restaurantId: m.memory_key, restaurantName: m.memory_value.name || m.memory_key }));

  return {
    preferences,
    lastOrder,
    defaultAddress,
    cartState,
    restaurantPreferences,
  };
}

export async function saveUserMemory(
  userId: string,
  type: string,
  key: string,
  value: any,
  supabase: any
): Promise<void> {
  const { error } = await supabase
    .from('user_memory')
    .upsert({
      user_id: userId,
      memory_type: type,
      memory_key: key,
      memory_value: value,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,memory_type,memory_key',
    });

  if (error) {
    console.error('Error saving user memory:', error);
    throw error;
  }
}

export async function clearUserMemory(userId: string, type: string, supabase: any): Promise<void> {
  const { error } = await supabase
    .from('user_memory')
    .delete()
    .eq('user_id', userId)
    .eq('memory_type', type);

  if (error) {
    console.error('Error clearing user memory:', error);
    throw error;
  }
}

