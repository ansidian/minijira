# Testing Patterns

**Analysis Date:** 2026-01-20

## Test Framework

**Runner:**
- Vitest 4.0.15
- Config: Not explicitly configured (relies on Vite defaults)

**Assertion Library:**
- Vitest built-in assertions (expect API)

**Run Commands:**
```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:race     # Run only race condition tests
```

## Test File Organization

**Location:**
- Tests in separate `tests/` directory at project root (not co-located with source)
- Test files live outside `client/` and `server/` directories

**Naming:**
- Pattern: `*.test.js`
- Examples: `tests/api.test.js`, `tests/race-conditions.test.js`
- Test utilities: `tests/test-utils.js`

**Structure:**
```
minijira/
├── tests/
│   ├── api.test.js                    # CRUD and filtering tests
│   ├── race-conditions.test.js        # Concurrency tests
│   └── test-utils.js                  # Shared test helpers
```

## Test Structure

**Suite Organization:**
```javascript
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
    });
  });
});
```

**Patterns:**
- Nested `describe` blocks for logical grouping (e.g., "Users API", "Issues API - CRUD", "Issues API - Filtering")
- Top-level suite creates cleanup instance
- `beforeAll` waits for server availability
- `afterEach` cleans up test data
- Test names follow pattern: `HTTP_METHOD /endpoint - should description`
- Descriptive test names explain expected behavior

## Mocking

**Framework:** None (integration tests only)

**Patterns:**
- No mocking - tests run against real server
- Tests require `npm run dev` to be running
- Database operations are real (SQLite/Turso)
- Server must be available before tests start

**What to Mock:**
- Nothing mocked in current test suite
- All tests are integration tests hitting real API

**What NOT to Mock:**
- Database calls (tests use actual database)
- HTTP requests (tests use fetch to real server)
- Server responses (tests verify actual API behavior)

## Fixtures and Factories

**Test Data:**

**Unique title generation:**
```javascript
export function uniqueTitle(prefix = "Test Issue") {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
```

**API wrapper:**
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
  // ... post, patch, delete
};
```

**Cleanup helper:**
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

**Location:**
- All test utilities in `tests/test-utils.js`
- No separate fixtures directory
- Test data created inline in tests using `api.post()`

## Coverage

**Requirements:** None enforced

**Configuration:** No coverage config detected

**View Coverage:**
- No coverage reporting configured
- Vitest supports coverage via `vitest --coverage` but not set up in package.json

## Test Types

**Unit Tests:**
- Not present in current suite

**Integration Tests:**
- All tests are integration tests
- Test full request/response cycle through Express API
- Verify database state changes
- Test files: `tests/api.test.js`, `tests/race-conditions.test.js`

**E2E Tests:**
- Not present
- No browser automation (Playwright, Cypress) detected

## Common Patterns

**Async Testing:**
```javascript
it("POST /issues - should create an issue with minimal data", async () => {
  const issue = await api.post("/issues", {
    title: uniqueTitle("Minimal Issue"),
  });
  cleanup.trackIssue(issue.id);

  expect(issue.id).toBeDefined();
  expect(issue.key).toMatch(/^JPL-\d+$/);
});
```

**Error Testing:**
```javascript
it("POST /issues - should reject issue without title", async () => {
  await expect(
    api.post("/issues", { description: "No title" })
  ).rejects.toThrow("Title is required");
});

it("GET /users/:id - should return 404 for non-existent user", async () => {
  await expect(api.get("/users/99999")).rejects.toThrow("User not found");
});
```

**Concurrent Testing:**
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

**State Verification:**
```javascript
it("should update parent subtask_count and subtask_done_count", async () => {
  const parent = await api.post("/issues", {
    title: uniqueTitle("Count Test Parent"),
  });
  cleanup.trackIssue(parent.id);

  let parentData = await api.get(`/issues/${parent.id}`);
  expect(parentData.subtask_count).toBe(0);
  expect(parentData.subtask_done_count).toBe(0);

  // Create subtasks...

  parentData = await api.get(`/issues/${parent.id}`);
  expect(parentData.subtask_count).toBe(2);
  expect(parentData.subtask_done_count).toBe(1);
});
```

## Test Data Management

**Creating test data:**
- Use `api.post()` to create issues, comments, etc.
- Track created IDs with `cleanup.trackIssue(id)`
- Generate unique titles to avoid conflicts: `uniqueTitle("My Test")`

**Cleaning up:**
- `afterEach` hook calls `cleanup.cleanup()`
- Cleanup deletes in reverse order (subtasks before parents)
- Ignores deletion errors (cascade deletes, already deleted)
- Clears tracking array after cleanup

**Server dependency:**
- `beforeAll` waits up to 10 attempts (5 seconds) for server
- Throws error if server not available
- Tests expect server at `http://localhost:3001`

## Test Characteristics

**Test isolation:**
- Each test creates its own data
- Cleanup after each test prevents pollution
- Tests can run in any order (no interdependencies)

**Assertions:**
- Use Vitest's `expect` API
- Common matchers: `.toBe()`, `.toEqual()`, `.toHaveLength()`, `.toMatch()`, `.toBeDefined()`, `.rejects.toThrow()`
- Verify response structure and values
- Check computed fields (subtask counts, joined user data)

**Test organization:**
- Grouped by resource (Users, Issues, Comments, Stats)
- Further grouped by operation type (CRUD, Filtering)
- Separate file for race condition tests
- Comment blocks divide major sections

---

*Testing analysis: 2026-01-20*
