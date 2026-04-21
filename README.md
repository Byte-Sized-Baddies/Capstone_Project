# Capstone Project - Do-Bee

Team: Byte Sized Baddies

## Team

- Yubina Acharya - yubinaacharya@my.unt.edu
- Kyathi Uyyala - kyathiuyyala@my.unt.edu
- Mia Enamorado - miaenamorado@my.unt.edu
- Brooke Mesch - brookemesch@my.unt.edu

## Project Overview

Do-Bee is a cross-platform productivity application focused on task management, folders, collaboration, recurring tasks, notes, and integrations.

This repository is organized as a monorepo with:

- A web app (Next.js)
- A mobile app (Expo / React Native)
- Shared packages for UI, hooks, auth, and data abstractions
- Supabase schema and migrations

Project board:

- https://trello.com/b/Hl6oX54Q/capstone

## Architecture

### Monorepo Layout

- apps/mobile: Expo app for iOS, Android, and web preview
- apps/web: Next.js web dashboard and feature pages
- apps/supabase: SQL schema and migration scripts
- packages/ui: Shared UI components
- packages/hooks: Shared hooks
- packages/lib: Shared utilities
- packages/data: Shared types and contracts
- packages/auth: Shared auth abstraction/provider wiring
- packages/data-drivers/supabase: Supabase-specific data implementations
- packages/data-drivers/firebase: Firebase-specific data implementations
- infra: Infrastructure and backend service setup docs/configs
- docs: Team and technical documentation

### Workspace Orchestration

- pnpm workspaces define package boundaries and discovery
- Turborepo coordinates build, dev, lint, and clean tasks
- Shared packages are consumed by both apps using workspace dependencies

## Development Process

1. Track scope and task status in Trello.
2. Implement features in app layers (web/mobile) while reusing packages.
3. Evolve Supabase schema through migration SQL files in apps/supabase.
4. Validate changes locally with workspace scripts.
5. Keep architecture and schema docs in sync with implementation.

## Database Schema (Supabase)

Primary schema source: apps/supabase/tables.sql

### Core Tables

1. profiles
- Linked to auth.users
- Stores user profile metadata, including notifications setting

2. folders
- User-owned task grouping container
- Includes name, color, and created timestamp

3. categories_v2
- User-owned categories
- Optional folder_id relation to folders

4. tasks_v2
- User-owned tasks
- Optional category_id and folder_id
- Includes priority, status/completion, due date, and created timestamp

5. invitations
- Category sharing invitation flow
- Status values: pending, accepted, declined

### Applied Migrations

1. migration_add_folder_id_to_tasks.sql
- Adds folder_id to tasks_v2 for direct folder association
- Adds index idx_tasks_v2_folder_id

2. migration_add_recurring_to_tasks.sql
- Adds recurring fields to tasks_v2:
- is_recurring
- recurring_frequency (daily, weekly, monthly, yearly)
- recurring_days

3. migration_notes_and_integrations.sql
- Adds notes_v2 for structured notes linked to users/tasks
- Adds integrations_v2 for per-user service configurations
- Adds triggers to keep updated_at current on updates

### Row-Level Security (RLS)

- Base owner policies are defined in apps/supabase/tables.sql.
- Additional shared-read behavior is defined in apps/supabase/RLS_rules.sql.

High-level policy model:

- Users can manage their own profiles, folders, categories, tasks, notes, and integrations.
- Invitations allow controlled visibility for shared categories/tasks.

## Tech Stack

- Node.js 20.x
- pnpm workspaces
- Turborepo
- Next.js 15 + React 19 (web)
- Expo 54 + React Native 0.81 (mobile)
- Supabase (Auth, Postgres, Realtime)

## Local Development

### Prerequisites

- Node.js 20.x
- pnpm

### Install Dependencies

```bash
pnpm install
```

### Run All Apps (Parallel)

```bash
pnpm dev
```

### Run Web App Only

```bash
pnpm --filter ./apps/web dev
```

### Run Mobile App Only

```bash
pnpm --filter ./apps/mobile dev
# or
pnpm --filter ./apps/mobile start
```

### Build

```bash
pnpm build
```

### Lint

```bash
pnpm lint
```

## Notes

- Keep environment variables updated for Supabase and integrations.
- Add schema updates via migration files first, then update docs.
