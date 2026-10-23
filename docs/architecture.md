# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Implement the UI as a thin React + Vite layer that fetches data from the API and renders the four capabilities with explicit loading, empty, success, and error states. Keep all domain logic in the API; the browser should consume JSON and not contain business logic.
- Logic tier decision: Build the Express HTTP layer as a thin adapter around a service module. Validate incoming payloads with deliberate 4xx responses, transform Mongoose documents into the API contract shape, and keep the route handlers focused on request/response concerns.
- Data tier decision: Use Mongoose schemas with required fields, defaults, and relationship metadata to protect the database contract. Seed representative fixtures idempotently so each capability has realistic data without duplicating or corrupting prior records.
- Activity tracking approach: Validate that `userId` and `teamId` are valid ObjectIds and that the referenced `User` and `Team` documents exist. Reject bad or missing references with a 4xx status instead of allowing a Mongo cast error to bubble into a 500. Persist `user`, `team`, `type`, and `minutes` and compute `points` and `occurredAt` server-side.
- Team management approach: Require `name` and `mascot` on creation, default `members` to an empty array, and preserve `members` as ObjectId references when the payload includes them. List teams with their member IDs accessible to the API contract and frontend.
- Leaderboard approach: Aggregate team totals by summing activity `points` for each team, sort by total descending, and assign a 1-based `rank` to the ordered leaderboard entries. Return entries with the shape `{ teamName, totalPoints, rank }`.
- Workout suggestions approach: Resolve the seeded user by email, prefer workouts matching the user’s `fitnessGoal` or the most recent activity pattern, and include a `reason` string explaining the match. If no user matches the email, respond with a deliberate 4xx (for example `404`) instead of returning a generic empty list.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Acceptance criteria: the Mongoose schema validation tests pass, `seed()` is idempotent, and seeded fixtures include representative users, teams, activities, and workouts without removing unrelated data.
  - Failure meaning: the Data tier contract is not satisfied; required fields/defaults/relationships or idempotent seed logic are still incorrect.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Acceptance criteria: invalid activity/team payloads return 4xx, valid creates return `201`, lists return arrays of expected objects, leaderboard totals are ordered correctly, and workout suggestions match the requested user’s preferences with a `reason` field and a 4xx for unknown users.
  - Failure meaning: the Logic tier is not enforcing the API contract, especially around validation, lookup errors, aggregation, and suggestion matching.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Acceptance criteria: each capability route renders data from `/api` responses, announces loading while pending, shows empty states for empty arrays, and renders an accessible alert for server errors.
  - Failure meaning: the Presentation tier is not handling request lifecycle states correctly or is still showing placeholder implementation.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Acceptance criteria: the TypeScript backend compiles cleanly with no type or build errors.
  - Failure meaning: the logic/data code does not satisfy the TypeScript build contract or imports/exports are broken.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Acceptance criteria: the Vite React app compiles cleanly and the generated bundle includes the working route components.
  - Failure meaning: the presentation layer still has unresolved imports, invalid JSX, or incompatible API usage.

### Required validation and default rules

- `User` schema: `name`, `email`, and `fitnessGoal` must be present and meaningful. A blank or missing model instance should fail validation.
- `Team` schema: `name` and `mascot` are required. `members` must exist as an array and default to `[]` when omitted.
- `Activity` schema: `user`, `team`, `type`, `minutes`, `points`, and `occurredAt` are required. These fields enforce the relationship between a user, team, and activity record.
- `Workout` schema: `title`, `focus`, `minutes`, and `difficulty` are required. This ensures the suggestion engine has enough information to rank and explain workout matches.

### Required API contract behaviors

- `POST /api/activities`
  - Input: `{ userId, teamId, type, minutes }`
  - Valid response: `201`, body `{ activity: { user, team, type, minutes, points, occurredAt } }`
  - Invalid input: any malformed ID, missing referenced user/team, or missing required data should return a deliberate 4xx status (`400`, `404`, or similar) and never a `500` due to cast error.
- `POST /api/teams`
  - Input: `{ name, mascot, members? }`
  - Valid response: `201`, body `{ team: { name, mascot, members } }`
  - Invalid input: missing `name` should return `400`.
- `GET /api/activities`
  - Response: `{ activities: [...] }`
- `GET /api/teams`
  - Response: `{ teams: [...] }`
- `GET /api/leaderboard`
  - Response: `{ leaderboard: [{ teamName, totalPoints, rank }, ...] }`
  - Ordering: highest total points first; rank starts at 1.
- `GET /api/workouts/suggestions/:userEmail`
  - Response: `{ suggestions: [{ title, focus, reason, ... }, ...] }`
  - First suggestion must match the user’s fitness goal or recent activity and include an explanatory `reason` string.
  - Unknown email: deliberate 4xx (for example `404`).

### Required frontend states

The frontend contract expects one shared pattern across all capability pages:

- Loading state: while `fetch` is pending, expose a status element whose text includes `loading`.
- Empty state: when the response body contains an empty array (`activities: []`, `teams: []`, `leaderboard: []`, or `suggestions: []`), render a meaningful empty message matching `/no activities/i`, `/no teams/i`, `/no (leaderboard|rankings|scores)/i`, or `/no (workout|suggestions)/i`.
- Success state: render the returned data from the API, including activity names/types, team names, leaderboard totals, and workout titles/reasons.
- Error state: when the API responds with a non-OK status, show an accessible `role="alert"` that contains `unable`, `unavailable`, or `error`.

### Baseline status

Current baseline from the starter project before implementation:
- Backend: 8 failed, 1 passed
- Frontend: 15 failed

This baseline confirms that the implementation is intentionally incomplete and that the safe progress path is Data → Logic → Presentation, as described above.
