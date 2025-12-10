// Supervisor Node for orchestrating multi-agent pipeline

import {
  intentRouter,
  queryAgent,
  dataFetchAgent,
  orderAgent,
  cartAgent,
  wishlistAgent,
  deliveryAgent,
  clarifierAgent,
} from './agents.ts';
import { getUserMemory, saveUserMemory } from './memory.ts';

interface Message {
  role: string;
  content: string;
}

interface OrchestrationResult {
  type: 'order' | 'track' | 'cart' | 'wishlist' | 'query' | 'clarify' | 'conversation' | 'payment_required';
  response: string;
  intent?: string;
  data?: any;
  orderData?: any;
}

export class SupervisorNode {
  async orchestrate(
    userMessage: string,
    conversationHistory: Message[],
    userId: string,
    supabase: any
  ): Promise<OrchestrationResult> {
    // 1. Intent mapping
    const { intent, entities } = intentRouter(userMessage, conversationHistory);

    // 2. Load user memory
    const memory = await getUserMemory(userId, supabase);

    // 3. Check if clarification needed
    if (intent === 'clarify') {
      const questions = clarifierAgent(userMessage, conversationHistory);
      return {
        type: 'clarify',
        response: questions.length > 0
          ? questions.join('\n')
          : 'Could you please provide more details?',
        intent: 'clarify',
      };
    }

    // 4. Route to appropriate agent
    switch (intent) {
      case 'order': {
        // Check if user wants to use last order
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage.match(/(same|last time|repeat|again)/) && memory.lastOrder) {
          // Use last order
          const lastOrder = memory.lastOrder;
          const result = await orderAgent('place_order', {
            restaurantId: lastOrder.restaurantId,
            items: lastOrder.items,
            deliveryAddress: memory.defaultAddress || 'Please provide delivery address',
            paymentMethod: 'pin',
          }, userId, supabase);

          if (result.requiresPayment) {
            return {
              type: 'payment_required',
              response: result.message,
              intent: 'order',
              orderData: result.orderData,
            };
          }

          return {
            type: 'order',
            response: result.message,
            intent: 'order',
            data: result.orderData,
          };
        }

        // Data Fetch → Order Agent → Payment Agent
        const menuData = await dataFetchAgent('order', entities, userId, supabase);

        // If restaurant not found in database
        if (menuData.notFound && menuData.restaurantName) {
          return {
            type: 'order',
            response: `${menuData.restaurantName.charAt(0).toUpperCase() + menuData.restaurantName.slice(1)} is listed, but menu/details are not yet available. Please choose from available restaurants.`,
            intent: 'order',
          };
        }

        // If restaurant found but no menu items
        if (menuData.restaurant && !menuData.hasMenu) {
          return {
            type: 'order',
            response: `${menuData.restaurant.name} is available, but their menu is not yet set up. Please choose another restaurant.`,
            intent: 'order',
          };
        }

        // If restaurant not found, ask for clarification
        if (!menuData.restaurant && entities.restaurant) {
          return {
            type: 'clarify',
            response: `I couldn't find a restaurant matching "${entities.restaurant}". Could you please specify which restaurant you'd like to order from?`,
            intent: 'order',
          };
        }

        // If items mentioned, try to add to cart
        if (entities.items && entities.items.length > 0 && menuData.menuItems) {
          // Try to match items to menu items
          const matchedItems: any[] = [];
          for (const entityItem of entities.items) {
            const matched = menuData.menuItems.find((mi: any) =>
              mi.name.toLowerCase().includes(entityItem.name.toLowerCase()) ||
              entityItem.name.toLowerCase().includes(mi.name.toLowerCase().split(' ')[0])
            );
            if (matched) {
              matchedItems.push({
                menuItemId: matched.id,
                name: matched.name,
                price: matched.price,
                quantity: entityItem.quantity || 1,
              });
            }
          }

          if (matchedItems.length > 0) {
            // Add items to cart
            for (const item of matchedItems) {
              await cartAgent('add', {
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                itemName: item.name,
              }, userId, supabase);
            }

            // Save restaurant preference
            if (menuData.restaurant) {
              await saveUserMemory(userId, 'restaurant_preference', menuData.restaurant.id, {
                name: menuData.restaurant.name,
                id: menuData.restaurant.id,
              }, supabase);
            }

            const itemsList = matchedItems.map(item => `${item.quantity}x ${item.name}`).join(', ');
            return {
              type: 'order',
              response: `Added to your cart: ${itemsList}. Would you like to add more items or proceed to checkout?`,
              intent: 'order',
            };
          } else {
            // Items mentioned but not found in menu
            return {
              type: 'order',
              response: `I couldn't find those items in ${menuData.restaurant?.name || 'the restaurant'}. Here's the menu:\n\n${menuData.menuItems.slice(0, 10).map((item: any) => `- ${item.name} (₹${item.price})`).join('\n')}`,
              intent: 'order',
              data: menuData,
            };
          }
        }

        // If restaurant selected but no items, show menu
        if (menuData.restaurant && menuData.menuItems) {
          const menuList = menuData.menuItems
            .slice(0, 10)
            .map((item: any) => `- ${item.name} (₹${item.price})`)
            .join('\n');

          return {
            type: 'order',
            response: `Here's the menu from ${menuData.restaurant.name}:\n\n${menuList}\n\nWhat would you like to order?`,
            intent: 'order',
            data: menuData,
          };
        }

        // General ordering response
        return {
          type: 'order',
          response: 'I can help you place an order! Which restaurant would you like to order from?',
          intent: 'order',
        };
      }

      case 'track': {
        // Delivery Agent
        const status = await deliveryAgent(entities.orderId, userId, supabase);
        return {
          type: 'track',
          response: status,
          intent: 'track',
        };
      }

      case 'cart': {
        // Data Fetch → Cart Agent
        const cartData = await dataFetchAgent('cart', entities, userId, supabase);

        // Handle cart actions
        if (entities.action && entities.action !== 'view') {
          const result = await cartAgent(entities.action, entities, userId, supabase);
          return {
            type: 'cart',
            response: result,
            intent: 'cart',
          };
        }

        // View cart
        const cartResult = await cartAgent('view', cartData, userId, supabase);
        return {
          type: 'cart',
          response: cartResult,
          intent: 'cart',
        };
      }

      case 'wishlist': {
        // Data Fetch → Wishlist Agent
        const wishlistData = await dataFetchAgent('wishlist', entities, userId, supabase);

        // Handle wishlist actions
        if (entities.action && entities.action !== 'view') {
          const result = await wishlistAgent(entities.action, entities, userId, supabase);
          return {
            type: 'wishlist',
            response: result,
            intent: 'wishlist',
          };
        }

        // View wishlist
        const wishlistResult = await wishlistAgent('view', wishlistData, userId, supabase);
        return {
          type: 'wishlist',
          response: wishlistResult,
          intent: 'wishlist',
        };
      }

      case 'query': {
        // Query Agent
        const queryResult = await queryAgent(userMessage, userId, supabase);
        const formattedResponse = formatQueryResponse(queryResult);
        return {
          type: 'query',
          response: formattedResponse,
          intent: 'query',
          data: queryResult,
        };
      }

      default: {
        // Conversational Agent (will use LLM)
        return {
          type: 'conversation',
          response: '', // Empty means use LLM
          intent: 'conversation',
        };
      }
    }
  }
}

function formatQueryResponse(queryResult: any): string {
  if (queryResult.type === 'restaurants' && queryResult.data) {
    const restaurants = queryResult.data
      .slice(0, 5)
      .map((r: any) => `- ${r.name} (${r.cuisine}) - Rating: ${r.rating} ⭐`)
      .join('\n');

    return `Here are some restaurants:\n\n${restaurants}`;
  }

  if (queryResult.type === 'menu_items' && queryResult.data) {
    const items = queryResult.data
      .slice(0, 10)
      .map((item: any) => `- ${item.name} - ₹${item.price} (${item.restaurants?.name || 'Unknown'})`)
      .join('\n');

    return `Here are some menu items:\n\n${items}`;
  }

  return 'I can help you find restaurants and menu items. What are you looking for?';
}

