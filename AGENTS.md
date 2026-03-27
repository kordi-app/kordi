<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Architecture: Feature-Sliced Design (FSD) + Next.js App Router

## Directory Structure

```
src/
├── app/                      # Layer: Next.js App Router (routing, providers, entry)
│   └── [locale]/(routes)/    # Thin route shells → import from views
├── views/                    # Layer: full page compositors (compose widgets)
├── widgets/                  # Layer: self-contained UI blocks (use-case composites)
├── features/                 # Layer: CUD + user interactions (mutations)
│   └── {domain}/
│       ├── ui/               # Segment: UI components
│       ├── model/            # Segment: business logic
│       ├── lib/              # Segment: hooks
│       └── index.ts          # Public API
├── entities/                 # Layer: interfaces + Read (queries, types)
│   └── {domain}/
│       ├── model/            # Segment: types, state
│       ├── api/              # Segment: data fetching (reads)
│       └── index.ts
├── shared/                   # Layer: domain-agnostic (no slices)
│   ├── ui/                   # Segment: reusable UI components
│   ├── lib/                  # Segment: utilities, music theory, audio
│   └── config/               # Segment: i18n, messages, env
│       ├── i18n/             # routing, navigation, request config
│       └── messages/         # ko.json, en.json
└── middleware.ts              # Next.js middleware (src root, framework requirement)
```

## FSD Rules

1. **Unidirectional imports only**: Higher layers import from lower layers. NEVER import upward.
   - `app → views → widgets → features → entities → shared`
2. **Slices cannot reference each other**: Within the same layer, different slices (domains) CANNOT import from each other. (High cohesion, low coupling)
3. **Public API contract**: Every slice exports through `index.ts`. Never import from slice internals.
4. **Thin app/ routes**: `app/` route files only compose and re-export from `src/views/`. No business logic.
5. **Features = CUD + user interaction**: Mutations (Create/Update/Delete) with user events belong in features.
6. **Entities = interfaces + Read**: Type definitions and data fetching (Get/Read) belong in entities.
7. **Shared has no slices**: No domain folders under shared — it's domain-agnostic.
8. **Segments = role-based folders**: Within each slice, organize by role (ui, model, lib, api).

## Path Aliases

- `@/*` → `./src/*` (e.g., `@/shared/ui/button`, `@/features/auth/login`)

---

# React & Next.js Best Practices

Rules ordered by impact. Follow these when writing any React/Next.js code.

## CRITICAL Impact

### Authenticate Server Actions Like API Routes
Server Actions (`"use server"`) are public endpoints. Always verify auth AND authorization inside each action. Never rely solely on middleware or layout guards.
```tsx
'use server'
export async function deleteUser(userId: string) {
  const session = await verifySession()
  if (!session) throw unauthorized('Must be logged in')
  if (session.user.role !== 'admin' && session.user.id !== userId)
    throw unauthorized('Cannot delete other users')
  await db.user.delete({ where: { id: userId } })
}
```

### Parallel Data Fetching with Component Composition
Never await sequentially in a single RSC when data is independent. Split into separate async components that fetch in parallel.
```tsx
// WRONG: sequential
async function Page() {
  const header = await fetchHeader()
  return <div><div>{header}</div><Sidebar /></div>
}
// RIGHT: parallel
export default function Page() {
  return <div><Header /><Sidebar /></div>
}
```

### Promise.all() for Independent Operations
```tsx
// WRONG
const user = await fetchUser()
const posts = await fetchPosts()
// RIGHT
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()])
```

### Avoid Barrel File Imports
Use `optimizePackageImports` in next.config.ts for libraries like `lucide-react`. For non-Next.js contexts, import directly from source paths.

### Dynamic Imports for Heavy Components
Use `next/dynamic` with `{ ssr: false }` for large components (editors, charts) not needed on initial render.

### Parallel Nested Data Fetching
Chain dependent fetches within each item's promise so a slow item doesn't block the rest.
```tsx
const chatAuthors = await Promise.all(
  chatIds.map(id => getChat(id).then(chat => getUser(chat.author)))
)
```

## HIGH Impact

### Minimize Serialization at RSC Boundaries
Only pass fields client components actually use. Don't pass entire objects when only one field is needed.

### Strategic Suspense Boundaries
Use `<Suspense>` to show wrapper UI immediately while data loads. Only the data-dependent component waits.

### Hoist Static I/O to Module Level
Static assets (fonts, config, templates) in route handlers: load once at module level, not per request.

### CSS content-visibility for Long Lists
Apply `content-visibility: auto` with `contain-intrinsic-size` for off-screen items in long lists.

### Don't Define Components Inside Components
Defining components inside other components creates new types every render, causing full remounts and state loss. Always define separately and pass props.

### Use React DOM Resource Hints
Use `prefetchDNS`, `preconnect`, `preload`, `preinit` from `react-dom` for critical resources.

### Use defer/async on Script Tags
In Next.js, prefer `next/script` with `strategy` prop.

### Conditional Module Loading
Load large modules only when a feature is activated using dynamic `import()`.

## MEDIUM Impact

### Use after() for Non-Blocking Operations
Use Next.js `after()` to schedule logging/analytics/cleanup after response is sent.

### Per-Request Deduplication with React.cache()
Use `React.cache()` for DB queries, auth checks, and non-fetch async work. Use primitive args (not inline objects) for cache hits.

### Cross-Request LRU Caching
Use LRU cache for data shared across sequential requests.

### Use Functional setState Updates
Always use `setItems(curr => [...curr, ...newItems])` instead of `setItems([...items, ...newItems])` to avoid stale closures and unnecessary callback recreations.

### Lazy State Initialization
Pass functions to `useState` for expensive initial values: `useState(() => buildIndex(items))`.

### Calculate Derived State During Rendering
If a value can be computed from props/state, derive it during render. Don't store in state or update in useEffect.

### Subscribe to Derived State
Use `useMediaQuery('(max-width: 767px)')` instead of subscribing to continuous values like window width.

### Split Combined Hook Computations
Split hooks with independent dependencies into separate hooks to avoid unnecessary recomputation.

### Put Interaction Logic in Event Handlers
Side effects triggered by user actions belong in event handlers, not state + useEffect.

### Use useTransition Over Manual Loading States
Use `useTransition` for built-in `isPending` state instead of manual `useState` loading flags.

### Use useDeferredValue for Expensive Derived Renders
Keep input responsive while expensive computations lag behind.

### Use useRef for Transient Values
Store frequently changing values (mouse position, intervals) in refs when they don't need to trigger re-renders.

### Defer State Reads to Usage Point
Don't subscribe to dynamic state (searchParams) if you only read it inside callbacks. Read on demand.

### Version and Minimize localStorage Data
Add version prefix, store only needed fields, always wrap in try-catch.

### Passive Event Listeners for Scrolling
Add `{ passive: true }` to touch/wheel listeners that don't call `preventDefault()`.

### Use Activity Component for Show/Hide
Use React `<Activity>` to preserve state/DOM for expensive components that toggle visibility.

### Prevent Hydration Mismatch Without Flickering
For client-side storage values (theme), use synchronous inline script before React hydrates.

### Avoid Layout Thrashing
Never interleave style writes with layout reads. Batch all writes, then read. Prefer CSS classes.

### Defer Non-Critical Work with requestIdleCallback
Schedule analytics, storage writes, prefetching during browser idle periods.

### toSorted() Instead of sort()
Use `.toSorted()` for immutability. Never mutate arrays in React state/props.

## LOW-MEDIUM Impact

### Build Index Maps for Repeated Lookups
Use `new Map(items.map(i => [i.id, i]))` instead of repeated `.find()` calls.

### Use Set/Map for O(1) Lookups
Convert arrays to Set for repeated membership checks.

### Use flatMap for Map+Filter in One Pass
Replace `.map().filter(Boolean)` with `.flatMap(x => condition ? [value] : [])`.

### Cache Repeated Function Calls
Use module-level Map to cache pure function results called with same inputs.

### Early Return from Functions
Return immediately when result is determined to skip unnecessary processing.

### Combine Multiple Array Iterations
Combine multiple `.filter()` calls into a single loop.

### Hoist RegExp Creation
Don't create RegExp inside render. Hoist to module scope or memoize.

### Cache Property Access in Loops
Cache deep property lookups before hot loops.

### Initialize App Once, Not Per Mount
Use module-level guard for one-time initialization, not `useEffect([])`.

## Additional Guidelines

### Explicit Conditional Rendering
Use ternary `count > 0 ? <Badge /> : null` instead of `count && <Badge />` to prevent rendering `0`.

### Suppress Expected Hydration Mismatches
Use `suppressHydrationWarning` only for known server/client differences (dates, random IDs). Don't use to hide bugs.

### Optimize SVG
Reduce SVG coordinate precision. Animate wrapper `<div>` instead of SVG element for hardware acceleration.

### SWR for Client-Side Data Fetching
Use SWR for automatic deduplication, caching, and revalidation across component instances.

### Preload Based on User Intent
Preload heavy bundles on hover/focus before user clicks.

### Avoid Duplicate Serialization in RSC Props
Don't transform arrays (`.toSorted()`, `.filter()`) server-side when passing to client. Let client do transformations.

### Deferred Await
Move `await` into the branch where the value is actually used. Don't block early-return paths.

### Extract Default Non-Primitive Values from Memoized Components
```tsx
const NOOP = () => {};
const Component = memo(({ onClick = NOOP }) => { ... })
```
