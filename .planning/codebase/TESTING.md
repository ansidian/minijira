# Testing Patterns

**Analysis Date:** 2026-01-23

## Test Framework

**Runner:**
- Vitest 4.0.15
- Config: `vitest.config.js`

**Assertion Library:**
- Vitest built-in assertions (no separate assertion library; standard methods like `expect()`, `toBe()`, `toThrow()`)

**Run Commands:**
```bash
npm test              # Run all tests (vitest run)
npm run test:watch   # Watch mode (vitest)
npm run test:race    # Run only race condition tests (vitest run --testNamePattern='race|concurrent')
```

## Test File Organization

**Location:**
- Separate from source code: `tests/` directory in project root
- Not co-located with source files

**Naming:**
- Descriptive test names with `.test.js` suffix
- Examples: `api.test.js`, `race-conditions.test.js`

**Structure:**
```
tests/
├── api.test.js                # API integration tests
├── race-conditions.test.js     # Concurrency and stress tests
└── test-utils.js              # Shared utilities (not a test file)
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { api, TestCleanup, waitForServer, uniqueTitle } from "./test-utils.js";

describe("API Integration Tests", () => {
  const cleanup = new TestCleanup();

  beforeAll(async () => {
    await waitForServer();
  });

  afterEach(async () => {
    await cleanup.cleanup();
  });

  describe("Users API", () => {
    it("GET /users - should return list of users", async () => {
      const users = await api.get("/users");
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });
  });
});
```

**Patterns:**
- Setup: `beforeAll()` waits for server availability (one-time setup)
- Teardown: `afterEach()` runs `cleanup.cleanup()` to delete created resources after each test
- Nested describes: Logical grouping by API endpoint/feature (Users API, Issues CRUD, Filtering, etc.)
- Test names: Descriptive sentence format starting with HTTP method or action
  - Example: `"POST /issues - should create an issue with minimal data"`
  - Example: `"should generate unique keys when creating 10 issues concurrently"`

## Mocking

**Framework:** No explicit mocking library; manual stubs and real API calls

**Patterns:**
- No mocks used; tests hit real running server (`npm run dev` required)
- Real database used (SQLite or Turso depending on environment)
- Test utilities provide a wrapper around native `fetch()` that adds error handling
  ```javascript
  export const api = {
    async get(path) {
      const res = await fetch(`${API_BASE}${path}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    async post(path, data) { ... },
    async patch(path, data) { ... },
    async delete(path) { ... }
  };
  ```

**What to Mock:**
- Nothing explicitly mocked; integration tests require live server

**What NOT to Mock:**
- Database calls (use real SQLite or Turso)
- HTTP requests (hit real API endpoints)
- SSE/EventSource connections (test real broadcasts)

## Fixtures and Factories

**Test Data:**
- No fixture files; data generated dynamically per test
- Unique issue titles generated with timestamp and random string:
  ```javascript
  export function uniqueTitle(prefix = "Test Issue") {
    return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  ```
- User data fetched from running server (`GET /users`)

**Location:**
- Test utilities in `tests/test-utils.js`
- Data generation functions: `uniqueTitle()`, `api` wrapper

## Coverage

**Requirements:** No coverage requirements enforced or measured

**View Coverage:** No commands available; coverage tracking not configured

## Test Types

**Unit Tests:**
- Not present; only integration tests exist
- No isolated unit test files

**Integration Tests:**
- Location: `tests/api.test.js`
- Scope: Full API endpoint tests including database interactions
- Approach: Start with server running, hit endpoints, verify responses and database state
- Coverage areas:
  - Users CRUD: Get all, get one, 404 handling
  - Issues CRUD: Create with minimal/full data, get, update, delete
  - Filtering: By status, assignee, priority
  - Subtasks: Creation, listing, hierarchy enforcement
  - Comments: Create, update, delete
  - Activity logging: Verify action tracking
  - Stats: Count calculations

**Race Condition Tests:**
- Location: `tests/race-conditions.test.js`
- Scope: Concurrency and stress testing
- Approach: Fire multiple concurrent requests to same or different endpoints
- Coverage areas:
  - Atomic issue key generation (no duplicate keys under concurrent creation)
  - Concurrent status changes (data consistency)
  - Concurrent subtask operations (parent/child consistency)
  - Rapid mutations on same resource

## Common Patterns

**Async Testing:**
```javascript
it("POST /issues - should create an issue with all fields", async () => {
  const users = await api.get("/users");
  const issue = await api.post("/issues", {
    title: uniqueTitle("Full Issue"),
    description: "This is a test description",
  });
  cleanup.trackIssue(issue.id);

  expect(issue.title).toContain("Full Issue");
});
```
- Pattern: `await` API calls sequentially or with `Promise.all()` for concurrent operations
- Cleanup tracked immediately after creation: `cleanup.trackIssue(issue.id)`

**Error Testing:**
```javascript
it("GET /users/:id - should return 404 for non-existent user", async () => {
  await expect(api.get("/users/99999")).rejects.toThrow("User not found");
});

it("POST /issues - should reject issue without title", async () => {
  await expect(
    api.post("/issues", { description: "No title" })
  ).rejects.toThrow("Title is required");
});
```
- Pattern: Use `expect(...).rejects.toThrow()` to catch expected errors
- Verify error message matches expected string

**Concurrent Request Testing:**
```javascript
it("should generate unique keys when creating 10 issues concurrently", async () => {
  const NUM_CONCURRENT = 10;

  const createPromises = Array.from({ length: NUM_CONCURRENT }, (_, i) =>
    api.post("/issues", {
      title: uniqueTitle(`Concurrent Issue ${i}`),
    })
  );

  const results = await Promise.all(createPromises);
  results.forEach((issue) => cleanup.trackIssue(issue.id));

  const keys = results.map((r) => r.key);
  const uniqueKeys = new Set(keys);
  expect(uniqueKeys.size).toBe(NUM_CONCURRENT);
});
```
- Pattern: Use `Array.from()` to generate parallel requests
- Use `Promise.all()` to fire simultaneously
- Verify uniqueness/consistency of results

## Test Cleanup

**TestCleanup Class:**
- Tracks issue IDs created during tests
- Deletes resources in reverse order (subtasks before parents to avoid cascade issues)
- Ignores errors during cleanup (resources may be deleted already)

```javascript
export class TestCleanup {
  constructor() {
    this.issueIds = [];
  }

  trackIssue(issueId) {
    this.issueIds.push(issueId);
  }

  async cleanup() {
    for (const id of [...this.issueIds].reverse()) {
      try {
        await api.delete(`/issues/${id}`);
      } catch (e) {
        // Ignore errors
      }
    }
    this.issueIds = [];
  }
}
```

## Test Configuration

**Vitest Config (`vitest.config.js`):**
```javascript
export default defineConfig({
  test: {
    fileParallelism: false,     // Run test files sequentially
    sequence: {
      concurrent: false,        // Run tests within files sequentially too
    },
    testTimeout: 30000,         // 30s timeout (for stress tests)
    hookTimeout: 10000,         // 10s timeout for beforeAll/afterEach
  },
});
```

**Why Sequential Execution:**
- Tests share a single SQLite database
- Concurrent execution would cause race conditions and test interference
- Stress tests intentionally use concurrency to test application-level race conditions

## Server Requirements

**Startup:**
- Tests require `npm run dev` to be running (both server and client)
- `waitForServer()` utility polls `GET /api/users` until server responds
- Default: 10 attempts, 500ms delay between attempts
- Throws if server not available after max attempts

```javascript
export async function waitForServer(maxAttempts = 10, delayMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await api.get("/users");
      return true;
    } catch (e) {
      if (i === maxAttempts - 1) {
        throw new Error(
          `Server not available after ${maxAttempts} attempts. Make sure 'npm run dev' is running.`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
```

---

*Testing analysis: 2026-01-23*
