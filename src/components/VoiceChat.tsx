import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessageArea } from "@/components/chat/ChatMessageArea";
import { ChatSuggestions } from "@/components/chat/ChatSuggestions";
import { MobileSuggestionsDrawer } from "@/components/chat/MobileSuggestionsDrawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface VoiceChatProps {
  isActive: boolean;
}

export const VoiceChat = ({ isActive }: VoiceChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [inputText, setInputText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isMobile = useIsMobile();

  // Initialize speech recognition and load user data
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

    // Get current user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        await loadSessions(session.user.id);
      }
    });

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  // Stop voice when tab changes
  useEffect(() => {
    if (!isActive) {
      stopSpeaking();
      if (isListening) {
        stopListening();
      }
    }
  }, [isActive, isListening]);

  // Load all chat sessions for user
  const loadSessions = async (uid: string) => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      // Load titles from first message of each session
      const sessionsWithTitles = await Promise.all(
        data.map(async (session) => {
          const { data: messages } = await supabase
            .from("chat_messages")
            .select("content")
            .eq("session_id", session.id)
            .eq("role", "user")
            .order("created_at", { ascending: true })
            .limit(1);

          const title = messages?.[0]?.content?.slice(0, 40) || "New Conversation";
          return { ...session, title: title + (title.length >= 40 ? "..." : "") };
        })
      );
      setSessions(sessionsWithTitles);

      // Select most recent session or create new one
      if (sessionsWithTitles.length > 0) {
        await selectSession(sessionsWithTitles[0].id);
      } else {
        await createNewSession(uid);
      }
    }
  };

  const createNewSession = async (uid?: string) => {
    const userIdToUse = uid || userId;
    if (!userIdToUse) return;

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userIdToUse })
      .select()
      .single();

    if (!error && data) {
      setSessionId(data.id);
      setMessages([]);
      const newSession = { ...data, title: "New Conversation" };
      setSessions((prev) => [newSession, ...prev]);
    }
  };

  const selectSession = async (sid: string) => {
    setSessionId(sid);
    await loadChatHistory(sid);
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  const loadChatHistory = async (sid: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const loadedMessages: Message[] = data.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: msg.created_at || undefined,
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

    // Update session's updated_at
    await supabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    // Update session title if first user message
    if (message.role === "user" && messages.filter((m) => m.role === "user").length === 0) {
      const title = message.content.slice(0, 40) + (message.content.length >= 40 ? "..." : "");
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
      );
    }
  };

  const clearAllSessions = async () => {
    if (!userId) return;

    // Delete all messages first
    await supabase.from("chat_messages").delete().eq("user_id", userId);
    // Delete all sessions
    await supabase.from("chat_sessions").delete().eq("user_id", userId);

    setSessions([]);
    setMessages([]);
    setSessionId(null);

    // Create a new session
    await createNewSession();

    toast({
      title: "Chats cleared",
      description: "All your chat history has been deleted",
    });
  };

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window && voiceEnabled) {
      stopSpeaking();
      
      // Clean text from special symbols and emojis for TTS
      const cleanText = text
        .replace(/[*_~`#\[\](){}]/g, '')
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [voiceEnabled, stopSpeaking]);

  // Voice input - NO auto-submit, just populate text box
  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      stopSpeaking();
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript); // Just set the text, don't send
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
  }, [stopSpeaking, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: Message = { 
      role: "user", 
      content: inputText,
      timestamp: new Date().toISOString()
    };
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
        timestamp: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      await saveChatMessage(assistantMessage);
      speak(assistantMessage.content);

      if (data.response?.toLowerCase().includes("proceed to checkout") || 
          data.response?.toLowerCase().includes("ready to order")) {
        setCheckoutData({ total: 0 });
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
  }, [inputText, isProcessing, messages, speak, toast]);

  const handleToggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      if (prev) stopSpeaking();
      return !prev;
    });
  }, [stopSpeaking]);

  const handleMockCheckout = () => {
    toast({
      title: "Order Confirmed! 🎉",
      description: "Your order has been placed successfully. You'll receive updates on your order status.",
    });
    setShowCheckout(false);
  };

  return (
    <>
      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 max-w-md w-full space-y-4 animate-in zoom-in-95">
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
      
      {/* Three-Panel Layout */}
      <div className="flex h-[calc(100vh-200px)] min-h-[500px] bg-background rounded-xl border border-border shadow-soft overflow-hidden">
        {/* Left Sidebar - Chat History */}
        <ChatSidebar
          sessions={sessions}
          currentSessionId={sessionId}
          onSelectSession={selectSession}
          onNewChat={() => createNewSession()}
          onClearAll={clearAllSessions}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Middle Panel - Chat Area */}
        <div className="flex-1 min-w-0">
          <ChatMessageArea
            messages={messages}
            inputText={inputText}
            setInputText={setInputText}
            isProcessing={isProcessing}
            isListening={isListening}
            isSpeaking={isSpeaking}
            voiceEnabled={voiceEnabled}
            chatTitle={sessions.find(s => s.id === sessionId)?.title || "New Chat"}
            onSendMessage={handleSendMessage}
            onStartListening={startListening}
            onStopListening={stopListening}
            onToggleVoice={handleToggleVoice}
            onStopSpeaking={stopSpeaking}
            onNewChat={() => createNewSession()}
          />
        </div>

        {/* Right Panel - Suggestions (Desktop) */}
        <ChatSuggestions messages={messages} isVisible={!isMobile} />
      </div>

      {/* Mobile Suggestions Drawer */}
      {isMobile && <MobileSuggestionsDrawer messages={messages} />}
    </>
  );
};
