import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a helpful AI food ordering assistant. You help users discover restaurants, understand menus, and place orders. 

Your capabilities:
- Help users find restaurants based on cuisine, rating, or preferences
- Explain menu items and make recommendations
- Add items to cart and wishlist
- Assist with order placement and tracking
- Answer questions about delivery times, pricing, and restaurant details

Keep responses conversational, friendly, and concise. When users ask about specific dishes or restaurants, provide clear information about availability, pricing, and preparation time.

Available restaurants:
1. Paradise Biryani (Hyderabadi) - Rating 4.6, 30-40 mins delivery
2. Dominos Pizza (Italian) - Rating 4.2, 25-35 mins delivery
3. Subway (American) - Rating 4.4, 20-30 mins delivery
4. KFC (Fast Food) - Rating 4.3, 25-35 mins delivery
5. Sushi Palace (Japanese) - Rating 4.7, 35-45 mins delivery

When users want to order, guide them through the process naturally.`;

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
      JSON.stringify({ response: assistantMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});