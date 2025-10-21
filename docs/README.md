################################################################################
## Monorepo Formatting 

# apps/
* apps/web : Next.js (React for website)
    - uses react-native web so shared style components from @repo/ui work in the browser 
    - next.config.mjs transpiles @repo/* packages 

* apps/mobile: Expo (React Native for iOS/Android/Web)
    - metro.config.js watches the whole workspace 
    - babel.config.js sets aliases for @repo/* and @/*

# packages/ (shared code)
* packages/ui - shared ui components 
    - react native style 
    - works in web via react-native-web 

* packages/hooks - shared react hooks (useX)

* packages/lib - utilities (validation, helpers, constants)

* packages/data - domain types/interfaces (e.g. Task, TaskRepo, AuthProvider)

* packages/auth - auth wiring that can swap providers (e.g. supabase/firebase)

* packages/data-drivers/supabase – Implementation of data interfaces using Supabase.

* packages/data-drivers/firebase – Implementation of data interfaces using Firebase.

* packages/config – (Optional) central TS/ESLint/Prettier bases.

-- Each packages has a src/index.ts and a simple build script so that turbo can build them 

# infra/ (backend & local dev services) 
* infra/supabase: local supabase project

* infra/firebase/: firebase config, rules, and optional cloud functions 

# docs/
* team docs, notes, readMe, etc. 

# .github/workflows/
* ci pipelines, like install + build on PRs

# package.json
* "dev": "turbo run dev --parallel" – run web+mobile together.
* Also contains devDependencies like turbo, typescript, tsup.

# pnpm-workspace.yaml
* Declares workspace globs (apps/*, packages/*, packages/data-drivers/*, etc.).

# turbo.json
* Uses tasks (build, dev, lint, clean) to coordinate packages/apps.

# tsconfig.base.json
* Shared TS options and paths (e.g., @repo/ui → packages/ui/src).

# .env.example
* Template for SUPABASE_URL, SUPABASE_ANON_KEY, or Firebase keys.
################################################################################

## HOW TO RUN 

# set up: 
node -v   # use Node 20 LTS if possible
pnpm -v   # 9.x

cd do-bee
pnpm install

# to start just local Supabase: 
cd infra/supabase
supabase start

# to run both web + mobile together 
pnpm dev 

# TO RUN INDIVIDUALLY: 
# Web (Next.js)
pnpm --filter ./apps/web dev

# Mobile (Expo)
pnpm --filter ./apps/mobile dev
- only use if scripts.dev exists 
# otherwise:
pnpm --filter ./apps/mobile start

# Build shared packages (CI or local) 
pnpm -r --filter "./packages/**" build 

################################################################################

## HOW THINGS RELATE 
Next.js (web):
* next.config.mjs sets transpilePackages and aliases react-native → react-native-web.

Expo (mobile):
* metro.config.js watches the repo root so imports from packages/* work.
* babel.config.js aliases:
    - @ → app root (so @/components/... works)
    - @repo/* → shared package src/ folders
TypeScript:
* tsconfig.base.json and each app’s tsconfig.json define paths for:
    - @repo/ui, @repo/hooks, @repo/lib, @repo/data, @repo/auth
    - @/* inside the Expo app

################################################################################

## COMMON MISTAKES 
“Cannot find module @repo/ui” in Expo
* Add the dep to mobile, set TS paths, keep Babel alias, restart Expo with clean cache:
    pnpm --filter ./apps/mobile add "@repo/ui@workspace:*"
    // ensure apps/mobile/tsconfig.json has paths mapping
    // ensure apps/mobile/babel.config.js has the alias


Turbo error: “Found pipeline field instead of tasks”
* Use "tasks" in turbo.json.

Zsh complaining about @repo/ui@workspace:*
* Quote the args:
    pnpm --filter ./apps/mobile add "@repo/ui@workspace:*"

Expo alias @/… not found
* Add @ alias in apps/mobile/babel.config.js and tsconfig.json.