import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, Volume2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const VoiceChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [inputText, setInputText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        toast({
          title: "Voice recognition error",
          description: event.error === "not-allowed" 
            ? "Microphone access denied. Please enable it in your browser settings."
            : "Please try again or type your message",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Get current user and create new session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        await createNewSession(session.user.id);
      }
    });

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const createNewSession = async (uid: string) => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: uid })
      .select()
      .single();

    if (!error && data) {
      setSessionId(data.id);
    }
  };

  const loadChatHistory = async (sid: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const loadedMessages: Message[] = data.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      setMessages(loadedMessages);
    }
  };

  const saveChatMessage = async (message: Message) => {
    if (!userId || !sessionId) return;

    await supabase.from("chat_messages").insert({
      user_id: userId,
      session_id: sessionId,
      role: message.role,
      content: message.content,
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window && voiceEnabled) {
      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      // Stop AI speaking when user starts speaking
      stopSpeaking();
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendMessage(transcript);
      };
      
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
        setIsListening(false);
        toast({
          title: "Error",
          description: "Could not start voice recognition. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice recognition. Please type your message instead.",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText;
    if (!messageText.trim() || isProcessing) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    await saveChatMessage(userMessage);
    setInputText("");
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: { 
          messages: [...messages, userMessage],
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || "I couldn't process that. Please try again.",
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      await saveChatMessage(assistantMessage);
      speak(assistantMessage.content);

      // Check if AI wants to proceed to checkout
      if (data.response?.toLowerCase().includes("proceed to checkout") || 
          data.response?.toLowerCase().includes("ready to order")) {
        setCheckoutData({ total: 0 }); // Will be calculated from cart
        setShowCheckout(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMockCheckout = () => {
    toast({
      title: "Order Confirmed! 🎉",
      description: "Your order has been placed successfully. You'll receive updates on your order status.",
    });
    setShowCheckout(false);
  };

  return (
    <>
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-xl font-bold">Complete Your Order</h3>
            <div className="space-y-2">
              <Input placeholder="Delivery Address" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash on Delivery</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleMockCheckout} className="flex-1">
                Place Order
              </Button>
              <Button variant="outline" onClick={() => setShowCheckout(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col h-[600px] bg-card rounded-xl border border-border shadow-soft">
      {/* Header with voice toggle */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">AI Food Assistant</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setVoiceEnabled(!voiceEnabled);
            if (voiceEnabled) stopSpeaking();
          }}
        >
          {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <Mic className="w-16 h-16 mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm">Click the microphone or type to order food</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-gradient-hero text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 space-y-3">
        <Textarea
          placeholder="Type or speak your order..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className="resize-none"
          rows={2}
        />
        
        <div className="flex gap-2">
          <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className="flex-shrink-0"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isProcessing}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
    </>
  );
};
