import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Send, Volume2, VolumeX, Loader2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatMessageAreaProps {
  messages: Message[];
  inputText: string;
  setInputText: (text: string) => void;
  isProcessing: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  voiceEnabled: boolean;
  onSendMessage: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onToggleVoice: () => void;
  onStopSpeaking: () => void;
}

export const ChatMessageArea = ({
  messages,
  inputText,
  setInputText,
  isProcessing,
  isListening,
  isSpeaking,
  voiceEnabled,
  onSendMessage,
  onStartListening,
  onStopListening,
  onToggleVoice,
  onStopSpeaking,
}: ChatMessageAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showRecordingIndicator, setShowRecordingIndicator] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setShowRecordingIndicator(isListening);
  }, [isListening]);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div>
          <h3 className="font-semibold text-foreground">AI Food Assistant</h3>
          <p className="text-xs text-muted-foreground">Ask me about restaurants & dishes</p>
        </div>
        <div className="flex items-center gap-2">
          {isSpeaking && (
            <Button
              variant="outline"
              size="sm"
              onClick={onStopSpeaking}
              className="text-primary animate-pulse"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleVoice}
            className={cn(voiceEnabled && "text-primary")}
          >
            {voiceEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 min-h-full">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <Mic className="w-10 h-10 text-primary" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">
                Start a conversation
              </h4>
              <p className="text-muted-foreground text-sm max-w-sm">
                Ask me about restaurants, cuisines, or specific dishes. I can help you find the perfect meal!
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {["Show me biryani options", "What's good in Hyderabad?", "I want pizza"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputText(suggestion)}
                    className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={cn(
                  "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
                  message.role === "user"
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                )}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
                {message.timestamp && (
                  <p className={cn(
                    "text-xs mt-1.5 opacity-70",
                    message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {format(new Date(message.timestamp), "h:mm a")}
                  </p>
                )}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start animate-in fade-in-0">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Recording Indicator */}
      {showRecordingIndicator && (
        <div className="px-4 py-2 bg-primary/10 border-t border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium">Listening...</span>
            <span className="text-xs text-muted-foreground">Speak now</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex gap-2 items-end">
          <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            onClick={isListening ? onStopListening : onStartListening}
            disabled={isProcessing}
            className={cn(
              "flex-shrink-0 h-10 w-10 transition-all",
              isListening && "bg-primary text-primary-foreground animate-pulse"
            )}
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>

          <div className="flex-1 relative">
            <Textarea
              placeholder="Type your message or click the mic to speak..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              className="resize-none pr-12 min-h-[44px] max-h-32"
              rows={1}
            />
          </div>

          <Button
            onClick={onSendMessage}
            disabled={!inputText.trim() || isProcessing}
            size="icon"
            className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
