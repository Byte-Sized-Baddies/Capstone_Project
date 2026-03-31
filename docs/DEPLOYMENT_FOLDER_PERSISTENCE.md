# Folder Reference Persistence - Deployment Guide

## Overview
This implementation adds a direct `folder_id` column to the `tasks_v2` table, enabling task-to-folder associations to persist across sessions in both web and mobile apps.

## Changes Summary

### Database Schema
- Added `folder_id INT4` column to `tasks_v2` table
- Added foreign key constraint: `REFERENCES folders(id) ON DELETE SET NULL`
- Added index `idx_tasks_v2_folder_id` for query performance

### Web Dashboard (`apps/web/src/app/dashboard/page.tsx`)
- **SELECT query**: Added `folder_id` to task select
- **Task mapping**: Map database `folder_id` to Task `folderId` property
- **INSERT payload**: Include `folder_id: newTaskFolder` when creating tasks
- **UPDATE payload**: Include `folder_id: newTaskFolder` when editing tasks

### Mobile App (`apps/mobile/`)
- **Task Context** (`app/context/tasks.tsx`):
  - Updated `Task.projectId` type from `string | null` to `number | null`
  - Updated `NewTaskInput.projectId` type from `string | null` to `number | null`
  - Added `folder_id` to SELECT query
  - Map database `folder_id` to `projectId` in task objects
  - Include `folder_id: projectId` in INSERT operations
  - Include `folder_id` in UPDATE operations when `projectId` changes
  
- **Projects Context** (`app/context/projects.tsx`):
  - Changed `Project.id` type from `string` to `number`
  - Changed `activeProjectId` type from `string | null` to `number | null`
  - Removed hardcoded string-based default projects
  - Store folder IDs as numbers directly from database
  
- **Components**:
  - `AddTaskModal.tsx`: Updated `projectId` state to `number | null`
  - `EditTaskModal.tsx`: Updated `projectId` state to `number | null`

## Deployment Steps

### Phase 1: Database Migration (REQUIRED FIRST)

Run the migration in your Supabase SQL editor:

```sql
-- Add folder_id column to tasks_v2
ALTER TABLE tasks_v2 
ADD COLUMN folder_id INT4 REFERENCES folders(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_tasks_v2_folder_id ON tasks_v2(folder_id);
```

Or use the provided migration file:
```bash
# In Supabase dashboard, run:
apps/supabase/migration_add_folder_id_to_tasks.sql
```

**Verification:**
```sql
-- Check column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks_v2' AND column_name = 'folder_id';

-- Check index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'tasks_v2' AND indexname = 'idx_tasks_v2_folder_id';
```

### Phase 2: Deploy Application Code

The code changes are backward-compatible. Deploy in any order after schema migration:

**Web:**
```bash
cd apps/web
npm run build
# Deploy to your hosting provider
```

**Mobile:**
```bash
cd apps/mobile
# For iOS
npx expo run:ios

# For Android
npx expo run:android

# Or create production builds
eas build --platform all
```

### Phase 3: Validation

**Web Dashboard:**
1. Login and navigate to dashboard
2. Select a folder from sidebar
3. Create a new task
4. Reload the page
5. ✅ Task should still appear under the selected folder

**Mobile App:**
1. Open app and login
2. Navigate to a project/folder
3. Create a new task
4. Close and reopen the app
5. ✅ Task should still be associated with the project

**Database Verification:**
```sql
-- Check that new tasks have folder_id populated
SELECT id, title, folder_id, created_at 
FROM tasks_v2 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

### Phase 4: Data Backfill (Optional)

If you want to associate existing tasks with folders based on their category's folder:

```sql
-- Preview what would be updated
SELECT t.id, t.title, t.category_id, c.folder_id
FROM tasks_v2 t
JOIN categories_v2 c ON t.category_id = c.id
WHERE t.folder_id IS NULL
AND c.folder_id IS NOT NULL;

-- Execute backfill
UPDATE tasks_v2 t
SET folder_id = c.folder_id
FROM categories_v2 c
WHERE t.category_id = c.id 
AND t.folder_id IS NULL
AND c.folder_id IS NOT NULL;

-- Check results
SELECT 
  COUNT(*) FILTER (WHERE folder_id IS NOT NULL) as with_folder,
  COUNT(*) FILTER (WHERE folder_id IS NULL) as without_folder
FROM tasks_v2;
```

## Rollback Plan (If Needed)

If issues occur, you can rollback safely:

```sql
-- Remove the column (cascading will remove the index)
ALTER TABLE tasks_v2 DROP COLUMN folder_id;
```

Then redeploy previous application code versions. Since the column is nullable, old code versions will continue to work even with the column present.

## Breaking Changes

### Mobile App Type Changes
- `Project.id` changed from `string` to `number`
- `Task.projectId` changed from `string | null` to `number | null`
- Hardcoded default projects removed (now loads from database only)

**Migration for existing mobile state:**
If users have local mobile state with string IDs, clear app storage on first launch after update:
```typescript
// In app initialization
AsyncStorage.removeItem('projects');
AsyncStorage.removeItem('activeProjectId');
```

## Testing Checklist

- [ ] Schema migration runs without errors
- [ ] Web: Create task with folder, persists after refresh
- [ ] Web: Edit task folder, persists after refresh
- [ ] Web: Delete folder, tasks move to "All Tasks"
- [ ] Mobile: Create task with project, persists after app restart
- [ ] Mobile: Edit task project, persists after app restart
- [ ] Mobile: Projects load from database with numeric IDs
- [ ] No TypeScript errors in web build
- [ ] No TypeScript errors in mobile build
- [ ] Existing tasks without folder continue to work

## Support

For issues or questions:
1. Check Supabase logs for database errors
2. Check browser/mobile console for client errors
3. Verify migration completed successfully
4. Confirm code deployed correctly

## Metrics to Monitor

- Task creation success rate
- Page load time (with new index should be fast)
- Folder filter query performance
- Mobile app crash rate (watch for type conversion issues)
