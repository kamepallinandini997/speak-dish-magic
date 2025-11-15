import { Button } from "@/components/ui/button";
import { Mic, ShoppingCart, CreditCard, Truck, ArrowRight, Sparkles, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mic,
      title: "Speak Your Craving",
      description: "Just tell us what you want - our AI understands natural conversation"
    },
    {
      icon: ShoppingCart,
      title: "Smart Ordering",
      description: "Add items to cart with voice commands or browse menus visually"
    },
    {
      icon: CreditCard,
      title: "Secure Payment",
      description: "Confirm orders with PIN or face recognition for added security"
    },
    {
      icon: Truck,
      title: "Track Delivery",
      description: "Real-time updates from preparation to your doorstep"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Smart Food Assistant
            </h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/auth?mode=login")}>
              Login
            </Button>
            <Button onClick={() => navigate("/auth?mode=signup")}>
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-block">
            <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              🎤 Voice-Powered AI Assistant
            </span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold leading-tight">
            Order Your Favorite Dishes{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              By Talking
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience the future of food ordering. Speak naturally, get instant responses, 
            and enjoy your meal without lifting a finger.
          </p>

          <div className="flex gap-4 justify-center items-center flex-wrap">
            <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="gap-2 shadow-hover">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Learn More
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
            <div>
              <div className="text-3xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground">Restaurants</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Menu Items</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">4.8</div>
              <div className="text-sm text-muted-foreground">Avg Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h3>
          <p className="text-muted-foreground text-lg">
            Four simple steps to delicious food
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className="relative p-6 rounded-2xl bg-gradient-card border border-border shadow-soft hover:shadow-hover transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-3xl p-12 text-center shadow-hover">
          <h3 className="text-4xl font-bold mb-4">
            Ready to Order Smarter?
          </h3>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already experiencing the future of food delivery
          </p>
          <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="gap-2 shadow-hover">
            Start Ordering Now <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Business Owner CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-br from-background to-muted/30 rounded-3xl p-12 border border-border shadow-elegant">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block">
                <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  🏪 For Business Owners
                </span>
              </div>
              <h3 className="text-4xl font-bold">
                Grow Your Restaurant Business With Us
              </h3>
              <p className="text-lg text-muted-foreground">
                Join our platform and reach thousands of hungry customers. Manage your menu, 
                track orders, and grow your business - all in one place.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Easy Menu Management</div>
                    <div className="text-sm text-muted-foreground">Add and update your dishes in real-time</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Order Analytics</div>
                    <div className="text-sm text-muted-foreground">Track your sales and customer preferences</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Instant Notifications</div>
                    <div className="text-sm text-muted-foreground">Get notified for every new order</div>
                  </div>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <div className="bg-card p-8 rounded-2xl border border-border shadow-hover">
                <div className="text-center space-y-4">
                  <Store className="w-16 h-16 text-primary mx-auto" />
                  <h4 className="text-2xl font-bold">Start Your Business Journey</h4>
                  <p className="text-muted-foreground">
                    Sign up as a restaurant owner and start accepting orders today
                  </p>
                  <Button 
                    size="lg" 
                    onClick={() => navigate("/auth?mode=signup&type=business")} 
                    className="w-full gap-2"
                  >
                    Register Your Restaurant <ArrowRight className="w-4 h-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <button 
                      onClick={() => navigate("/auth?mode=login")}
                      className="text-primary hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Smart Food Assistant. Powered by AI.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;