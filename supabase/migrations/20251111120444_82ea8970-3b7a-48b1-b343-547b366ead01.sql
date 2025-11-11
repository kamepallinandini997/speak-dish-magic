-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create restaurants table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cuisine TEXT NOT NULL,
  rating DECIMAL(2,1) DEFAULT 4.0,
  image_url TEXT,
  delivery_time TEXT DEFAULT '30-40 mins',
  min_order DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurants are viewable by everyone"
  ON public.restaurants FOR SELECT
  USING (true);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  rating DECIMAL(2,1) DEFAULT 4.0,
  is_vegetarian BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Menu items are viewable by everyone"
  ON public.menu_items FOR SELECT
  USING (true);

-- Create cart table
CREATE TABLE public.cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, menu_item_id)
);

ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart"
  ON public.cart FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their cart"
  ON public.cart FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their cart"
  ON public.cart FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their cart"
  ON public.cart FOR DELETE
  USING (auth.uid() = user_id);

-- Create wishlist table
CREATE TABLE public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, menu_item_id)
);

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist"
  ON public.wishlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their wishlist"
  ON public.wishlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their wishlist"
  ON public.wishlist FOR DELETE
  USING (auth.uid() = user_id);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  delivery_address TEXT,
  payment_method TEXT DEFAULT 'pin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  item_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Create chat_messages table for conversation history
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_updated_at
  BEFORE UPDATE ON public.cart
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample restaurants
INSERT INTO public.restaurants (name, cuisine, rating, image_url, delivery_time, min_order, delivery_fee) VALUES
('Paradise Biryani', 'Hyderabadi', 4.6, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', '30-40 mins', 200, 40),
('Dominos Pizza', 'Italian', 4.2, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400', '25-35 mins', 150, 30),
('Subway', 'American', 4.4, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400', '20-30 mins', 100, 25),
('KFC', 'Fast Food', 4.3, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400', '25-35 mins', 180, 35),
('Sushi Palace', 'Japanese', 4.7, 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400', '35-45 mins', 300, 50);

-- Insert sample menu items
INSERT INTO public.menu_items (restaurant_id, name, description, price, category, image_url, rating, is_vegetarian)
SELECT r.id, 'Mutton Biryani', 'Aromatic basmati rice with tender mutton', 320, 'Main Course', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300', 4.7, false
FROM public.restaurants r WHERE r.name = 'Paradise Biryani'
UNION ALL
SELECT r.id, 'Veg Biryani', 'Fragrant rice with mixed vegetables', 250, 'Main Course', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300', 4.5, true
FROM public.restaurants r WHERE r.name = 'Paradise Biryani'
UNION ALL
SELECT r.id, 'Margherita Pizza', 'Classic pizza with tomato and mozzarella', 299, 'Pizza', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300', 4.3, true
FROM public.restaurants r WHERE r.name = 'Dominos Pizza'
UNION ALL
SELECT r.id, 'Pepperoni Pizza', 'Loaded with pepperoni slices', 399, 'Pizza', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300', 4.4, false
FROM public.restaurants r WHERE r.name = 'Dominos Pizza'
UNION ALL
SELECT r.id, 'Veggie Delite Sub', 'Fresh vegetables in a sub', 180, 'Subs', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300', 4.2, true
FROM public.restaurants r WHERE r.name = 'Subway'
UNION ALL
SELECT r.id, 'Chicken Teriyaki Sub', 'Grilled chicken with teriyaki sauce', 240, 'Subs', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300', 4.5, false
FROM public.restaurants r WHERE r.name = 'Subway'
UNION ALL
SELECT r.id, 'Zinger Burger', 'Crispy chicken burger', 220, 'Burgers', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300', 4.4, false
FROM public.restaurants r WHERE r.name = 'KFC'
UNION ALL
SELECT r.id, 'Bucket Chicken', '8 pieces of fried chicken', 599, 'Main Course', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300', 4.6, false
FROM public.restaurants r WHERE r.name = 'KFC'
UNION ALL
SELECT r.id, 'California Roll', 'Fresh sushi roll with avocado', 450, 'Sushi', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300', 4.8, true
FROM public.restaurants r WHERE r.name = 'Sushi Palace'
UNION ALL
SELECT r.id, 'Salmon Nigiri', 'Fresh salmon on rice', 380, 'Sushi', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300', 4.7, false
FROM public.restaurants r WHERE r.name = 'Sushi Palace';