-- Create user roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'restaurant_owner', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role, restaurant_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create chat sessions table
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Add session_id to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE;

-- Create order reviews table
CREATE TABLE public.order_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;

-- Add estimated_delivery_time to orders
ALTER TABLE public.orders ADD COLUMN estimated_delivery_time TIMESTAMP WITH TIME ZONE;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view their own sessions"
ON public.chat_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON public.chat_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.chat_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for order_reviews
CREATE POLICY "Users can view all reviews"
ON public.order_reviews FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own reviews"
ON public.order_reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.order_reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for orders (allow restaurant owners and admins to update)
CREATE POLICY "Restaurant owners can update their orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'restaurant_owner'
    AND restaurant_id = orders.restaurant_id
  ) OR public.has_role(auth.uid(), 'admin')
);

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Trigger to update chat_sessions updated_at
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();