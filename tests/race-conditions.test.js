/**
 * Race condition and concurrency stress tests
 *
 * These tests verify that the fixes for race conditions are working:
 * 1. Atomic issue key generation (no duplicate keys under concurrent creation)
 * 2. Concurrent status changes don't corrupt data
 * 3. Concurrent subtask operations maintain consistency
 *
 * Run with: npm run test:race
 * Requires: npm run dev to be running
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { api, TestCleanup, waitForServer, uniqueTitle } from "./test-utils.js";

describe("Race Condition Tests", () => {
  const cleanup = new TestCleanup();

  beforeAll(async () => {
    await waitForServer();
  });

  afterEach(async () => {
    await cleanup.cleanup();
  });

  describe("Issue Key Generation - race condition prevention", () => {
    it("should generate unique keys when creating 10 issues concurrently", async () => {
      const NUM_CONCURRENT = 10;

      // Fire all creation requests simultaneously
      const createPromises = Array.from({ length: NUM_CONCURRENT }, (_, i) =>
        api.post("/issues", {
          title: uniqueTitle(`Concurrent Issue ${i}`),
          status: "todo",
          priority: "medium",
        })
      );

      const results = await Promise.all(createPromises);

      // Track for cleanup
      results.forEach((issue) => cleanup.trackIssue(issue.id));

      // Verify all succeeded
      expect(results).toHaveLength(NUM_CONCURRENT);
      results.forEach((issue) => {
        expect(issue.id).toBeDefined();
        expect(issue.key).toMatch(/^JPL-\d+$/);
      });

      // Verify all keys are unique
      const keys = results.map((r) => r.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(NUM_CONCURRENT);
    });

    it("should generate sequential keys (no gaps) under concurrent load", async () => {
      const NUM_CONCURRENT = 10;

      const createPromises = Array.from({ length: NUM_CONCURRENT }, (_, i) =>
        api.post("/issues", {
          title: uniqueTitle(`Sequential Test ${i}`),
          status: "todo",
          priority: "low",
        })
      );

      const results = await Promise.all(createPromises);
      results.forEach((issue) => cleanup.trackIssue(issue.id));

      // Extract key numbers and sort
      const keyNumbers = results
        .map((r) => parseInt(r.key.replace("JPL-", "")))
        .sort((a, b) => a - b);

      // Verify they are sequential (no gaps)
      for (let i = 1; i < keyNumbers.length; i++) {
        expect(keyNumbers[i]).toBe(keyNumbers[i - 1] + 1);
      }
    });
  });

  describe("Concurrent Status Changes - race condition prevention", () => {
    it("should handle rapid status changes on the same issue", async () => {
      // Create a test issue
      const issue = await api.post("/issues", {
        title: uniqueTitle("Rapid Status Change"),
        status: "todo",
        priority: "medium",
      });
      cleanup.trackIssue(issue.id);

      // Rapidly change status back and forth
      const statusSequence = [
        "in_progress",
        "todo",
        "review",
        "in_progress",
        "done",
        "review",
        "done",
      ];

      // Fire all changes as fast as possible (sequentially but without waiting between)
      for (const status of statusSequence) {
        await api.patch(`/issues/${issue.id}`, { status });
      }

      // Verify final state
      const finalIssue = await api.get(`/issues/${issue.id}`);
      expect(finalIssue.status).toBe("done"); // Last status in sequence
    });

    it("should handle concurrent status changes on different issues", async () => {
      const NUM_ISSUES = 10;

      // Create test issues
      const issues = await Promise.all(
        Array.from({ length: NUM_ISSUES }, (_, i) =>
          api.post("/issues", {
            title: uniqueTitle(`Concurrent Status ${i}`),
            status: "todo",
            priority: "medium",
          })
        )
      );
      issues.forEach((issue) => cleanup.trackIssue(issue.id));

      // Change all statuses concurrently
      const updatePromises = issues.map((issue, i) =>
        api.patch(`/issues/${issue.id}`, {
          status: i % 2 === 0 ? "in_progress" : "done",
        })
      );

      const results = await Promise.all(updatePromises);

      // Verify all updates succeeded with correct status
      results.forEach((result, i) => {
        expect(result.status).toBe(i % 2 === 0 ? "in_progress" : "done");
      });

      // Verify by re-fetching
      const verifyPromises = issues.map((issue) =>
        api.get(`/issues/${issue.id}`)
      );
      const verified = await Promise.all(verifyPromises);

      verified.forEach((issue, i) => {
        expect(issue.status).toBe(i % 2 === 0 ? "in_progress" : "done");
      });
    });
  });

  describe("Concurrent Subtask Operations - race condition prevention", () => {
    it("should handle concurrent subtask creation under same parent", async () => {
      // Create parent issue
      const parent = await api.post("/issues", {
        title: uniqueTitle("Parent for Concurrent Subtasks"),
        status: "todo",
        priority: "high",
      });
      cleanup.trackIssue(parent.id);

      const NUM_SUBTASKS = 10;

      // Create subtasks concurrently
      const subtaskPromises = Array.from({ length: NUM_SUBTASKS }, (_, i) =>
        api.post("/issues", {
          title: uniqueTitle(`Subtask ${i}`),
          status: "todo",
          priority: "medium",
          parent_id: parent.id,
        })
      );

      const subtasks = await Promise.all(subtaskPromises);
      subtasks.forEach((st) => cleanup.trackIssue(st.id));

      // Verify all subtasks created with unique keys
      expect(subtasks).toHaveLength(NUM_SUBTASKS);
      const keys = subtasks.map((s) => s.key);
      expect(new Set(keys).size).toBe(NUM_SUBTASKS);

      // Verify parent's subtask count
      const updatedParent = await api.get(`/issues/${parent.id}`);
      expect(updatedParent.subtask_count).toBe(NUM_SUBTASKS);
    });

    it("should handle concurrent subtask status changes", async () => {
      // Create parent with subtasks
      const parent = await api.post("/issues", {
        title: uniqueTitle("Parent for Status Changes"),
        status: "in_progress",
        priority: "high",
      });
      cleanup.trackIssue(parent.id);

      const subtasks = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          api.post("/issues", {
            title: uniqueTitle(`Subtask ${i}`),
            status: "todo",
            priority: "medium",
            parent_id: parent.id,
          })
        )
      );
      subtasks.forEach((st) => cleanup.trackIssue(st.id));

      // Mark all subtasks as done concurrently
      const updatePromises = subtasks.map((st) =>
        api.patch(`/issues/${st.id}`, { status: "done" })
      );

      await Promise.all(updatePromises);

      // Verify parent's done count
      const updatedParent = await api.get(`/issues/${parent.id}`);
      expect(updatedParent.subtask_done_count).toBe(5);
    });

    it("should handle concurrent fetch of same parent's subtasks", async () => {
      // Create parent with subtasks
      const parent = await api.post("/issues", {
        title: uniqueTitle("Parent for Concurrent Fetch"),
        status: "todo",
        priority: "medium",
      });
      cleanup.trackIssue(parent.id);

      const subtasks = await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          api.post("/issues", {
            title: uniqueTitle(`Subtask ${i}`),
            status: "todo",
            priority: "low",
            parent_id: parent.id,
          })
        )
      );
      subtasks.forEach((st) => cleanup.trackIssue(st.id));

      // Fetch subtasks concurrently (simulates multiple UI components expanding)
      const fetchPromises = Array.from({ length: 10 }, () =>
        api.get(`/issues/${parent.id}/subtasks`)
      );

      const results = await Promise.all(fetchPromises);

      // All should return the same data
      results.forEach((result) => {
        expect(result).toHaveLength(3);
        expect(result.map((s) => s.id).sort()).toEqual(
          subtasks.map((s) => s.id).sort()
        );
      });
    });
  });

  describe("Stats Consistency - race condition prevention", () => {
    it("should maintain accurate stats after concurrent operations", async () => {
      // Create issues with different statuses concurrently
      const statusDistribution = [
        "todo",
        "todo",
        "in_progress",
        "in_progress",
        "review",
        "done",
        "done",
        "done",
      ];

      const createPromises = statusDistribution.map((status, i) =>
        api.post("/issues", {
          title: uniqueTitle(`Stats Test ${i}`),
          status,
          priority: "medium",
        })
      );

      const issues = await Promise.all(createPromises);
      issues.forEach((issue) => cleanup.trackIssue(issue.id));

      // Get stats after creation
      const afterCreateStats = await api.get("/stats");

      // Now delete all concurrently
      const deletePromises = issues.map((issue) =>
        api.delete(`/issues/${issue.id}`)
      );
      await Promise.all(deletePromises);

      // Clear tracking since we deleted manually
      cleanup.issueIds = [];

      // Get stats after deletion
      const afterDeleteStats = await api.get("/stats");

      // Verify stats decreased by the expected amounts
      // (relative change from afterCreate to afterDelete)
      expect(afterDeleteStats.todo).toBe(afterCreateStats.todo - 2);
      expect(afterDeleteStats.in_progress).toBe(afterCreateStats.in_progress - 2);
      expect(afterDeleteStats.review).toBe(afterCreateStats.review - 1);
      expect(afterDeleteStats.done).toBe(afterCreateStats.done - 3);
    });
  });
});
