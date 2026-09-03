import { expect, test } from "@playwright/test";

/**
 * Shell + auth journeys. These run with a real, pre-authenticated session
 * against the live ibl.ai platform, so a green run proves the SSO tokens,
 * tenant resolution and layout all work together — not just in isolation.
 */
test.describe("authenticated shell", () => {
  test("a signed-in visitor is not bounced to the login SPA", async ({ page }) => {
    await page.goto("/ai-avatar/my");
    await expect(page).not.toHaveURL(/login\.iblai\.app/);
    await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible({ timeout: 20_000 });
  });

  test("sidebar shows twin's four groups with the right items", async ({ page, isMobile }) => {
    await page.goto("/ai-avatar/my");
    await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible({ timeout: 20_000 });

    if (isMobile) {
      await expect(page.locator("aside")).toBeHidden();
      await page.getByRole("button", { name: "Open menu" }).click();
    } else {
      await expect(page.locator("aside")).toBeVisible();
    }
    const nav = page.getByRole("navigation", { name: "Main" });
    // Group labels are the uppercase <p> captions; "Voice" is both a group and
    // an item in twin, so scope to the caption element rather than any text.
    for (const group of ["Create", "My Videos", "Gallery", "Voice"]) {
      await expect(nav.locator("p", { hasText: new RegExp(`^${group}$`) })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Educational" })).toHaveAttribute("href", "/ai-avatar/my?category=MODERN");
    await expect(nav.getByRole("link", { name: "Historical" })).toHaveAttribute("href", "/ai-avatar/my?category=HISTORY");
  });

  test("profile menu opens with the signed-in email and all five actions", async ({ page, isMobile }) => {
    await page.goto("/ai-avatar/my");
    await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible({ timeout: 20_000 });
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();

    await page.getByRole("button", { name: /mashr9980/ }).first().click();
    const menu = page.getByRole("menu");
    await expect(menu.getByText("mashr9980@gmail.com")).toBeVisible();
    for (const item of ["Settings", "Dark mode", "Notifications", "Help & FAQ", "Log Out"]) {
      await expect(menu.getByText(item, { exact: true })).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  test("sidebar collapses to an icon rail on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "no rail on mobile");
    await page.goto("/ai-avatar/my");
    await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible({ timeout: 20_000 });
    const aside = page.locator("aside");
    const before = (await aside.boundingBox())!.width;
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect.poll(async () => (await aside.boundingBox())!.width).toBeLessThan(before / 2);
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await expect.poll(async () => (await aside.boundingBox())!.width).toBeGreaterThan(200);
  });

  test("the gallery renders the real catalogue for a credentialed tenant", async ({ page }) => {
    await page.goto("/ai-avatar/my");
    await expect(page.getByText("Choose an Avatar, add or select a Voice")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("HeyGen integration required")).toHaveCount(0);
    await expect(page.locator("img[alt$='avatar preview']").first()).toBeVisible({ timeout: 60_000 });
  });
});
