-- Create user_memory table for stateful conversation memory
CREATE TABLE public.user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memory_type TEXT NOT NULL, -- 'preference', 'last_order', 'default_address', 'cart_state', 'restaurant_preference'
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, memory_type, memory_key)
);

ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memory"
  ON public.user_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory"
  ON public.user_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory"
  ON public.user_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory"
  ON public.user_memory FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_user_memory_updated_at
  BEFORE UPDATE ON public.user_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_user_memory_user_type ON public.user_memory(user_id, memory_type);

