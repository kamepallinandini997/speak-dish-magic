// Multi-agent system for intelligent chat orchestration

interface Message {
  role: string;
  content: string;
}

interface IntentResult {
  intent: 'order' | 'query' | 'track' | 'cart' | 'wishlist' | 'conversation' | 'clarify';
  confidence: number;
  entities: {
    restaurant?: string;
    restaurantId?: string;
    items?: Array<{ name: string; quantity?: number }>;
    orderId?: string;
    action?: 'add' | 'remove' | 'update' | 'view' | 'clear';
    menuItemId?: string;
    quantity?: number;
  };
}

// Intent Router Agent
export function intentRouter(userMessage: string, conversationHistory: Message[]): IntentResult {
  const lowerMessage = userMessage.toLowerCase();

  // Order intent
  if (lowerMessage.match(/(order|buy|purchase|place.*order|i want|i'd like|add.*to.*cart)/)) {
    const entities = extractOrderEntities(userMessage, conversationHistory);
    return { intent: 'order', confidence: 0.9, entities };
  }

  // Track intent
  if (lowerMessage.match(/(track|where.*order|status|delivery|my order|order status)/)) {
    const orderId = extractOrderId(userMessage, conversationHistory);
    return { intent: 'track', confidence: 0.9, entities: { orderId } };
  }

  // Cart intent
  if (lowerMessage.match(/(cart|basket|show.*cart|view.*cart|my cart|what.*in.*cart)/)) {
    const action = extractCartAction(userMessage);
    return { intent: 'cart', confidence: 0.9, entities: { action } };
  }

  // Wishlist intent
  if (lowerMessage.match(/(wishlist|save.*wishlist|add.*wishlist|my wishlist|show.*wishlist)/)) {
    const action = extractWishlistAction(userMessage);
    return { intent: 'wishlist', confidence: 0.8, entities: { action } };
  }

  // Query intent (restaurant/menu questions)
  if (lowerMessage.match(/(what|which|where|how|tell.*about|show.*menu|menu|restaurant|cuisine)/)) {
    return { intent: 'query', confidence: 0.8, entities: {} };
  }

  // Clarify intent (incomplete information)
  if (isIncomplete(userMessage, conversationHistory)) {
    return { intent: 'clarify', confidence: 0.7, entities: {} };
  }

  return { intent: 'conversation', confidence: 0.5, entities: {} };
}

// Entity extraction functions
function extractOrderEntities(message: string, history: Message[]): IntentResult['entities'] {
  const lowerMessage = message.toLowerCase();
  const entities: IntentResult['entities'] = { items: [] };

  // Extract restaurant names - improved matching
  // Try to extract restaurant name from common patterns
  // Look for "from [restaurant]" or "at [restaurant]" or "[restaurant]"
  const restaurantPatterns = [
    /(?:from|at|of|in)\s+([A-Za-z0-9\s'&-]+?)(?:\s+menu|\s+restaurant|$|,|\.)/i,
    /(?:show|get|order|want).*?(?:from|at|of)\s+([A-Za-z0-9\s'&-]+?)(?:\s+menu|\s+restaurant|$|,|\.)/i,
    /([A-Za-z0-9\s'&-]+?)\s+(?:restaurant|hotel|cafe|palace|biryani|pizza)/i,
  ];
  
  // Try to match restaurant patterns
  for (const pattern of restaurantPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const restaurantName = match[1].trim();
      // Only use if it's a reasonable length (not too short)
      if (restaurantName.length > 2) {
        entities.restaurant = restaurantName.toLowerCase();
        break;
      }
    }
  }
  
  // Fallback: try common restaurant keywords and partial matches
  if (!entities.restaurant) {
    const restaurantKeywords = [
      'paradise', 'biryani', 'dominos', 'domino', 'subway', 'kfc', 'kentucky',
      'sushi', 'shadab', 'bawarchi', 'meghana', 'absolute', 'barbecue', 'ulavacharu',
      "ab's", "abs", "absolute barbecue", "ab absolute"
    ];
    for (const keyword of restaurantKeywords) {
      if (lowerMessage.includes(keyword)) {
        // For "AB's Absolute Barbecue", extract more context
        if (keyword.includes('absolute') || keyword.includes('barbecue') || keyword.includes("ab's")) {
          // Try to extract the full restaurant name from message
          const fullMatch = message.match(/(?:from|at|of|show.*?from|menu.*?from)\s+([A-Za-z0-9\s'&-]+?)(?:\s+menu|\s+restaurant|$|,|\.)/i);
          if (fullMatch && fullMatch[1]) {
            entities.restaurant = fullMatch[1].trim().toLowerCase();
            break;
          }
        }
        entities.restaurant = keyword;
        break;
      }
    }
  }
  
  // Special handling for "AB's Absolute Barbecue" variations
  if (lowerMessage.includes("ab's") || lowerMessage.includes("abs absolute") || 
      (lowerMessage.includes("absolute") && lowerMessage.includes("barbecue"))) {
    // Try to get the full name from the message
    const abMatch = message.match(/(?:from|at|of|show.*?from|menu.*?from)\s+([A-Za-z0-9\s'&-]*absolute[A-Za-z0-9\s'&-]*barbecue[A-Za-z0-9\s'&-]*)/i);
    if (abMatch && abMatch[1]) {
      entities.restaurant = abMatch[1].trim().toLowerCase();
    } else if (!entities.restaurant) {
      // Fallback: use "absolute barbecue" as search term
      entities.restaurant = "absolute barbecue";
    }
  }

  // Extract items and quantities
  const itemPatterns = [
    /(\d+)\s*(?:x|times)?\s*(biryani|pizza|burger|sub|chicken|sushi|roll)/gi,
    /(biryani|pizza|burger|sub|chicken|sushi|roll).*?(\d+)/gi,
  ];

  for (const pattern of itemPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      const quantity = parseInt(match[1] || match[2]) || 1;
      const itemName = match[2] || match[1];
      entities.items?.push({ name: itemName, quantity });
    }
  }

  // If no quantity found, try to extract item names
  if (!entities.items || entities.items.length === 0) {
    const itemKeywords = ['biryani', 'pizza', 'burger', 'sub', 'chicken', 'sushi', 'roll', 'mutton', 'veg'];
    for (const keyword of itemKeywords) {
      if (lowerMessage.includes(keyword)) {
        entities.items?.push({ name: keyword });
      }
    }
  }

  return entities;
}

function extractOrderId(message: string, history: Message[]): string | undefined {
  // Try to extract order ID from message
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = message.match(uuidPattern);
  if (match) return match[0];

  // Check history for order mentions
  for (const msg of history.reverse()) {
    if (msg.role === 'assistant' && msg.content.includes('Order #')) {
      const orderMatch = msg.content.match(/Order #([a-f0-9]+)/i);
      if (orderMatch) return orderMatch[1];
    }
  }

  return undefined; // Will fetch latest order
}

function extractCartAction(message: string): 'add' | 'remove' | 'update' | 'view' | 'clear' {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.match(/(add|put|insert)/)) return 'add';
  if (lowerMessage.match(/(remove|delete|take.*out)/)) return 'remove';
  if (lowerMessage.match(/(update|change|modify)/)) return 'update';
  if (lowerMessage.match(/(clear|empty)/)) return 'clear';
  return 'view';
}

function extractWishlistAction(message: string): 'add' | 'remove' | 'view' {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.match(/(add|save)/)) return 'add';
  if (lowerMessage.match(/(remove|delete)/)) return 'remove';
  return 'view';
}

function isIncomplete(message: string, history: Message[]): boolean {
  return clarifierAgent(message, history).length > 0;
}

// Clarifier Agent
export function clarifierAgent(userMessage: string, conversationHistory: Message[]): string[] {
  const questions: string[] = [];
  const lowerMessage = userMessage.toLowerCase();

  // Check for incomplete restaurant mention
  if (lowerMessage.match(/(order|want|like|i'd like).*(from|at)/) &&
      !extractOrderEntities(userMessage, conversationHistory).restaurant) {
    questions.push("Which restaurant would you like to order from?");
  }

  // Check for incomplete item mention
  if (lowerMessage.match(/(want|order|add|i'd like).*(item|dish|food|something)/) &&
      (!extractOrderEntities(userMessage, conversationHistory).items ||
       extractOrderEntities(userMessage, conversationHistory).items?.length === 0)) {
    questions.push("What item would you like to order?");
  }

  // Check for missing quantity
  const entities = extractOrderEntities(userMessage, conversationHistory);
  if (entities.items && entities.items.length > 0) {
    const missingQuantity = entities.items.some(item => !item.quantity);
    if (missingQuantity) {
      questions.push("How many would you like?");
    }
  }

  return questions;
}

// Query Agent
export async function queryAgent(query: string, userId: string, supabase: any): Promise<any> {
  const lowerQuery = query.toLowerCase();

  // Search restaurants
  if (lowerQuery.match(/(restaurant|cuisine|place|where)/)) {
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('*')
      .order('rating', { ascending: false })
      .limit(10);

    return { type: 'restaurants', data: restaurants || [] };
  }

  // Search menu items
  if (lowerQuery.match(/(menu|item|dish|food|what.*available)/)) {
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('*, restaurants(name, cuisine)')
      .eq('is_available', true)
      .order('rating', { ascending: false })
      .limit(20);

    return { type: 'menu_items', data: menuItems || [] };
  }

  return { type: 'general', data: null };
}

// Data Fetch Agent
export async function dataFetchAgent(
  intent: string,
  entities: IntentResult['entities'],
  userId: string,
  supabase: any
): Promise<any> {
  switch (intent) {
    case 'order':
      if (entities.restaurant) {
        // Find restaurant by name (improved fuzzy match)
        // Try exact match first, then partial match
        let restaurants: any[] = [];
        
        // First try: exact match (case insensitive)
        const { data: exactMatch } = await supabase
          .from('restaurants')
          .select('*')
          .ilike('name', entities.restaurant)
          .limit(1);
        
        if (exactMatch && exactMatch.length > 0) {
          restaurants = exactMatch;
        } else {
          // Second try: partial match with cleaned name
          const cleanedName = entities.restaurant
            .replace(/['"]/g, '') // Remove apostrophes and quotes
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
          
          // Try multiple search strategies
          const searchTerms = [
            cleanedName, // Full cleaned name
            ...cleanedName.split(/\s+/).filter(w => w.length > 2), // Individual words
          ];
          
          let bestMatch: any = null;
          let bestScore = 0;
          
          for (const term of searchTerms) {
            const { data: partialMatch } = await supabase
              .from('restaurants')
              .select('*')
              .ilike('name', `%${term}%`)
              .limit(10);
            
            if (partialMatch && partialMatch.length > 0) {
              // Score each match
              for (const restaurant of partialMatch) {
                const restaurantNameLower = restaurant.name.toLowerCase();
                const searchLower = cleanedName.toLowerCase();
                
                // Calculate match score
                let score = 0;
                if (restaurantNameLower.includes(searchLower)) {
                  score += 10; // Full match bonus
                }
                
                // Word-by-word matching
                const searchWords = searchLower.split(/\s+/).filter(w => w.length > 2);
                const restaurantWords = restaurantNameLower.split(/\s+/);
                const matchedWords = searchWords.filter((sw: string) => 
                  restaurantWords.some((rw: string) => rw.includes(sw) || sw.includes(rw))
                ).length;
                score += matchedWords * 2;
                
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = restaurant;
                }
              }
            }
          }
          
          if (bestMatch) {
            restaurants = [bestMatch];
          }
        }
        
        if (restaurants && restaurants.length > 0) {
          const restaurant = restaurants[0];
          const restaurantId = restaurant.id;
          
          // Check if restaurant has menu items
          const { data: menuItems } = await supabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_available', true);

          return { 
            restaurant, 
            menuItems: menuItems || [],
            hasMenu: (menuItems && menuItems.length > 0)
          };
        } else {
          // Restaurant not found in database
          return { 
            restaurant: null, 
            menuItems: [],
            restaurantName: entities.restaurant,
            notFound: true
          };
        }
      } else {
        // No restaurant specified
        return { restaurant: null, menuItems: [] };
      }

    case 'track':
      return null; // Handled by deliveryAgent

    case 'cart':
      const { data: cartItems } = await supabase
        .from('cart')
        .select('*, menu_items(*, restaurants(name))')
        .eq('user_id', userId);

      return cartItems || [];

    case 'wishlist':
      const { data: wishlistItems } = await supabase
        .from('wishlist')
        .select('*, menu_items(*, restaurants(name))')
        .eq('user_id', userId);

      return wishlistItems || [];

    default:
      return null;
  }
}

// Order Agent
export async function orderAgent(
  action: string,
  data: any,
  userId: string,
  supabase: any
): Promise<{ message: string; requiresPayment?: boolean; orderData?: any }> {
  switch (action) {
    case 'add_to_cart':
      const { menuItemId, quantity, itemName } = data;
      const { data: existing } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', userId)
        .eq('menu_item_id', menuItemId)
        .single();

      if (existing) {
        await supabase
          .from('cart')
          .update({ quantity: existing.quantity + (quantity || 1) })
          .eq('id', existing.id);
      } else {
        await supabase.from('cart').insert({
          user_id: userId,
          menu_item_id: menuItemId,
          quantity: quantity || 1,
        });
      }
      return { message: `Added ${quantity || 1}x ${itemName} to your cart.` };

    case 'place_order':
      const { restaurantId, items, deliveryAddress, paymentMethod } = data;
      const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          total_amount: totalAmount,
          status: 'pending',
          delivery_address: deliveryAddress,
          payment_method: paymentMethod || 'pin',
        })
        .select()
        .single();

      if (orderError) {
        return { message: `Error placing order: ${orderError.message}` };
      }

      // Create order items
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        item_name: item.name,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        return { message: `Error creating order items: ${itemsError.message}` };
      }

      // Clear cart
      await supabase.from('cart').delete().eq('user_id', userId);

      // Save to memory
      const { saveUserMemory } = await import('./memory.ts');
      await saveUserMemory(userId, 'last_order', 'latest', {
        restaurantId,
        items,
        totalAmount,
        orderId: order.id,
      }, supabase);

      // Only confirm order if we have a valid order ID from backend
      if (!order || !order.id) {
        return { 
          message: 'Order placement failed. Please try again.',
        };
      }

      return {
        message: `Order placed successfully! Order #${order.id.slice(0, 8)}. You can track your order anytime by asking "Where is my order?"`,
        requiresPayment: false,
        orderData: { ...order, orderId: order.id },
      };

    default:
      return { message: 'Unknown order action' };
  }
}

// Cart Agent
export async function cartAgent(
  action: string,
  data: any,
  userId: string,
  supabase: any
): Promise<string> {
  switch (action) {
    case 'add':
      const { menuItemId, quantity, itemName } = data;
      const { data: existing } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', userId)
        .eq('menu_item_id', menuItemId)
        .single();

      if (existing) {
        await supabase
          .from('cart')
          .update({ quantity: existing.quantity + (quantity || 1) })
          .eq('id', existing.id);
      } else {
        await supabase.from('cart').insert({
          user_id: userId,
          menu_item_id: menuItemId,
          quantity: quantity || 1,
        });
      }
      return `Added ${quantity || 1}x ${itemName} to your cart.`;

    case 'update':
      if (data.quantity === 0) {
        await supabase.from('cart').delete().eq('id', data.cartId);
        return 'Removed item from cart.';
      } else {
        await supabase
          .from('cart')
          .update({ quantity: data.quantity })
          .eq('id', data.cartId);
        return 'Updated cart item quantity.';
      }

    case 'remove':
      await supabase.from('cart').delete().eq('id', data.cartId);
      return 'Removed item from cart.';

    case 'clear':
      await supabase.from('cart').delete().eq('user_id', userId);
      return 'Cart cleared.';

    case 'view':
      const { data: cartItems } = await supabase
        .from('cart')
        .select('*, menu_items(name, price, restaurants(name))')
        .eq('user_id', userId);

      if (!cartItems || cartItems.length === 0) {
        return 'Your cart is empty.';
      }

      const total = cartItems.reduce(
        (sum: number, item: any) => sum + (item.menu_items.price * item.quantity),
        0
      );

      const itemsList = cartItems
        .map(
          (item: any) =>
            `${item.quantity}x ${item.menu_items.name} - ₹${item.menu_items.price * item.quantity}`
        )
        .join('\n');

      return `Your cart:\n${itemsList}\n\nTotal: ₹${total}`;

    default:
      return 'Unknown cart action.';
  }
}

// Wishlist Agent
export async function wishlistAgent(
  action: string,
  data: any,
  userId: string,
  supabase: any
): Promise<string> {
  switch (action) {
    case 'add':
      const { menuItemId, itemName } = data;
      const { error: insertError } = await supabase.from('wishlist').insert({
        user_id: userId,
        menu_item_id: menuItemId,
      });

      if (insertError && insertError.code !== '23505') {
        // Ignore duplicate key errors
        return `Error adding to wishlist: ${insertError.message}`;
      }
      return `Added ${itemName} to your wishlist.`;

    case 'remove':
      await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('menu_item_id', data.menuItemId);
      return 'Removed from wishlist.';

    case 'view':
      const { data: wishlistItems } = await supabase
        .from('wishlist')
        .select('*, menu_items(name, price, restaurants(name))')
        .eq('user_id', userId);

      if (!wishlistItems || wishlistItems.length === 0) {
        return 'Your wishlist is empty.';
      }

      const itemsList = wishlistItems
        .map(
          (item: any) =>
            `${item.menu_items.name} - ₹${item.menu_items.price} (${item.menu_items.restaurants?.name || 'Unknown'})`
        )
        .join('\n');

      return `Your wishlist:\n${itemsList}`;

    default:
      return 'Unknown wishlist action.';
  }
}

// Delivery Agent
export async function deliveryAgent(
  orderId: string | null | undefined,
  userId: string,
  supabase: any
): Promise<string> {
  let order: any;

  if (!orderId) {
    // Get latest order
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!orders || orders.length === 0) {
      return "You don't have any recent orders.";
    }
    order = orders[0];
  } else {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (!orderData) {
      return 'Order not found.';
    }
    order = orderData;
  }

  return formatOrderStatus(order);
}

function formatOrderStatus(order: any): string {
  const statusMessages: Record<string, string> = {
    pending: 'Your order is being confirmed by the restaurant.',
    accepted: 'Your order has been accepted and is being prepared.',
    preparing: 'Your order is being prepared. It should be ready soon!',
    out_for_delivery: 'Your order is out for delivery and will arrive shortly.',
    delivered: 'Your order has been delivered. Enjoy your meal!',
    cancelled: 'Your order has been cancelled.',
  };

  const items = order.order_items
    ? order.order_items
        .map((oi: any) => `${oi.quantity}x ${oi.item_name || oi.menu_items?.name || 'Item'}`)
        .join(', ')
    : 'N/A';

  return `Order #${order.id.slice(0, 8)}
Status: ${statusMessages[order.status] || order.status}
Items: ${items}
Total: ₹${order.total_amount}
${order.delivery_address ? `Address: ${order.delivery_address}` : ''}`.trim();
}

