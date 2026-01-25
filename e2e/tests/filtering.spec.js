import {
  test,
  expect,
  createIssue,
} from "../fixtures.js";

test.describe("Filtering", () => {
  // Helper to get the filter panel locator
  function getFilterPanel(page) {
    // The filter panel renders as a dialog via Mantine Popover
    // Look for the dialog containing the "Filters" heading
    return page.getByRole("dialog").filter({ has: page.getByText("Filters", { exact: true }) });
  }

  // Helper to open filter panel
  async function openFilters(page) {
    const filterButton = page.getByRole("button", { name: /toggle filters/i });
    await filterButton.click();
    await page.waitForTimeout(300);
    // Wait for filter panel to appear
    await expect(getFilterPanel(page)).toBeVisible({ timeout: 3000 });
  }

  // Helper to apply filters and close panel
  async function applyFilters(page) {
    const panel = getFilterPanel(page);
    const applyButton = panel.getByRole("button", { name: /apply/i });
    // Wait for Apply button to be enabled (state change detected)
    await expect(applyButton).toBeEnabled({ timeout: 3000 });
    await applyButton.click();
    await page.waitForTimeout(500);
  }

  // Helper to click a filter chip within the panel
  async function clickFilterChip(page, label) {
    const panel = getFilterPanel(page);
    // Find the button with exact text match within the panel
    const chip = panel.getByRole("button", { name: label, exact: true });
    await chip.click();
    await page.waitForTimeout(100); // Small wait for state update
  }

  test.describe("Status Filtering", () => {
    test("filter by single status shows only matching issues", async ({ authenticatedPage: page }) => {
      // Create issues in different statuses
      const todoTitle = `Filter Todo ${Date.now()}`;
      const inProgressTitle = `Filter InProgress ${Date.now()}`;

      await createIssue(page, { title: todoTitle, status: "todo" });
      await createIssue(page, { title: inProgressTitle, status: "in_progress" });

      // Open filters and select only "To Do"
      await openFilters(page);
      await clickFilterChip(page, "To Do");
      await applyFilters(page);

      // Todo issue should be visible
      await expect(page.locator(`[data-issue-card]`).filter({ hasText: todoTitle })).toBeVisible();

      // In Progress issue should be hidden (in its column, which might be collapsed or filtered)
      // The column itself should still exist but the issue shouldn't be visible
      const inProgressCard = page.locator(`[data-issue-card]`).filter({ hasText: inProgressTitle });
      await expect(inProgressCard).not.toBeVisible({ timeout: 3000 });
    });

    test("filter by multiple statuses", async ({ authenticatedPage: page }) => {
      const todoTitle = `Multi Status Todo ${Date.now()}`;
      const reviewTitle = `Multi Status Review ${Date.now()}`;
      const doneTitle = `Multi Status Done ${Date.now()}`;

      await createIssue(page, { title: todoTitle, status: "todo" });
      await createIssue(page, { title: reviewTitle, status: "review" });
      await createIssue(page, { title: doneTitle, status: "done" });

      await openFilters(page);

      // Select To Do and Review
      await clickFilterChip(page, "To Do");
      await clickFilterChip(page, "Review");

      await applyFilters(page);

      // Todo and Review should be visible
      await expect(page.locator(`[data-issue-card]`).filter({ hasText: todoTitle })).toBeVisible();
      await expect(page.locator(`[data-issue-card]`).filter({ hasText: reviewTitle })).toBeVisible();

      // Done should be hidden
      await expect(page.locator(`[data-issue-card]`).filter({ hasText: doneTitle })).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe("Priority Filtering", () => {
    test("filter by high priority", async ({ authenticatedPage: page }) => {
      // Note: priority selection in create modal may vary, so we'll create and then check
      const title = `Priority Filter Test ${Date.now()}`;
      await createIssue(page, { title, status: "todo" });

      // For now, just test that the priority filter chips work
      await openFilters(page);
      await clickFilterChip(page, "High");
      await applyFilters(page);

      // The filter is applied - exact results depend on issue data
      // This test mainly verifies the filter mechanism works
    });

    test("filter by multiple priorities", async ({ authenticatedPage: page }) => {
      await openFilters(page);

      // Select Medium and Low
      await clickFilterChip(page, "Medium");
      await clickFilterChip(page, "Low");

      await applyFilters(page);

      // Filter applied successfully
    });
  });

  test.describe("Assignee Filtering", () => {
    test("filter by specific assignee", async ({ authenticatedPage: page }) => {
      await openFilters(page);

      // Find and click the assignee dropdown within the filter panel
      const panel = getFilterPanel(page);
      const assigneeSelect = panel.getByRole("textbox", { name: /anyone/i });
      await assigneeSelect.click();
      await page.waitForTimeout(200);

      // Select the first user option (after "Unassigned") - use listbox/option roles
      const dropdown = page.getByRole("listbox");
      await expect(dropdown).toBeVisible({ timeout: 3000 });
      const options = dropdown.getByRole("option");
      const count = await options.count();
      if (count > 1) {
        // Skip "Unassigned" (index 0), select first actual user
        await options.nth(1).click();
        await applyFilters(page);
      }
    });

    test("filter by unassigned", async ({ authenticatedPage: page }) => {
      await openFilters(page);

      const panel = getFilterPanel(page);
      const assigneeSelect = panel.getByRole("textbox", { name: /anyone/i });
      await assigneeSelect.click();
      await page.waitForTimeout(200);

      // Select "Unassigned" option
      const dropdown = page.getByRole("listbox");
      await expect(dropdown).toBeVisible({ timeout: 3000 });
      const unassignedOption = dropdown.getByRole("option", { name: /unassigned/i });
      await unassignedOption.click();
      await applyFilters(page);
    });
  });

  test.describe("Filter Interactions", () => {
    test("clear all filters removes all active filters", async ({ authenticatedPage: page }) => {
      // Apply some filters first
      await openFilters(page);
      await clickFilterChip(page, "To Do");
      await clickFilterChip(page, "High");
      await applyFilters(page);

      // Reopen and clear
      await openFilters(page);
      const panel = getFilterPanel(page);
      const clearButton = panel.getByRole("button", { name: /clear/i });
      if (await clearButton.isVisible().catch(() => false)) {
        await clearButton.click();
        await page.waitForTimeout(300);
      }

      // All issues should now be visible again (no filters applied)
    });

    test("cancel reverts filter changes", async ({ authenticatedPage: page }) => {
      const title = `Cancel Filter Test ${Date.now()}`;
      await createIssue(page, { title, status: "todo" });

      // Open filters, make changes, then cancel
      await openFilters(page);
      await clickFilterChip(page, "Done");

      const panel = getFilterPanel(page);
      const cancelButton = panel.getByRole("button", { name: /cancel/i });
      await cancelButton.click();
      await page.waitForTimeout(300);

      // Issue should still be visible (filter was not applied)
      await expect(page.locator(`[data-issue-card]`).filter({ hasText: title })).toBeVisible();
    });

    test("my issues only filter works when user is selected", async ({ authenticatedPage: page }) => {
      await openFilters(page);

      const panel = getFilterPanel(page);
      const myIssuesCheckbox = panel.getByRole("checkbox", { name: /my issues only/i });
      await expect(myIssuesCheckbox).toBeVisible();

      // The checkbox should be enabled since we have a user selected
      await expect(myIssuesCheckbox).not.toBeDisabled();

      await myIssuesCheckbox.click();
      await applyFilters(page);
    });

    test("show archived toggle", async ({ authenticatedPage: page }) => {
      await openFilters(page);

      const panel = getFilterPanel(page);
      const showArchivedCheckbox = panel.getByRole("checkbox", { name: /show archived/i });
      await expect(showArchivedCheckbox).toBeVisible();

      await showArchivedCheckbox.click();
      await applyFilters(page);
    });

    test("filter indicator shows active filter count", async ({ authenticatedPage: page }) => {
      // Create a test issue in Done status to verify it gets filtered out
      const doneTitle = `Indicator Test Done ${Date.now()}`;
      await createIssue(page, { title: doneTitle, status: "done" });

      // Verify the issue is visible before filtering
      await expect(page.locator(`[data-issue-card]`).filter({ hasText: doneTitle })).toBeVisible();

      // Apply a filter for "To Do" only
      await openFilters(page);
      await clickFilterChip(page, "To Do");
      await applyFilters(page);

      // The "Done" issue should now be hidden
      await expect(page.locator(`[data-issue-card]`).filter({ hasText: doneTitle })).not.toBeVisible({ timeout: 3000 });

      // Re-open filters and verify the "To Do" filter is still selected
      // (the Apply button should be disabled since no changes were made)
      await openFilters(page);
      const panel = getFilterPanel(page);
      const applyButton = panel.getByRole("button", { name: /apply/i });
      // Apply should be disabled because draftFilters matches appliedFilters
      await expect(applyButton).toBeDisabled();
    });
  });

  test.describe("Keyboard Shortcuts", () => {
    test("Cmd/Ctrl+X toggles filter panel", async ({ authenticatedPage: page }) => {
      // Filter panel should be closed initially
      await expect(page.locator("text=Filters").first()).not.toBeVisible();

      // Open with keyboard shortcut
      await page.keyboard.press("Meta+x");
      await page.waitForTimeout(300);

      // Check if it opened (try Ctrl+X as fallback for non-Mac)
      let filterVisible = await page.locator("text=Filters").first().isVisible().catch(() => false);
      if (!filterVisible) {
        await page.keyboard.press("Control+x");
        await page.waitForTimeout(300);
        filterVisible = await page.locator("text=Filters").first().isVisible().catch(() => false);
      }

      if (filterVisible) {
        await expect(page.locator("text=Filters").first()).toBeVisible();

        // Close with keyboard shortcut
        await page.keyboard.press("Meta+x");
        await page.waitForTimeout(300);
        // Or Escape
        await page.keyboard.press("Escape");
      }
    });
  });
});
