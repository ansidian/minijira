/**
 * Basic API integration tests for MiniJira
 *
 * Tests CRUD operations for issues, comments, and related endpoints.
 *
 * Run with: npm test
 * Requires: npm run dev to be running
 */

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

  // ==========================================================================
  // USERS
  // ==========================================================================

  describe("Users API", () => {
    it("GET /users - should return list of users", async () => {
      const users = await api.get("/users");

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      expect(users[0]).toHaveProperty("id");
      expect(users[0]).toHaveProperty("name");
      expect(users[0]).toHaveProperty("avatar_color");
    });

    it("GET /users/:id - should return a single user", async () => {
      const users = await api.get("/users");
      const user = await api.get(`/users/${users[0].id}`);

      expect(user.id).toBe(users[0].id);
      expect(user.name).toBe(users[0].name);
    });

    it("GET /users/:id - should return 404 for non-existent user", async () => {
      await expect(api.get("/users/99999")).rejects.toThrow("User not found");
    });
  });

  // ==========================================================================
  // ISSUES - CRUD
  // ==========================================================================

  describe("Issues API - CRUD", () => {
    it("POST /issues - should create an issue with minimal data", async () => {
      const issue = await api.post("/issues", {
        title: uniqueTitle("Minimal Issue"),
      });
      cleanup.trackIssue(issue.id);

      expect(issue.id).toBeDefined();
      expect(issue.key).toMatch(/^JPL-\d+$/);
      expect(issue.title).toContain("Minimal Issue");
      expect(issue.status).toBe("todo"); // default
      expect(issue.priority).toBe("medium"); // default
    });

    it("POST /issues - should create an issue with all fields", async () => {
      const users = await api.get("/users");
      const assignee = users[0];
      const reporter = users[1] || users[0];

      const issue = await api.post("/issues", {
        title: uniqueTitle("Full Issue"),
        description: "This is a test description",
        status: "in_progress",
        priority: "high",
        assignee_id: assignee.id,
        reporter_id: reporter.id,
      });
      cleanup.trackIssue(issue.id);

      expect(issue.title).toContain("Full Issue");
      expect(issue.description).toBe("This is a test description");
      expect(issue.status).toBe("in_progress");
      expect(issue.priority).toBe("high");
      expect(issue.assignee_id).toBe(assignee.id);
      expect(issue.assignee_name).toBe(assignee.name);
      expect(issue.reporter_id).toBe(reporter.id);
    });

    it("POST /issues - should reject issue without title", async () => {
      await expect(
        api.post("/issues", { description: "No title" })
      ).rejects.toThrow("Title is required");
    });

    it("GET /issues - should return list of parent issues", async () => {
      const issue = await api.post("/issues", {
        title: uniqueTitle("List Test"),
        status: "todo",
      });
      cleanup.trackIssue(issue.id);

      const issues = await api.get("/issues");

      expect(Array.isArray(issues)).toBe(true);
      const found = issues.find((i) => i.id === issue.id);
      expect(found).toBeDefined();
      expect(found.parent_id).toBeNull();
    });

    it("GET /issues/:id - should return a single issue with computed fields", async () => {
      const created = await api.post("/issues", {
        title: uniqueTitle("Single Issue"),
        status: "review",
        priority: "low",
      });
      cleanup.trackIssue(created.id);

      const issue = await api.get(`/issues/${created.id}`);

      expect(issue.id).toBe(created.id);
      expect(issue.key).toBe(created.key);
      expect(issue.subtask_count).toBe(0);
      expect(issue.subtask_done_count).toBe(0);
    });

    it("GET /issues/:id - should return 404 for non-existent issue", async () => {
      await expect(api.get("/issues/99999")).rejects.toThrow("Issue not found");
    });

    it("PATCH /issues/:id - should update issue fields", async () => {
      const issue = await api.post("/issues", {
        title: uniqueTitle("Update Test"),
        status: "todo",
        priority: "low",
      });
      cleanup.trackIssue(issue.id);

      const updated = await api.patch(`/issues/${issue.id}`, {
        title: "Updated Title",
        status: "done",
        priority: "high",
      });

      expect(updated.title).toBe("Updated Title");
      expect(updated.status).toBe("done");
      expect(updated.priority).toBe("high");
      expect(updated.previous_status).toBe("todo"); // stored when moving to done
    });

    it("PATCH /issues/:id - should track previous_status when moving to done", async () => {
      const issue = await api.post("/issues", {
        title: uniqueTitle("Previous Status Test"),
        status: "in_progress",
      });
      cleanup.trackIssue(issue.id);

      const doneIssue = await api.patch(`/issues/${issue.id}`, {
        status: "done",
      });
      expect(doneIssue.previous_status).toBe("in_progress");

      // Moving from done should clear previous_status
      const reopened = await api.patch(`/issues/${issue.id}`, {
        status: "review",
      });
      expect(reopened.previous_status).toBeNull();
    });

    it("DELETE /issues/:id - should delete an issue", async () => {
      const issue = await api.post("/issues", {
        title: uniqueTitle("Delete Test"),
      });

      await api.delete(`/issues/${issue.id}`);

      // Verify it's gone
      await expect(api.get(`/issues/${issue.id}`)).rejects.toThrow(
        "Issue not found"
      );
    });

    it("DELETE /issues/:id - should return 404 for non-existent issue", async () => {
      await expect(api.delete("/issues/99999")).rejects.toThrow(
        "Issue not found"
      );
    });
  });

  // ==========================================================================
  // ISSUES - FILTERING
  // ==========================================================================

  describe("Issues API - Filtering", () => {
    it("GET /issues?status=X - should filter by status", async () => {
      const issue = await api.post("/issues", {
        title: uniqueTitle("Filter Status"),
        status: "review",
      });
      cleanup.trackIssue(issue.id);

      const reviewIssues = await api.get("/issues?status=review");
      const todoIssues = await api.get("/issues?status=todo");

      expect(reviewIssues.some((i) => i.id === issue.id)).toBe(true);
      expect(todoIssues.some((i) => i.id === issue.id)).toBe(false);
    });

    it("GET /issues?priority=X - should filter by priority", async () => {
      const issue = await api.post("/issues", {
        title: uniqueTitle("Filter Priority"),
        priority: "high",
      });
      cleanup.trackIssue(issue.id);

      const highPriority = await api.get("/issues?priority=high");
      const lowPriority = await api.get("/issues?priority=low");

      expect(highPriority.some((i) => i.id === issue.id)).toBe(true);
      expect(lowPriority.some((i) => i.id === issue.id)).toBe(false);
    });

    it("GET /issues?assignee_id=X - should filter by assignee", async () => {
      const users = await api.get("/users");
      const assignee = users[0];

      const issue = await api.post("/issues", {
        title: uniqueTitle("Filter Assignee"),
        assignee_id: assignee.id,
      });
      cleanup.trackIssue(issue.id);

      const assigned = await api.get(`/issues?assignee_id=${assignee.id}`);
      expect(assigned.some((i) => i.id === issue.id)).toBe(true);
    });
  });

  // ==========================================================================
  // SUBTASKS
  // ==========================================================================

  describe("Subtasks API", () => {
    it("POST /issues - should create a subtask with parent_id", async () => {
      const parent = await api.post("/issues", {
        title: uniqueTitle("Parent Issue"),
      });
      cleanup.trackIssue(parent.id);

      const subtask = await api.post("/issues", {
        title: uniqueTitle("Subtask"),
        parent_id: parent.id,
      });
      cleanup.trackIssue(subtask.id);

      expect(subtask.parent_id).toBe(parent.id);
      expect(subtask.parent_key).toBe(parent.key);
    });

    it("POST /issues - should reject subtask with non-existent parent", async () => {
      await expect(
        api.post("/issues", {
          title: uniqueTitle("Orphan Subtask"),
          parent_id: 99999,
        })
      ).rejects.toThrow("Parent issue not found");
    });

    it("GET /issues/:id/subtasks - should return subtasks for parent", async () => {
      const parent = await api.post("/issues", {
        title: uniqueTitle("Parent for Subtasks"),
      });
      cleanup.trackIssue(parent.id);

      const subtask1 = await api.post("/issues", {
        title: uniqueTitle("Subtask 1"),
        parent_id: parent.id,
      });
      const subtask2 = await api.post("/issues", {
        title: uniqueTitle("Subtask 2"),
        parent_id: parent.id,
      });
      cleanup.trackIssue(subtask1.id);
      cleanup.trackIssue(subtask2.id);

      const subtasks = await api.get(`/issues/${parent.id}/subtasks`);

      expect(subtasks).toHaveLength(2);
      expect(subtasks.map((s) => s.id).sort()).toEqual(
        [subtask1.id, subtask2.id].sort()
      );
    });

    it("GET /issues - should exclude subtasks by default", async () => {
      const parent = await api.post("/issues", {
        title: uniqueTitle("Parent Exclude Test"),
      });
      cleanup.trackIssue(parent.id);

      const subtask = await api.post("/issues", {
        title: uniqueTitle("Hidden Subtask"),
        parent_id: parent.id,
      });
      cleanup.trackIssue(subtask.id);

      const issues = await api.get("/issues");
      expect(issues.some((i) => i.id === subtask.id)).toBe(false);
      expect(issues.some((i) => i.id === parent.id)).toBe(true);
    });

    it("GET /issues?include_subtasks=true - should include subtasks", async () => {
      const parent = await api.post("/issues", {
        title: uniqueTitle("Parent Include Test"),
      });
      cleanup.trackIssue(parent.id);

      const subtask = await api.post("/issues", {
        title: uniqueTitle("Visible Subtask"),
        parent_id: parent.id,
      });
      cleanup.trackIssue(subtask.id);

      const issues = await api.get("/issues?include_subtasks=true");
      expect(issues.some((i) => i.id === subtask.id)).toBe(true);
    });

    it("should update parent subtask_count and subtask_done_count", async () => {
      const parent = await api.post("/issues", {
        title: uniqueTitle("Count Test Parent"),
      });
      cleanup.trackIssue(parent.id);

      // Verify initial count
      let parentData = await api.get(`/issues/${parent.id}`);
      expect(parentData.subtask_count).toBe(0);
      expect(parentData.subtask_done_count).toBe(0);

      // Add subtasks
      const st1 = await api.post("/issues", {
        title: uniqueTitle("Subtask Done"),
        parent_id: parent.id,
        status: "done",
      });
      const st2 = await api.post("/issues", {
        title: uniqueTitle("Subtask Todo"),
        parent_id: parent.id,
        status: "todo",
      });
      cleanup.trackIssue(st1.id);
      cleanup.trackIssue(st2.id);

      // Verify counts updated
      parentData = await api.get(`/issues/${parent.id}`);
      expect(parentData.subtask_count).toBe(2);
      expect(parentData.subtask_done_count).toBe(1);

      // Mark second as done
      await api.patch(`/issues/${st2.id}`, { status: "done" });
      parentData = await api.get(`/issues/${parent.id}`);
      expect(parentData.subtask_done_count).toBe(2);
    });
  });

  // ==========================================================================
  // COMMENTS
  // ==========================================================================

  describe("Comments API", () => {
    it("POST /issues/:id/comments - should create a comment", async () => {
      const issue = await api.post("/issues", {
        title: uniqueTitle("Comment Test"),
      });
      cleanup.trackIssue(issue.id);

      const users = await api.get("/users");
      const comment = await api.post(`/issues/${issue.id}/comments`, {
        body: "This is a test comment",
        user_id: users[0].id,
      });

      expect(comment.id).toBeDefined();
      expect(comment.body).toBe("This is a test comment");
      expect(comment.user_id).toBe(users[0].id);
      expect(comment.user_name).toBe(users[0].name);
    });

    it("POST /issues/:id/comments - should reject empty comment", async () => {
      const issue = await api.post("/issues", {
        title: uniqueTitle("Empty Comment Test"),
      });
      cleanup.trackIssue(issue.id);

      await expect(
        api.post(`/issues/${issue.id}/comments`, { body: "" })
      ).rejects.toThrow("Comment body is required");
    });

    it("GET /issues/:id/comments - should return comments for issue", async () => {
      const issue = await api.post("/issues", {
        title: uniqueTitle("Get Comments Test"),
      });
      cleanup.trackIssue(issue.id);

      const users = await api.get("/users");
      await api.post(`/issues/${issue.id}/comments`, {
        body: "Comment 1",
        user_id: users[0].id,
      });
      await api.post(`/issues/${issue.id}/comments`, {
        body: "Comment 2",
        user_id: users[0].id,
      });

      const comments = await api.get(`/issues/${issue.id}/comments`);

      expect(comments).toHaveLength(2);
      expect(comments[0].body).toBe("Comment 1");
      expect(comments[1].body).toBe("Comment 2");
    });

    it("GET /issues/:id/comments - should return 404 for non-existent issue", async () => {
      await expect(
        api.post("/issues/99999/comments", { body: "test" })
      ).rejects.toThrow("Issue not found");
    });
  });

  // ==========================================================================
  // STATS
  // ==========================================================================

  describe("Stats API", () => {
    it("GET /stats - should return issue counts by status", async () => {
      const stats = await api.get("/stats");

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("todo");
      expect(stats).toHaveProperty("in_progress");
      expect(stats).toHaveProperty("review");
      expect(stats).toHaveProperty("done");

      expect(typeof stats.total).toBe("number");
      expect(typeof stats.todo).toBe("number");
      expect(typeof stats.in_progress).toBe("number");
      expect(typeof stats.review).toBe("number");
      expect(typeof stats.done).toBe("number");
    });

    it("GET /stats - should update after creating and deleting issues", async () => {
      // Create issue with unique status to track
      const issue = await api.post("/issues", {
        title: uniqueTitle("Stats Update Test"),
        status: "review", // Use review as it's less common
      });

      const afterCreate = await api.get("/stats");
      const reviewCountAfterCreate = afterCreate.review;

      // Delete the issue
      await api.delete(`/issues/${issue.id}`);

      const afterDelete = await api.get("/stats");

      // Verify the specific status decreased after deletion
      expect(afterDelete.review).toBe(reviewCountAfterCreate - 1);
    });

    it("GET /stats - should not count subtasks by default", async () => {
      // Create parent and subtask
      const parent = await api.post("/issues", {
        title: uniqueTitle("Stats Parent"),
        status: "review", // Use review as it's less common
      });
      cleanup.trackIssue(parent.id);

      const subtask = await api.post("/issues", {
        title: uniqueTitle("Stats Subtask"),
        status: "review",
        parent_id: parent.id,
      });
      cleanup.trackIssue(subtask.id);

      const withSubtask = await api.get("/stats");
      const reviewWithSubtask = withSubtask.review;

      // Delete subtask
      await api.delete(`/issues/${subtask.id}`);
      cleanup.issueIds = cleanup.issueIds.filter((id) => id !== subtask.id);

      const afterSubtaskDelete = await api.get("/stats");

      // Subtasks aren't counted
      expect(afterSubtaskDelete.review).toBe(reviewWithSubtask);

      // Delete parent
      await api.delete(`/issues/${parent.id}`);
      cleanup.issueIds = cleanup.issueIds.filter((id) => id !== parent.id);

      const afterParentDelete = await api.get("/stats");

      // Review count decrease by 1 (only parent counted)
      expect(afterParentDelete.review).toBe(reviewWithSubtask - 1);
    });
  });
});
