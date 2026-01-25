import {
  test,
  expect,
  createIssue,
  openIssueByTitle,
  deleteCurrentIssue,
  getDescriptionTextarea,
} from "../fixtures.js";

test.describe("Issue Lifecycle", () => {
  test("create a new issue with title only", async ({ authenticatedPage: page }) => {
    const title = await createIssue(page, { title: `Simple Issue ${Date.now()}` });

    // Verify the issue appears on the board
    const issueCard = page.locator(`[data-issue-card]`).filter({ hasText: title });
    await expect(issueCard).toBeVisible({ timeout: 5000 });
  });

  test("create issue with title and description", async ({ authenticatedPage: page }) => {
    const title = `Described Issue ${Date.now()}`;
    const description = "This is a test description for the issue.";

    await createIssue(page, { title, description });

    // Open the issue and verify description
    await openIssueByTitle(page, title);

    const descriptionText = page.locator(".editable-block-description.markdown-content");
    await expect(descriptionText).toContainText(description);
  });

  test("view issue details", async ({ authenticatedPage: page }) => {
    const title = `View Details Test ${Date.now()}`;
    await createIssue(page, { title });

    // Open the issue
    await openIssueByTitle(page, title);

    // Verify modal opened with issue details
    const modal = page.locator(".mantine-Modal-content");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(title);

    // Verify issue key is displayed (e.g., JPL-123)
    const issueKey = modal.locator("text=/JPL-\\d+/");
    await expect(issueKey).toBeVisible();
  });

  test("edit issue title", async ({ authenticatedPage: page }) => {
    const originalTitle = `Edit Title Test ${Date.now()}`;
    const newTitle = `Updated Title ${Date.now()}`;

    await createIssue(page, { title: originalTitle });
    await openIssueByTitle(page, originalTitle);

    // Click the title block to enter edit mode
    const titleBlock = page.locator(".editable-block-title");
    await titleBlock.click();
    await page.waitForTimeout(300);

    // Now in edit mode - find the title textarea (placeholder "Issue title")
    const titleTextarea = page.locator("textarea[placeholder='Issue title']");
    await expect(titleTextarea).toBeVisible({ timeout: 3000 });
    await titleTextarea.fill(newTitle);

    // Click Save Changes button
    const saveButton = page.getByRole("button", { name: /save changes/i });
    await saveButton.click();
    await page.waitForTimeout(500);

    // Close modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Verify updated title on board
    const updatedCard = page.locator(`[data-issue-card]`).filter({ hasText: newTitle });
    await expect(updatedCard).toBeVisible({ timeout: 5000 });
  });

  test("edit issue description", async ({ authenticatedPage: page }) => {
    const title = `Edit Description Test ${Date.now()}`;
    const newDescription = "This is the updated description content.";

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    // Click the description placeholder to enter edit mode
    const descriptionBlock = page.locator(".editable-block-placeholder, .editable-block-description").first();
    await descriptionBlock.click();
    await page.waitForTimeout(300);

    // Now in edit mode - find the description textarea
    const descTextarea = page.locator("textarea[placeholder='Add a description...']");
    await expect(descTextarea).toBeVisible({ timeout: 3000 });
    await descTextarea.fill(newDescription);

    // Click Save Changes button
    const saveButton = page.getByRole("button", { name: /save changes/i });
    await saveButton.click();
    await page.waitForTimeout(500);

    // Verify description is saved (should now show in markdown-content)
    const savedDescription = page.locator(".editable-block-description.markdown-content");
    await expect(savedDescription).toContainText(newDescription);
  });

  test("delete an issue", async ({ authenticatedPage: page }) => {
    const title = `Delete Test ${Date.now()}`;
    await createIssue(page, { title });

    // Verify it exists
    const issueCard = page.locator(`[data-issue-card]`).filter({ hasText: title });
    await expect(issueCard).toBeVisible();

    // Open and delete
    await openIssueByTitle(page, title);
    await deleteCurrentIssue(page);

    // Wait for modal to close
    await expect(page.locator(".mantine-Modal-content")).toHaveCount(0, { timeout: 5000 });

    // Verify issue is gone from board
    await expect(issueCard).not.toBeVisible({ timeout: 5000 });
  });

  test("cancel delete does not remove issue", async ({ authenticatedPage: page }) => {
    const title = `Cancel Delete Test ${Date.now()}`;
    await createIssue(page, { title });

    await openIssueByTitle(page, title);

    // Expand danger zone
    const dangerZone = page.locator("text=Danger zone");
    await dangerZone.click();
    await page.waitForTimeout(200);

    // Click delete button
    const deleteButton = page.getByRole("button", { name: /delete issue/i });
    await deleteButton.click();
    await page.waitForTimeout(200);

    // Click cancel instead of confirm
    const cancelButton = page.getByRole("button", { name: "Cancel" });
    await cancelButton.click();
    await page.waitForTimeout(200);

    // Close modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Verify issue still exists
    const issueCard = page.locator(`[data-issue-card]`).filter({ hasText: title });
    await expect(issueCard).toBeVisible();
  });

  test("issue persists after page reload", async ({ authenticatedPage: page }) => {
    const title = `Persistence Test ${Date.now()}`;
    await createIssue(page, { title });

    // Reload the page
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Re-select user after reload
    const select = page.locator("select.user-select");
    await expect(select).toBeVisible({ timeout: 10000 });
    const options = await select.locator("option").all();
    for (const option of options) {
      const value = await option.getAttribute("value");
      if (value && value !== "") {
        await select.selectOption(value);
        break;
      }
    }
    await expect(page.locator(".user-prompt-overlay")).toBeHidden({ timeout: 10000 });

    // Verify issue still exists
    const issueCard = page.locator(`[data-issue-card]`).filter({ hasText: title });
    await expect(issueCard).toBeVisible({ timeout: 5000 });
  });
});
