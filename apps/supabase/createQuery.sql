INSERT INTO profiles (id, full_name, notifications_enabled)
VALUES 
  ('7db25126-b429-438f-8aab-674af57f1f56', 'User One', TRUE),
  ('c20941c2-51ac-4e6c-bc26-01c16c78064e', 'User Two', TRUE),
  ('cb7faaf8-51b4-445f-a08a-503f8d783ba6', 'User Three', FALSE),
  ('5cc6d563-a411-46e2-94e8-d4575d5791b2', 'User Four', TRUE),
  ('08c32d81-882d-4af0-9267-db929f1a65ce', 'User Five', TRUE),
  ('fef3ba55-8075-4984-88c1-535a1e4a6dcf', 'User Six', FALSE);


INSERT INTO categories_v2 (user_id, name)
VALUES 
  ('7db25126-b429-438f-8aab-674af57f1f56', 'Work Projects'),
  ('7db25126-b429-438f-8aab-674af57f1f56', 'Personal Errands'),
  ('c20941c2-51ac-4e6c-bc26-01c16c78064e', 'Fitness Goals');



INSERT INTO tasks_v2 (user_id, category_id, title, description, due_date, priority, is_completed)
VALUES 
  ('7db25126-b429-438f-8aab-674af57f1f56', 1, 'Finalize DoBee Schema', 'Review the v2 table names and RLS', '2026-02-10', 1, FALSE),
  ('7db25126-b429-438f-8aab-674af57f1f56', 2, 'Pick up dry cleaning', 'Before 6 PM', '2026-02-01', 3, FALSE),
  ('c20941c2-51ac-4e6c-bc26-01c16c78064e', 3, 'Morning Yoga', '30 minute session', '2026-01-31', 2, TRUE),
  ('cb7faaf8-51b4-445f-a08a-503f8d783ba6', NULL, 'General Note', 'Independent task with no category', NULL, 0, FALSE);



INSERT INTO invitations (category_id, inviter_id, invitee_email, status)
VALUES 
  (1, '7db25126-b429-438f-8aab-674af57f1f56', 'user.five@example.com', 'pending');


