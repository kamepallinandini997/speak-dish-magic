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
import { getUsuals, getTasteProfile, savePreference, getDietaryRestrictions, getAllergens } from './profileAgent.ts';
import { getPersonalizedRecommendations, getTrendingItems, getSimilarItems, getComboSuggestions } from './recommendationAgent.ts';
import { compareItems, compareRestaurants, getNutritionInfo, filterMenuItems, sortMenuItems, findCheapestItem, findHighestRated, getRestaurantInfo } from './utilityAgent.ts';

interface Message {
  role: string;
  content: string;
}

type OrchestrationResultType = 
  | 'order' | 'track' | 'cart' | 'wishlist' | 'query' | 'clarify' | 'conversation' | 'payment_required'
  | 'recommendation' | 'usuals' | 'nutrition' | 'comparison' | 'filter' | 'greeting' | 'help'
  | 'preference' | 'trending' | 'healthy' | 'combos';

interface OrchestrationResult {
  type: OrchestrationResultType;
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
    console.log('Intent detected:', intent, 'Entities:', JSON.stringify(entities));

    // 2. Load user memory
    const memory = await getUserMemory(userId, supabase);

    // 3. Handle each intent type
    switch (intent) {
      // Greeting
      case 'greeting': {
        const greetings = [
          "Hello! 👋 I'm your personal food assistant. I can help you discover restaurants, get personalized recommendations, browse menus, track orders, and much more. What would you like today?",
          "Hey there! Ready to help you find something delicious. Want me to suggest something based on your taste or show you what's trending?",
          "Hi! I'm here to make your food ordering experience seamless. Ask me anything about restaurants, menus, or let me recommend something special for you!",
        ];
        return {
          type: 'greeting',
          response: greetings[Math.floor(Math.random() * greetings.length)],
          intent: 'greeting',
        };
      }

      // Help
      case 'help': {
        return {
          type: 'help',
          response: `Here's what I can do for you:

**🍽️ Ordering & Cart**
• "Order biryani from Paradise"
• "Add 2 pizzas to cart"
• "Show my cart" / "Place order"

**💡 Recommendations**
• "Recommend something spicy"
• "What should I eat for dinner?"
• "Show my usuals"
• "What's trending?"

**🔍 Search & Discovery**
• "Show vegetarian options under ₹200"
• "Find the cheapest pizza"
• "Compare Dominos vs Pizza Hut"

**📊 Nutrition & Diet**
• "How many calories in biryani?"
• "Show healthy options"
• "I'm allergic to peanuts"

**📦 Tracking**
• "Where is my order?"
• "Track my delivery"

Just ask naturally and I'll help!`,
          intent: 'help',
        };
      }

      // Usuals - User's frequently ordered items
      case 'usuals': {
        const usuals = await getUsuals(userId, supabase);
        
        if (usuals.length === 0) {
          return {
            type: 'usuals',
            response: "You don't have any usual orders yet. Once you order a few times, I'll remember your favorites!",
            intent: 'usuals',
          };
        }

        const usualsList = usuals
          .map((u, i) => `${i + 1}. **${u.itemName}** from ${u.restaurantName} (ordered ${u.orderCount}x)`)
          .join('\n');

        return {
          type: 'usuals',
          response: `Here are your usuals:\n\n${usualsList}\n\nWould you like me to add any of these to your cart?`,
          intent: 'usuals',
          data: usuals,
        };
      }

      // Personalized Recommendations
      case 'recommend':
      case 'suggest_by_taste': {
        const recommendations = await getPersonalizedRecommendations(
          userId,
          {
            budget: entities.budget,
            category: entities.category,
            spiceLevel: entities.spiceLevel,
            isVegetarian: entities.isVegetarian,
            limit: 8,
          },
          supabase
        );

        if (recommendations.length === 0) {
          return {
            type: 'recommendation',
            response: "I couldn't find recommendations matching your criteria. Try adjusting your preferences!",
            intent: 'recommend',
          };
        }

        const profile = await getTasteProfile(userId, supabase);
        const recList = recommendations
          .slice(0, 6)
          .map((r, i) => `${i + 1}. **${r.name}** - ₹${r.price} from ${r.restaurantName}\n   ${r.matchReason}`)
          .join('\n\n');

        return {
          type: 'recommendation',
          response: `Based on your taste profile, here are my recommendations:\n\n${recList}\n\nWould you like to add any of these to your cart?`,
          intent: 'recommend',
          data: recommendations,
        };
      }

      // Budget-based suggestions
      case 'suggest_by_budget': {
        const recommendations = await getPersonalizedRecommendations(
          userId,
          {
            budget: entities.budget || 200,
            isVegetarian: entities.isVegetarian,
            limit: 8,
          },
          supabase
        );

        const recList = recommendations
          .slice(0, 6)
          .map((r, i) => `${i + 1}. **${r.name}** - ₹${r.price} from ${r.restaurantName}`)
          .join('\n');

        return {
          type: 'recommendation',
          response: `Here are options under ₹${entities.budget || 200}:\n\n${recList}`,
          intent: 'suggest_by_budget',
          data: recommendations,
        };
      }

      // Trending items
      case 'trending': {
        const trending = await getTrendingItems(supabase, 8);

        if (trending.length === 0) {
          return {
            type: 'trending',
            response: "I don't have enough data to show trending items yet. Try browsing our restaurants!",
            intent: 'trending',
          };
        }

        const trendingList = trending
          .slice(0, 6)
          .map((t, i) => `${i + 1}. **${t.name}** - ₹${t.price} from ${t.restaurantName}\n   🔥 ${t.matchReason}`)
          .join('\n\n');

        return {
          type: 'trending',
          response: `Here's what's trending this week:\n\n${trendingList}`,
          intent: 'trending',
          data: trending,
        };
      }

      // Healthy options
      case 'healthy_options': {
        const healthy = await getPersonalizedRecommendations(
          userId,
          {
            isHealthy: true,
            budget: entities.budget,
            limit: 8,
          },
          supabase
        );

        const healthyList = healthy
          .slice(0, 6)
          .map((h, i) => `${i + 1}. **${h.name}** - ₹${h.price}${h.calories ? ` (${h.calories} kcal)` : ''}\n   from ${h.restaurantName}`)
          .join('\n\n');

        return {
          type: 'healthy',
          response: `Here are some healthy options for you:\n\n${healthyList}`,
          intent: 'healthy_options',
          data: healthy,
        };
      }

      // Combo suggestions
      case 'combos': {
        const cartData = await dataFetchAgent('cart', {}, userId, supabase);
        const combos = await getComboSuggestions(cartData || [], supabase);

        let response = "Here are some combo suggestions:\n\n";
        if (combos.drink) {
          response += `🥤 **${combos.drink.name}** - ₹${combos.drink.price} - ${combos.drink.matchReason}\n`;
        }
        if (combos.dessert) {
          response += `🍰 **${combos.dessert.name}** - ₹${combos.dessert.price} - ${combos.dessert.matchReason}\n`;
        }

        if (!combos.drink && !combos.dessert) {
          response = "Add a main dish to your cart and I'll suggest perfect pairings!";
        }

        return {
          type: 'combos',
          response,
          intent: 'combos',
          data: combos,
        };
      }

      // Nutrition info
      case 'nutrition_info':
      case 'calories_lookup': {
        // Try to extract item name from message
        const lowerMessage = userMessage.toLowerCase();
        
        // Search for item
        const { data: items } = await supabase
          .from('menu_items')
          .select('id, name, calories, protein, carbs, fat')
          .limit(1);
        
        if (items && items.length > 0) {
          const info = await getNutritionInfo(items[0].id, supabase);
          return {
            type: 'nutrition',
            response: info,
            intent: 'nutrition_info',
          };
        }

        return {
          type: 'nutrition',
          response: "Please specify which dish you'd like nutrition information for. For example: 'How many calories in chicken biryani?'",
          intent: 'nutrition_info',
        };
      }

      // Allergen check
      case 'allergen_check': {
        const userAllergens = await getAllergens(userId, supabase);
        if (userAllergens.length > 0) {
          return {
            type: 'nutrition',
            response: `I have your allergens on file: ${userAllergens.join(', ')}. I'll automatically filter out items containing these when making recommendations. Would you like to update your allergen list?`,
            intent: 'allergen_check',
          };
        }
        return {
          type: 'nutrition',
          response: "I don't have any allergens saved for you. Would you like to tell me about any food allergies? For example: 'I'm allergic to peanuts and dairy'",
          intent: 'allergen_check',
        };
      }

      // Save preference
      case 'save_preference': {
        // Parse what preference to save from the message
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.includes('vegetarian') || lowerMessage.includes('vegan')) {
          await savePreference(userId, 'diet', lowerMessage.includes('vegan') ? 'vegan' : 'vegetarian', { enabled: true }, supabase);
          return {
            type: 'preference',
            response: `Got it! I've saved your dietary preference as ${lowerMessage.includes('vegan') ? 'vegan' : 'vegetarian'}. I'll prioritize these options in my recommendations.`,
            intent: 'save_preference',
          };
        }

        if (lowerMessage.includes('allergic') || lowerMessage.includes("don't like")) {
          // Extract allergens
          const allergenMatch = lowerMessage.match(/allergic to\s+(.+)|don't like\s+(.+)/i);
          if (allergenMatch) {
            const allergen = (allergenMatch[1] || allergenMatch[2]).trim();
            await savePreference(userId, 'allergen', allergen, { severity: 'high' }, supabase);
            return {
              type: 'preference',
              response: `Noted! I'll make sure to avoid ${allergen} in my recommendations.`,
              intent: 'save_preference',
            };
          }
        }

        return {
          type: 'preference',
          response: "I can save your preferences! Tell me things like:\n• 'I'm vegetarian'\n• 'I'm allergic to peanuts'\n• 'I prefer spicy food'\n• 'I don't like onions'",
          intent: 'save_preference',
        };
      }

      // Compare items
      case 'compare_items': {
        return {
          type: 'comparison',
          response: "I can compare dishes for you! Please tell me which two items you'd like to compare. For example: 'Compare chicken biryani and mutton biryani'",
          intent: 'compare_items',
        };
      }

      // Compare restaurants
      case 'compare_restaurants': {
        return {
          type: 'comparison',
          response: "I can compare restaurants for you! Please tell me which two restaurants you'd like to compare. For example: 'Compare Paradise and Bawarchi'",
          intent: 'compare_restaurants',
        };
      }

      // Sort menu
      case 'sort_menu': {
        const sortedItems = await sortMenuItems(
          null,
          entities.sortBy || 'rating',
          entities.sortOrder === 'asc',
          supabase,
          10
        );

        const sortLabel = {
          price: 'price',
          rating: 'rating',
          calories: 'calories',
          name: 'name',
        }[entities.sortBy || 'rating'];

        const sortedList = sortedItems
          .map((item: any, i: number) => `${i + 1}. **${item.name}** - ₹${item.price} (${item.rating}⭐)`)
          .join('\n');

        return {
          type: 'filter',
          response: `Here are items sorted by ${sortLabel}:\n\n${sortedList}`,
          intent: 'sort_menu',
          data: sortedItems,
        };
      }

      // Filter menu
      case 'filter_menu': {
        const filteredItems = await filterMenuItems(
          {
            isVegetarian: entities.isVegetarian,
            maxPrice: entities.budget,
            spiceLevel: entities.spiceLevel,
          },
          supabase,
          10
        );

        const filterDesc = [];
        if (entities.isVegetarian !== undefined) filterDesc.push(entities.isVegetarian ? 'vegetarian' : 'non-veg');
        if (entities.budget) filterDesc.push(`under ₹${entities.budget}`);
        if (entities.spiceLevel) filterDesc.push(entities.spiceLevel >= 4 ? 'spicy' : 'mild');

        const filteredList = filteredItems
          .map((item: any, i: number) => `${i + 1}. **${item.name}** - ₹${item.price} from ${item.restaurants?.name || 'Unknown'}`)
          .join('\n');

        return {
          type: 'filter',
          response: `Here are ${filterDesc.join(', ')} options:\n\n${filteredList}`,
          intent: 'filter_menu',
          data: filteredItems,
        };
      }

      // Cheapest item
      case 'cheapest': {
        const cheapest = await findCheapestItem(entities.category || null, null, supabase);
        
        if (cheapest) {
          return {
            type: 'filter',
            response: `The cheapest${entities.category ? ` ${entities.category}` : ''} option is **${cheapest.name}** at ₹${cheapest.price} from ${cheapest.restaurants?.name || 'Unknown'}. Would you like to add it to your cart?`,
            intent: 'cheapest',
            data: cheapest,
          };
        }

        return {
          type: 'filter',
          response: "I couldn't find items matching your criteria.",
          intent: 'cheapest',
        };
      }

      // Highest rated
      case 'highest_rated': {
        const topRated = await findHighestRated(entities.category || null, null, supabase, 5);
        
        const ratedList = topRated
          .map((item: any, i: number) => `${i + 1}. **${item.name}** - ${item.rating}⭐ - ₹${item.price}`)
          .join('\n');

        return {
          type: 'filter',
          response: `Top rated${entities.category ? ` ${entities.category}` : ''} items:\n\n${ratedList}`,
          intent: 'highest_rated',
          data: topRated,
        };
      }

      // Restaurant info
      case 'restaurant_info': {
        return {
          type: 'query',
          response: "Which restaurant would you like information about? I can tell you about their rating, delivery time, menu items, and more.",
          intent: 'restaurant_info',
        };
      }

      // Clarify
      case 'clarify': {
        const questions = clarifierAgent(userMessage, conversationHistory);
        return {
          type: 'clarify',
          response: questions.length > 0
            ? questions.join('\n')
            : 'Could you please provide more details?',
          intent: 'clarify',
        };
      }

      // Original intents
      case 'order': {
        // Check if user wants to use last order
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage.match(/(same|last time|repeat|again)/) && memory.lastOrder) {
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
            for (const item of matchedItems) {
              await cartAgent('add', {
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                itemName: item.name,
              }, userId, supabase);
            }

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

        return {
          type: 'order',
          response: 'I can help you place an order! Which restaurant would you like to order from?',
          intent: 'order',
        };
      }

      case 'track': {
        const status = await deliveryAgent(entities.orderId, userId, supabase);
        return {
          type: 'track',
          response: status,
          intent: 'track',
        };
      }

      case 'cart': {
        const cartData = await dataFetchAgent('cart', entities, userId, supabase);

        if (entities.action && entities.action !== 'view') {
          const result = await cartAgent(entities.action, entities, userId, supabase);
          return {
            type: 'cart',
            response: result,
            intent: 'cart',
          };
        }

        const cartResult = await cartAgent('view', cartData, userId, supabase);
        return {
          type: 'cart',
          response: cartResult,
          intent: 'cart',
        };
      }

      case 'wishlist': {
        const wishlistData = await dataFetchAgent('wishlist', entities, userId, supabase);

        if (entities.action && entities.action !== 'view') {
          const result = await wishlistAgent(entities.action, entities, userId, supabase);
          return {
            type: 'wishlist',
            response: result,
            intent: 'wishlist',
          };
        }

        const wishlistResult = await wishlistAgent('view', wishlistData, userId, supabase);
        return {
          type: 'wishlist',
          response: wishlistResult,
          intent: 'wishlist',
        };
      }

      case 'query': {
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
