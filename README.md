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


## Assumptions
The following assumptions are made for deployment:
- The deployment environment has Node.js 20.x installed
- The user has pnpm installed globally
- A Supabase project is already created
- Environment variables (API keys, database URLs) are available
- The deployment target supports:
    - Node-based applications
    - Web hosting (for Next.js)
    - Mobile build tools (optional for Expo)


## Dependencies

Core Dependencies:
- Node.js(v20.x)
- pnpm (latest stable)
- Turborepo

Framework & Libraries
- Next.js 15
- React 19
- Expo 54
- React Native 0.81

Backend & Services:
- Supabase (Auth, Postgres, Realtime)

Internal Packages (from monorepo)
- UI components
- Hooks
- Auth module
- Data abstraction layers

External APIs
- Supabase API (required)
- Any integrations configured in the integrations_v2 table

## Constraints

- Require internet access for Supabase services
- Must support Node.js runtime
- Mobile app requires:
    - Expo CLI or compatible environment
- Environment variables must be configured correctly
- Database schema must be intialized before running

## Description of Deployment Artifacts
The project follows a monorepo structure:
root/
├── apps/
│   ├── web/                # Next.js production build
│   ├── mobile/             # Expo app build
│   ├── supabase/           # SQL schema & migrations
├── packages/
│   ├── ui/
│   ├── hooks/
│   ├── lib/
│   ├── data/
│   ├── auth/
│   ├── data-drivers/
├── infra/                  # Deployment configs
├── docs/                   # Documentation

Deployment Artifacts Include:
- Compiled Next.js build (.next/)
- Database schema + migrations
- Environment configurations files


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

## Data Creation
Before running the application, the database must be initialized

Steps:
1. Set up a Supabase project
2. Run schema file:
    apps/supabase/tables.sql
3. Apply migrations:
    migration_add_folder_id_to_tasks.sql
    migration_add_recurring_to_tasks.sql
    migration_notes_and_integrations.sql

Additional Setup:
- Enable Row-Level Security
- Apply policies from
    RLS_rules.sql

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

## Deployment Process
1. Clone repository
    git clone https://github.com/Byte-Sized-Baddies/Capstone_Project.git
    cd Capstone_Project

2. pnpm install

3. Create .env files in relevant apps

4. Setup Database
    - Apply migrations
    - Verify tables exist

5. Build Project
    pnpm build

6.  Run All Apps
    pnpm dev

    Run Web Only 
    pnpm --filter ./apps/web dev

    Run Mobile Only
    pnpm --filter ./apps/mobile start

7. Production Deployment

    Web Deployment:
    - Deploy apps/web using:
        - Vercel / Netlify / Node Server
    
    Mobile Deployment:
    - Build using Expo
    

## Notes

- Keep environment variables updated for Supabase and integrations.
- Add schema updates via migration files first, then update docs.
