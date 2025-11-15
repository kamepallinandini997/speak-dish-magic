-- Allow restaurant owners to create and manage their restaurants
CREATE POLICY "Restaurant owners can insert their restaurant"
ON restaurants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'restaurant_owner'
  )
);

CREATE POLICY "Restaurant owners can update their restaurant"
ON restaurants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'restaurant_owner'
    AND user_roles.restaurant_id = restaurants.id
  ) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can insert restaurants"
ON restaurants FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow restaurant owners to manage their menu items
CREATE POLICY "Restaurant owners can insert menu items"
ON menu_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'restaurant_owner'
    AND user_roles.restaurant_id = menu_items.restaurant_id
  ) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Restaurant owners can update their menu items"
ON menu_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'restaurant_owner'
    AND user_roles.restaurant_id = menu_items.restaurant_id
  ) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Restaurant owners can delete their menu items"
ON menu_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'restaurant_owner'
    AND user_roles.restaurant_id = menu_items.restaurant_id
  ) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can insert menu items"
ON menu_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update menu items"
ON menu_items FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete menu items"
ON menu_items FOR DELETE
USING (has_role(auth.uid(), 'admin'));