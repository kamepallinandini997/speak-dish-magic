import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles, ChevronUp } from "lucide-react";
import { ChatSuggestions } from "./ChatSuggestions";

interface Message {
  role: string;
  content: string;
}

interface MobileSuggestionsDrawerProps {
  messages: Message[];
  onRestaurantClick?: (restaurant: any) => void;
  onItemClick?: (item: any) => void;
}

export const MobileSuggestionsDrawer = ({ 
  messages, 
  onRestaurantClick, 
  onItemClick 
}: MobileSuggestionsDrawerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-24 right-4 z-40 gap-2 shadow-lg bg-card border-primary/20 hover:bg-primary/5"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          Suggestions
          <ChevronUp className="h-3 w-3" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-left">
            <Sparkles className="h-5 w-5 text-primary" />
            Suggested for you
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(70vh-60px)]">
          <ChatSuggestions 
            messages={messages} 
            isVisible={true} 
            isMobileDrawer={true}
            onRestaurantClick={onRestaurantClick}
            onItemClick={onItemClick}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
