import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Store, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [userType, setUserType] = useState<"customer" | "restaurant_owner">(
    searchParams.get("type") === "business" ? "restaurant_owner" : "customer"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Restaurant owner fields
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("30-40 mins");
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        // First create the auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("User creation failed");

        // For restaurant owners, create restaurant and assign role
        if (userType === "restaurant_owner") {
          // Create the restaurant
          const { data: restaurant, error: restaurantError } = await supabase
            .from("restaurants")
            .insert({
              name: restaurantName,
              cuisine: cuisine,
              delivery_time: deliveryTime,
              rating: 4.0,
              min_order: 0,
              delivery_fee: 0,
            })
            .select()
            .single();

          if (restaurantError) throw restaurantError;

          // Assign restaurant_owner role
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: authData.user.id,
              role: "restaurant_owner",
              restaurant_id: restaurant.id,
            });

          if (roleError) throw roleError;

          toast({
            title: "Restaurant created!",
            description: "Your business account is ready. You can now manage your restaurant.",
          });
        } else {
          toast({
            title: "Account created!",
            description: "You can now start ordering.",
          });
        }
        
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You're logged in successfully.",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md shadow-hover">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-3xl">
            {mode === "login" ? "Welcome Back" : "Get Started"}
          </CardTitle>
          <CardDescription>
            {mode === "login" 
              ? "Sign in to continue" 
              : "Create an account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === "signup" && (
              <Tabs value={userType} onValueChange={(v) => setUserType(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="customer" className="gap-2">
                    <User className="w-4 h-4" />
                    Customer
                  </TabsTrigger>
                  <TabsTrigger value="restaurant_owner" className="gap-2">
                    <Store className="w-4 h-4" />
                    Business Owner
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={mode === "signup"}
                />
              </div>
            )}

            {mode === "signup" && userType === "restaurant_owner" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="restaurantName">Restaurant Name</Label>
                  <Input
                    id="restaurantName"
                    type="text"
                    placeholder="Paradise Biryani"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cuisine">Cuisine Type</Label>
                  <Input
                    id="cuisine"
                    type="text"
                    placeholder="Indian, Chinese, Italian..."
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryTime">Estimated Delivery Time</Label>
                  <Input
                    id="deliveryTime"
                    type="text"
                    placeholder="30-40 mins"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                mode === "login" ? "Sign In" : "Sign Up"
              )}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-primary hover:underline"
              >
                {mode === "login" 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;