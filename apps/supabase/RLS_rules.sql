CREATE POLICY "Users can view own or shared categories" 
ON categories_v2 FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM invitations 
    WHERE invitations.category_id = categories_v2.id 
    AND invitations.invitee_email = auth.jwt() ->> 'email'
    AND invitations.status = 'accepted'
  )
);



CREATE POLICY "Users can view own or shared tasks" 
ON tasks_v2 FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM invitations 
    WHERE invitations.category_id = tasks_v2.category_id 
    AND invitations.invitee_email = auth.jwt() ->> 'email'
    AND invitations.status = 'accepted'
  )
);



