-- Migration: Add folder_id to tasks_v2 table
-- Date: 2026-03-03
-- Purpose: Enable direct folder association for tasks

-- Add folder_id column to tasks_v2
ALTER TABLE tasks_v2 
ADD COLUMN folder_id INT4 REFERENCES folders(id) ON DELETE SET NULL;

-- Add index for performance on folder-based queries
CREATE INDEX idx_tasks_v2_folder_id ON tasks_v2(folder_id);

-- Optional: Backfill folder_id from categories_v2.folder_id
-- Uncomment the following lines to backfill existing tasks:
/*
UPDATE tasks_v2 t
SET folder_id = c.folder_id
FROM categories_v2 c
WHERE t.category_id = c.id 
AND t.folder_id IS NULL
AND c.folder_id IS NOT NULL;
*/

-- Verify migration
-- SELECT COUNT(*) FROM tasks_v2 WHERE folder_id IS NOT NULL;
