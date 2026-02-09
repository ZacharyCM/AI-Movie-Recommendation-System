# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

Project structure is not yet initialized. The recommended structure for a NetflixRecs application is:

```
netflixrecs/
├── src/                          # Source code root
│   ├── components/               # React components
│   │   ├── common/               # Shared/reusable components
│   │   ├── pages/                # Page-level components
│   │   └── features/             # Feature-specific components
│   ├── services/                 # Business logic and API clients
│   │   ├── api/                  # External API integration
│   │   ├── auth/                 # Authentication service
│   │   └── recommendations/      # Recommendation logic
│   ├── models/                   # Data models and types
│   │   ├── user.ts               # User model
│   │   ├── movie.ts              # Movie model
│   │   └── recommendation.ts      # Recommendation model
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Utility functions
│   │   ├── helpers.ts            # General helpers
│   │   ├── constants.ts          # Application constants
│   │   └── formatters.ts         # Data formatting utilities
│   ├── context/                  # React Context for state
│   ├── config/                   # Configuration files
│   ├── styles/                   # Global styles (if applicable)
│   ├── types/                    # TypeScript type definitions
│   ├── App.tsx                   # Root component
│   └── index.tsx                 # Entry point
├── public/                       # Static assets
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # End-to-end tests
├── .planning/                    # GSD planning documents
│   └── codebase/                 # Architecture documentation
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript configuration
├── .eslintrc.json                # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── vite.config.ts                # Vite build configuration (if using Vite)
├── jest.config.js                # Jest test configuration (if using Jest)
├── README.md                     # Project documentation
└── .env.example                  # Environment variables template
```

## Directory Purposes

**src/**
- Purpose: All source code for the application
- Contains: TypeScript/JSX files, components, logic, utilities
- Key files: `index.tsx`, `App.tsx`

**src/components/**
- Purpose: React component hierarchy
- Contains: Presentational and container components
- Key files: Component index files for barrel exports

**src/services/**
- Purpose: Business logic layer, API integration
- Contains: Service classes, API clients, data transformers
- Key files: Service implementations and their interfaces

**src/models/**
- Purpose: Domain entity definitions and types
- Contains: TypeScript interfaces and type definitions
- Key files: Model definitions matching domain entities

**src/hooks/**
- Purpose: Custom React hooks for shared component logic
- Contains: Custom hooks with state or side effects
- Key files: Hook implementations

**src/utils/**
- Purpose: Reusable utility functions
- Contains: Helpers, formatters, validators, constants
- Key files: `constants.ts`, `helpers.ts`

**src/config/**
- Purpose: Application configuration and setup
- Contains: Environment-specific config, API endpoints
- Key files: Configuration objects

**tests/**
- Purpose: Test files for the application
- Contains: Unit, integration, and e2e tests
- Key files: Test suites matching source structure

**public/**
- Purpose: Static assets served directly
- Contains: Images, icons, fonts, static HTML
- Key files: index.html (for SPAs)

## Key File Locations

**Entry Points:**
- `src/index.tsx`: Application bootstrap and React DOM rendering
- `src/App.tsx`: Root component wrapping application

**Configuration:**
- `package.json`: Project dependencies and scripts
- `tsconfig.json`: TypeScript compiler options
- `.env.example`: Template for environment variables
- `.eslintrc.json`: Linting rules
- `.prettierrc`: Code formatting rules

**Core Logic:**
- `src/services/`: All business logic and external integrations
- `src/models/`: Entity definitions and types
- `src/hooks/`: Shared React logic

**Testing:**
- `tests/unit/`: Unit test files
- `tests/integration/`: Integration test files
- Jest/Vitest config file at root

## Naming Conventions

**Files:**
- `components/MyComponent.tsx` - PascalCase for components
- `services/userService.ts` - camelCase for non-component modules
- `utils/formatDate.ts` - camelCase for utility functions
- `models/user.ts` - lowercase for data models
- `*.test.ts` or `*.spec.ts` - Test files follow source name

**Directories:**
- `lowercase/` for feature and utility directories
- `PascalCase/` optional for prominent feature folders
- Plural for collections (`components/`, `services/`, `utils/`)

**Functions:**
- `camelCase` for regular functions and methods
- `PascalCase` for component functions
- `UPPER_SNAKE_CASE` for constants

## Where to Add New Code

**New Feature:**
- Primary code: `src/services/[featureName]/`
- Components: `src/components/features/[featureName]/`
- Models: `src/models/[entityName].ts`
- Tests: `tests/unit/services/` and `tests/unit/components/`

**New Component/Module:**
- Implementation: `src/components/` or appropriate feature folder
- Types: `src/models/` or co-located `types.ts` file
- Tests: Parallel test file `src/components/MyComponent.test.tsx`

**Utilities:**
- Shared helpers: `src/utils/` with descriptive filenames
- Constants: `src/utils/constants.ts` or feature-specific `constants.ts`
- Custom hooks: `src/hooks/` with `use` prefix

**API Integration:**
- API client: `src/services/api/[serviceName].ts`
- Types for API responses: `src/models/api/`

## Special Directories

**public/**
- Purpose: Static files served directly to clients
- Generated: No
- Committed: Yes

**.planning/codebase/**
- Purpose: Architecture and codebase documentation
- Generated: No (manually created)
- Committed: Yes

**node_modules/**
- Purpose: Installed dependencies
- Generated: Yes (by npm/yarn/pnpm)
- Committed: No (excluded via .gitignore)

**dist/ or build/**
- Purpose: Compiled/bundled output
- Generated: Yes (by build tool)
- Committed: No (excluded via .gitignore)

---

*Structure analysis: 2026-02-08*
