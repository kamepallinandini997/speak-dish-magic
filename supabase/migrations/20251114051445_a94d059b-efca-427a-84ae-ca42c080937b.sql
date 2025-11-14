-- Add INSERT policy for order_items to allow users to add items to their own orders
CREATE POLICY "Users can insert items for their orders"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Add UPDATE policy for admins to modify order items if needed
CREATE POLICY "Admins can update order items"
ON order_items FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add DELETE policy for users to remove items from pending orders
CREATE POLICY "Users can delete items from their orders"
ON order_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
    AND orders.status = 'pending'
  )
);