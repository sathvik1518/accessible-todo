import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length} element(s))`
  );
  expect(summary).toEqual([]);
}

async function addTask(page: Page, title: string) {
  await page.getByLabel("New task").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
}

async function focusRing(page: Page) {
  return page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
}

test("has no axe violations in any state (this also checks colour contrast)", async ({ page }) => {
  await page.goto("/");
  await expectNoViolations(page); // empty list

  await addTask(page, "Buy milk");
  await addTask(page, "Pay rent");
  await page.getByRole("checkbox", { name: "Pay rent" }).check();
  await expectNoViolations(page); // list with a done task

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Enter a task name.")).toBeVisible();
  await expectNoViolations(page); // error shown

  await page.getByRole("button", { name: "Delete Buy milk" }).click();
  await expect(page.getByRole("dialog", { name: "Delete task?" })).toBeVisible();
  await expectNoViolations(page); // dialog open
});

test("works with the keyboard only", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("New task")).toBeFocused();

  await page.keyboard.type("Buy milk");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("checkbox", { name: "Buy milk" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Task added: Buy milk");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Add", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("checkbox", { name: "Buy milk" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("checkbox", { name: "Buy milk" })).toBeChecked();

  await page.keyboard.press("Tab");
  const deleteButton = page.getByRole("button", { name: "Delete Buy milk" });
  await expect(deleteButton).toBeFocused();

  // Open the dialog, then close it with Escape. Focus must come back.
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Delete task?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toHaveCount(0); // plain locator: counts hidden elements too
  await expect(deleteButton).toBeFocused();

  // Open it again and confirm the delete.
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Delete", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByText("No tasks yet")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Task deleted: Buy milk");
  await expect(page.getByLabel("New task")).toBeFocused();
});

test("shows a visible focus ring", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab"); // skip link
  await page.keyboard.press("Tab"); // input
  await expect(page.getByLabel("New task")).toBeFocused();
  let ring = await focusRing(page);
  expect(ring.style).not.toBe("none");
  expect(ring.width).toBeGreaterThanOrEqual(2);

  await page.keyboard.press("Tab"); // Add button
  await expect(page.getByRole("button", { name: "Add", exact: true })).toBeFocused();
  ring = await focusRing(page);
  expect(ring.style).not.toBe("none");
  expect(ring.width).toBeGreaterThanOrEqual(2);
});

test("fits a 320 px screen with no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await addTask(page, "A".repeat(80)); // a very long word is the hardest case
  await addTask(page, "Call the school about the long weekend schedule");

  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
  );
  expect(fits).toBe(true);
});