import { test as base, expect } from "@playwright/test";

// Valid 1x1 PNG image bytes
export const VALID_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0x0f, 0x00, 0x00, 0x01, 0x01, 0x00, 0x18,
  0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);

// Extended test fixture with app-specific helpers
export const test = base.extend({
  // Auto-select user before each test
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await selectUser(page);
    await use(page);
  },
});

// Select the first available user from the dropdown
export async function selectUser(page) {
  const select = page.locator("select.user-select");
  await expect(select).toBeVisible({ timeout: 10_000 });

  const options = await select.locator("option").all();
  for (const option of options) {
    const value = await option.getAttribute("value");
    if (value && value !== "") {
      await select.selectOption(value);
      break;
    }
  }

  const overlay = page.locator(".user-prompt-overlay");
  await expect(overlay).toBeHidden({ timeout: 10_000 });
}

// Close any open modals
export async function closeModals(page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  const modalOverlay = page.locator(".mantine-Modal-overlay").first();
  if (await modalOverlay.isVisible().catch(() => false)) {
    await modalOverlay.click({ position: { x: 10, y: 10 }, force: true });
    await page.waitForTimeout(500);
  }

  await expect(page.locator(".mantine-Modal-content"))
    .toHaveCount(0, { timeout: 5000 })
    .catch(() => {});
}

// Open the create issue modal
export async function openCreateIssueModal(page) {
  await page.click('button:has-text("+ Add To Do")', { timeout: 5000 });
  await page.waitForTimeout(500);
}

// Get the description textarea in create/edit modal
export function getDescriptionTextarea(page) {
  return page.getByRole("textbox", { name: "Add a description..." });
}

// Create a DataTransfer with a file for drag/drop testing
export async function createFileDataTransfer(page, fileData, fileName, mimeType) {
  return await page.evaluateHandle(
    ([data, name, type]) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(data)], name, { type });
      dt.items.add(file);
      return dt;
    },
    [Array.from(fileData), fileName, mimeType]
  );
}

// Simulate dropping a file on an element
export async function dropFile(element, dataTransfer) {
  await element.dispatchEvent("dragover", { dataTransfer });
  await element.dispatchEvent("drop", { dataTransfer });
}

// Simulate pasting a file
export async function pasteFile(element, fileData, fileName, mimeType) {
  await element.evaluate(
    (el, [data, name, type]) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(data)], name, { type });
      dt.items.add(file);

      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      el.dispatchEvent(pasteEvent);
    },
    [Array.from(fileData), fileName, mimeType]
  );
}

// Create an issue and return its unique title
export async function createIssue(page, { title, description, priority, status } = {}) {
  const uniqueTitle = title || `E2E Test Issue ${Date.now()}`;

  // Click the appropriate add button based on status
  const statusButtonMap = {
    todo: "+ Add To Do",
    in_progress: "+ Add In Progress",
    review: "+ Add Review",
    done: "+ Add Done",
  };
  const buttonText = statusButtonMap[status] || "+ Add To Do";
  await page.click(`button:has-text("${buttonText}")`, { timeout: 5000 });
  await page.waitForTimeout(300);

  // Fill title
  const titleInput = page.getByRole("textbox", { name: /what needs to be done/i });
  await titleInput.fill(uniqueTitle);

  // Fill description if provided
  if (description) {
    const descTextarea = getDescriptionTextarea(page);
    await descTextarea.fill(description);
  }

  // Set priority if provided
  if (priority) {
    const prioritySelect = page.locator('select').filter({ hasText: /low|medium|high/i });
    if (await prioritySelect.isVisible().catch(() => false)) {
      await prioritySelect.selectOption(priority);
    }
  }

  // Submit the form
  const createButton = page.getByRole("button", { name: /create/i });
  await createButton.click();
  await page.waitForTimeout(500);

  // Wait for modal to close
  await expect(page.locator(".mantine-Modal-content")).toHaveCount(0, { timeout: 5000 });

  return uniqueTitle;
}

// Find and click an issue card by its title
export async function openIssueByTitle(page, title) {
  const issueCard = page.locator(`[data-issue-card]`).filter({ hasText: title }).first();
  await expect(issueCard).toBeVisible({ timeout: 5000 });
  await issueCard.click();
  await page.waitForTimeout(300);
}

// Move an issue to a different column via context menu
// Note: Named "dragIssueToColumn" for backward compatibility, but uses context menu
// because Playwright's dragTo() doesn't properly handle HTML5 drag/drop with dataTransfer
export async function dragIssueToColumn(page, issueTitle, targetStatus) {
  const statusMenuMap = {
    todo: "To Do",
    in_progress: "In Progress",
    review: "Review",
    done: "Done",
  };

  const issueCard = page.locator(`[data-issue-card]`).filter({ hasText: issueTitle }).first();
  await expect(issueCard).toBeVisible({ timeout: 5000 });

  // Right-click to open context menu
  await issueCard.click({ button: "right" });
  await page.waitForTimeout(200);

  // Hover over "Change Status" to open submenu
  const changeStatusItem = page.locator("text=Change Status").first();
  await expect(changeStatusItem).toBeVisible({ timeout: 3000 });
  await changeStatusItem.hover();
  await page.waitForTimeout(200);

  // Click the target status in the submenu
  const statusOption = page.locator(`text=${statusMenuMap[targetStatus]}`).last();
  await expect(statusOption).toBeVisible({ timeout: 3000 });
  await statusOption.click();
  await page.waitForTimeout(500);
}

// Open the filter panel (via keyboard shortcut)
export async function openFilterPanel(page) {
  await page.keyboard.press("Meta+x");
  // Fallback for non-Mac
  await page.waitForTimeout(100);
  const filterPanel = page.locator("text=Filters").first();
  if (!(await filterPanel.isVisible().catch(() => false))) {
    await page.keyboard.press("Control+x");
  }
  await page.waitForTimeout(300);
}

// Close any open filter panel
export async function closeFilterPanel(page) {
  const cancelButton = page.getByRole("button", { name: /cancel/i }).first();
  if (await cancelButton.isVisible().catch(() => false)) {
    await cancelButton.click();
    await page.waitForTimeout(200);
  }
}

// Delete the currently open issue
export async function deleteCurrentIssue(page) {
  // Expand danger zone
  const dangerZone = page.locator("text=Danger zone");
  await dangerZone.click();
  await page.waitForTimeout(200);

  // Click delete button
  const deleteButton = page.getByRole("button", { name: /delete issue/i });
  await deleteButton.click();
  await page.waitForTimeout(200);

  // Confirm deletion
  const confirmButton = page.getByRole("button", { name: /yes, delete/i });
  await confirmButton.click();
  await page.waitForTimeout(500);
}

export { expect };
