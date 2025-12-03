import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBag, Bike } from "lucide-react";

interface EmptyOrdersProps {
  onBrowseClick: () => void;
}

export function EmptyOrders({ onBrowseClick }: EmptyOrdersProps) {
  return (
    <Card className="p-12 text-center bg-gradient-card shadow-soft">
      <div className="relative w-32 h-32 mx-auto mb-6">
        {/* Delivery bike illustration */}
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-primary/20 flex items-center justify-center">
          <div className="relative">
            <Bike className="h-16 w-16 text-primary" />
            <ShoppingBag className="h-6 w-6 text-primary absolute -top-1 -right-1" />
          </div>
        </div>
      </div>
      
      <h3 className="text-xl font-bold mb-2 text-foreground">You have no orders yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        Start exploring restaurants and place your first order! Delicious food is just a few taps away.
      </p>
      
      <Button onClick={onBrowseClick} className="shadow-chip">
        <ShoppingBag className="h-4 w-4 mr-2" />
        Browse Restaurants
      </Button>
    </Card>
  );
}
