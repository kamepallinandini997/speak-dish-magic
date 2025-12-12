import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SupervisorNode } from './supervisor.ts';
import { getUserMemory } from './memory.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: string;
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();
    
    // Input validation
    if (!Array.isArray(messages)) {
      throw new Error('Invalid messages format');
    }
    
    if (messages.length > 50) {
      throw new Error('Too many messages');
    }
    
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string') {
        throw new Error('Invalid message structure');
      }
      if (msg.content.length > 2000) {
        throw new Error('Message content too long');
      }
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get last user message and filter out identity inference
    let lastUserMessage = messages.filter((m: Message) => m.role === 'user').slice(-1)[0]?.content || '';
    
    // Filter out common names that might be mistaken for user identity
    // This prevents the bot from inferring user identity from message text
    const commonNames = [
      'alia', 'bhatt', 'shahrukh', 'khan', 'amitabh', 'bachchan',
      'priyanka', 'chopra', 'deepika', 'padukone', 'ranbir', 'kapoor'
    ];
    
    // Remove name patterns that might be mistaken for identity
    // (This is a simple filter - in production, use more sophisticated NLP)
    const filteredMessage = lastUserMessage
      .split(' ')
      .filter((word: string) => {
        const lowerWord = word.toLowerCase().replace(/[.,!?]/g, '');
        return !commonNames.includes(lowerWord);
      })
      .join(' ');
    
    // Only use filtered message if it's significantly different (to avoid breaking normal conversation)
    if (filteredMessage.length > lastUserMessage.length * 0.7) {
      lastUserMessage = filteredMessage;
    }

    // Initialize supervisor
    const supervisor = new SupervisorNode();

    // Orchestrate with multi-agent system
    let orchestrationResult;
    try {
      orchestrationResult = await supervisor.orchestrate(
        lastUserMessage,
        messages,
        userId || '',
        supabase
      );
    } catch (error) {
      console.error('Supervisor error:', error);
      orchestrationResult = { type: 'conversation', response: '', intent: 'conversation' };
    }

    // If agent handled it, return agent response
    if (orchestrationResult.type !== 'conversation' && orchestrationResult.response) {
      return new Response(
        JSON.stringify({
          response: orchestrationResult.response,
          intent: orchestrationResult.intent,
          data: orchestrationResult.data,
          orderData: orchestrationResult.orderData,
          requiresPayment: orchestrationResult.type === 'payment_required',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Otherwise, use LLM for conversational responses
    // Load user memory for context
    let memoryContext = '';
    if (userId) {
      try {
        const memory = await getUserMemory(userId, supabase);
        if (memory.lastOrder) {
          memoryContext += `\nUser's last order: ${JSON.stringify(memory.lastOrder)}`;
        }
        if (memory.defaultAddress) {
          memoryContext += `\nDefault delivery address: ${memory.defaultAddress}`;
        }
        if (memory.restaurantPreferences.length > 0) {
          memoryContext += `\nPreferred restaurants: ${memory.restaurantPreferences.map(r => r.restaurantName).join(', ')}`;
        }
      } catch (error) {
        console.error('Error loading memory:', error);
      }
    }

    // Fetch restaurants from database (single source of truth)
    let restaurantList = '';
    try {
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('name, cuisine, rating, delivery_time')
        .order('rating', { ascending: false })
        .limit(20);
      
      if (restaurants && restaurants.length > 0) {
        restaurantList = restaurants
          .map((r, idx) => `${idx + 1}. ${r.name} (${r.cuisine}) - Rating ${r.rating} ⭐, ${r.delivery_time || '30-40 mins'} delivery`)
          .join('\n');
      } else {
        restaurantList = 'No restaurants available at the moment.';
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      restaurantList = 'Unable to fetch restaurant list.';
    }

    let systemPrompt = `You are a helpful AI food ordering assistant. You help users discover restaurants, understand menus, and place orders. 

Your capabilities:
- Help users find restaurants based on cuisine, rating, or preferences
- Explain menu items and make recommendations
- Add items to cart and wishlist
- Assist with order placement and tracking
- Answer questions about delivery times, pricing, and restaurant details

Keep responses conversational, friendly, and concise. When users ask about specific dishes or restaurants, provide clear information about availability, pricing, and preparation time.

IMPORTANT RULES:
- NEVER infer user identity from message text. User identity comes from authentication only.
- If a restaurant is mentioned but not found in the database, say: "[Restaurant Name] is listed, but menu/details are not yet available."
- Only confirm orders after receiving a valid order ID from the backend.
- Never assume order confirmation without backend verification.

Available restaurants (from database):
${restaurantList}

When users want to order, guide them through the process naturally.${memoryContext}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || "I couldn't process that request.";

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        intent: orchestrationResult.intent || 'conversation',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Chat error details:', {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Unable to process your message. Please try again.' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});