import { test, expect, createIssue, dragIssueToColumn } from "../fixtures.js";

test.describe("Board Movement", () => {
  test("move issue from To Do to In Progress", async ({ authenticatedPage: page }) => {
    const title = `Drag Test ${Date.now()}`;
    await createIssue(page, { title, status: "todo" });

    // Verify issue is in To Do column
    const todoColumn = page.locator(".column").filter({ hasText: "To Do" });
    await expect(todoColumn.locator(`[data-issue-card]`).filter({ hasText: title })).toBeVisible();

    // Move to In Progress
    await dragIssueToColumn(page, title, "in_progress");

    // Verify issue moved to In Progress column
    const inProgressColumn = page.locator(".column").filter({ hasText: "In Progress" });
    await expect(inProgressColumn.locator(`[data-issue-card]`).filter({ hasText: title })).toBeVisible({ timeout: 5000 });

    // Verify no longer in To Do
    await expect(todoColumn.locator(`[data-issue-card]`).filter({ hasText: title })).not.toBeVisible();
  });

  test("move issue from In Progress to Review", async ({ authenticatedPage: page }) => {
    const title = `Progress to Review ${Date.now()}`;
    await createIssue(page, { title, status: "in_progress" });

    const inProgressColumn = page.locator(".column").filter({ hasText: "In Progress" });
    await expect(inProgressColumn.locator(`[data-issue-card]`).filter({ hasText: title })).toBeVisible();

    await dragIssueToColumn(page, title, "review");

    const reviewColumn = page.locator(".column").filter({ hasText: "Review" });
    await expect(reviewColumn.locator(`[data-issue-card]`).filter({ hasText: title })).toBeVisible({ timeout: 5000 });
  });

  test("move issue from Review to Done", async ({ authenticatedPage: page }) => {
    const title = `Review to Done ${Date.now()}`;
    await createIssue(page, { title, status: "review" });

    await dragIssueToColumn(page, title, "done");

    const doneColumn = page.locator(".column").filter({ hasText: "Done" });
    await expect(doneColumn.locator(`[data-issue-card]`).filter({ hasText: title })).toBeVisible({ timeout: 5000 });
  });

  test("move issue backwards from Done to Review", async ({ authenticatedPage: page }) => {
    const title = `Done to Review ${Date.now()}`;
    await createIssue(page, { title, status: "done" });

    const doneColumn = page.locator(".column").filter({ hasText: "Done" });
    await expect(doneColumn.locator(`[data-issue-card]`).filter({ hasText: title })).toBeVisible();

    await dragIssueToColumn(page, title, "review");

    const reviewColumn = page.locator(".column").filter({ hasText: "Review" });
    await expect(reviewColumn.locator(`[data-issue-card]`).filter({ hasText: title })).toBeVisible({ timeout: 5000 });
  });
});
