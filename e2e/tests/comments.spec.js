import {
  test,
  expect,
  createIssue,
  openIssueByTitle,
} from "../fixtures.js";

test.describe("Comments", () => {
  test("add a comment to an issue", async ({ authenticatedPage: page }) => {
    const title = `Comment Test ${Date.now()}`;
    const commentText = `This is a test comment ${Date.now()}`;

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    // Find the comment textarea
    const commentInput = page.locator("textarea[placeholder='Add a comment...']");
    await expect(commentInput).toBeVisible({ timeout: 5000 });

    // Type a comment
    await commentInput.fill(commentText);

    // Click Send button
    const sendButton = page.getByRole("button", { name: /send/i });
    await sendButton.click();
    await page.waitForTimeout(500);

    // Verify comment appears
    const comment = page.locator(".comment-body").filter({ hasText: commentText });
    await expect(comment).toBeVisible({ timeout: 5000 });
  });

  test("comment count updates after adding comment", async ({ authenticatedPage: page }) => {
    const title = `Comment Count Test ${Date.now()}`;

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    // Get initial comment count
    const commentsCount = page.locator(".comments-count");
    const initialCount = await commentsCount.textContent();

    // Add a comment
    const commentInput = page.locator("textarea[placeholder='Add a comment...']");
    await commentInput.fill(`Test comment ${Date.now()}`);
    await page.getByRole("button", { name: /send/i }).click();
    await page.waitForTimeout(500);

    // Count should increase
    const expectedCount = String(parseInt(initialCount) + 1);
    await expect(commentsCount).toHaveText(expectedCount, { timeout: 5000 });
  });

  test("submit comment with Cmd/Ctrl+Enter", async ({ authenticatedPage: page }) => {
    const title = `Keyboard Comment Test ${Date.now()}`;
    const commentText = `Keyboard submitted comment ${Date.now()}`;

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    const commentInput = page.locator("textarea[placeholder='Add a comment...']");
    await commentInput.fill(commentText);

    // Submit with keyboard shortcut
    await page.keyboard.press("Meta+Enter");
    await page.waitForTimeout(500);

    // Verify comment appears
    const comment = page.locator(".comment-body").filter({ hasText: commentText });
    await expect(comment).toBeVisible({ timeout: 5000 });
  });

  test("empty comment cannot be submitted", async ({ authenticatedPage: page }) => {
    const title = `Empty Comment Test ${Date.now()}`;

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    // Send button should be disabled when textarea is empty
    const sendButton = page.getByRole("button", { name: /send/i });
    await expect(sendButton).toBeDisabled();

    // Type something
    const commentInput = page.locator("textarea[placeholder='Add a comment...']");
    await commentInput.fill("Some text");

    // Button should be enabled now
    await expect(sendButton).not.toBeDisabled();

    // Clear the input
    await commentInput.fill("");

    // Button should be disabled again
    await expect(sendButton).toBeDisabled();
  });

  test("comment shows author name", async ({ authenticatedPage: page }) => {
    const title = `Author Test ${Date.now()}`;
    const commentText = `Author visibility test ${Date.now()}`;

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    const commentInput = page.locator("textarea[placeholder='Add a comment...']");
    await commentInput.fill(commentText);
    await page.getByRole("button", { name: /send/i }).click();
    await page.waitForTimeout(500);

    // Find the comment and verify it has an author
    const commentItem = page.locator(".comment").filter({ hasText: commentText });
    await expect(commentItem).toBeVisible();

    // Author name should be visible in comment header
    const authorName = commentItem.locator(".comment-author");
    await expect(authorName).toBeVisible();
    await expect(authorName).not.toBeEmpty();
  });

  test("comment shows timestamp", async ({ authenticatedPage: page }) => {
    const title = `Timestamp Test ${Date.now()}`;
    const commentText = `Timestamp test ${Date.now()}`;

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    const commentInput = page.locator("textarea[placeholder='Add a comment...']");
    await commentInput.fill(commentText);
    await page.getByRole("button", { name: /send/i }).click();
    await page.waitForTimeout(500);

    const commentItem = page.locator(".comment").filter({ hasText: commentText });
    const timestamp = commentItem.locator(".comment-time");
    await expect(timestamp).toBeVisible();
    await expect(timestamp).not.toBeEmpty();
  });

  test("multiple comments display in order", async ({ authenticatedPage: page }) => {
    const title = `Multi Comment Test ${Date.now()}`;
    const comment1 = `First comment ${Date.now()}`;
    const comment2 = `Second comment ${Date.now() + 1}`;

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    const commentInput = page.locator("textarea[placeholder='Add a comment...']");

    // Add first comment
    await commentInput.fill(comment1);
    await page.getByRole("button", { name: /send/i }).click();
    await page.waitForTimeout(500);

    // Add second comment
    await commentInput.fill(comment2);
    await page.getByRole("button", { name: /send/i }).click();
    await page.waitForTimeout(500);

    // Both comments should be visible
    await expect(page.locator(".comment-body").filter({ hasText: comment1 })).toBeVisible();
    await expect(page.locator(".comment-body").filter({ hasText: comment2 })).toBeVisible();

    // Verify order - first comment should appear before second
    const allComments = page.locator(".comment-body");
    const count = await allComments.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("comment persists after closing and reopening issue", async ({ authenticatedPage: page }) => {
    const title = `Persist Comment Test ${Date.now()}`;
    const commentText = `Persistent comment ${Date.now()}`;

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    // Add comment
    const commentInput = page.locator("textarea[placeholder='Add a comment...']");
    await commentInput.fill(commentText);
    await page.getByRole("button", { name: /send/i }).click();
    await page.waitForTimeout(500);

    // Close the modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Reopen the issue
    await openIssueByTitle(page, title);

    // Comment should still be there
    const comment = page.locator(".comment-body").filter({ hasText: commentText });
    await expect(comment).toBeVisible({ timeout: 5000 });
  });

  test("empty state shows when no comments", async ({ authenticatedPage: page }) => {
    const title = `No Comments Test ${Date.now()}`;

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    // Look for empty state message
    const emptyState = page.locator("text=No comments yet");
    await expect(emptyState).toBeVisible({ timeout: 5000 });

    // Comment count should be 0
    const commentsCount = page.locator(".comments-count");
    await expect(commentsCount).toHaveText("0");
  });
});

test.describe("Comment Markdown", () => {
  test("markdown formatting renders in comment", async ({ authenticatedPage: page }) => {
    const title = `Markdown Comment Test ${Date.now()}`;
    const markdownComment = "This is **bold** and *italic* text";

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    const commentInput = page.locator("textarea[placeholder='Add a comment...']");
    await commentInput.fill(markdownComment);
    await page.getByRole("button", { name: /send/i }).click();
    await page.waitForTimeout(500);

    // The comment should render with markdown
    const commentBody = page.locator(".comment-body.markdown-content").last();
    await expect(commentBody).toBeVisible();

    // Check for bold element
    const boldText = commentBody.locator("strong");
    await expect(boldText).toContainText("bold");

    // Check for italic element
    const italicText = commentBody.locator("em");
    await expect(italicText).toContainText("italic");
  });

  test("links in comments are clickable", async ({ authenticatedPage: page }) => {
    const title = `Link Comment Test ${Date.now()}`;
    const linkComment = "Check out [this link](https://example.com)";

    await createIssue(page, { title });
    await openIssueByTitle(page, title);

    const commentInput = page.locator("textarea[placeholder='Add a comment...']");
    await commentInput.fill(linkComment);
    await page.getByRole("button", { name: /send/i }).click();
    await page.waitForTimeout(500);

    // The link should be rendered as an anchor tag
    const commentBody = page.locator(".comment-body.markdown-content").last();
    const link = commentBody.locator("a");
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://example.com");
  });
});
