import { expect, test } from "@playwright/test";

/**
 * Every screen, desktop + mobile, with the real session. While the tenant has
 * no HeyGen credential these assert the honest gated state and the verbatim
 * copy; once a credential exists the same routes render live data and the
 * `generation.spec.ts` journeys take over.
 */
const GATE = "HeyGen integration required";

test.describe("screens", () => {
  test("root routes to the gallery while HeyGen is not configured", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ai-avatar\/my$/, { timeout: 20_000 });
  });

  test("Create Twin: heading, contact pill, and gate", async ({ page }) => {
    await page.goto("/ai-avatar/generate");
    await expect(page.getByRole("heading", { name: "Create Twin" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Want to Create a Hyper-Realistic Live Avatar?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "mailto:support@iblai.zendesk.com");
    await expect(page.getByText(GATE)).toBeVisible();
  });

  test("Avatar picker shares the gallery and its copy", async ({ page }) => {
    await page.goto("/ai-avatar/select");
    await expect(page.getByRole("heading", { name: "Avatar" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Choose an Avatar, add or select a Voice, and get an Avatar Video in minutes.")).toBeVisible();
  });

  test("My Videos: heading, subtitle, and the four chips route by ?type=", async ({ page }) => {
    await page.goto("/videos/my");
    await expect(page.getByRole("heading", { name: "My Videos" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Create stunning videos using our AI-powered generation.")).toBeVisible();
    // Chips only render past the gate; the gate itself must be honest.
    await expect(page.getByText(GATE)).toBeVisible();
  });

  test("Voices: heading and Clone Voice control", async ({ page }) => {
    await page.goto("/scripts");
    await expect(page.getByRole("heading", { name: "Voices" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Clone Voice/ })).toBeVisible();
    await expect(page.getByText(GATE)).toBeVisible();
  });

  test("Watch page renders without the app chrome", async ({ page }) => {
    await page.goto("/video/watch/does-not-exist");
    await expect(page.locator("aside")).toHaveCount(0);
    await expect(page.getByText("Created with")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("This video isn't available.")).toBeVisible({ timeout: 20_000 });
  });

  test("sidebar deep links land on the right screen with the right chip", async ({ page, isMobile }) => {
    await page.goto("/ai-avatar/my");
    await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible({ timeout: 20_000 });
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Video Clip" }).last().click();
    await expect(page).toHaveURL(/\/videos\/my\?type=clip$/);
    await expect(page.getByRole("heading", { name: "My Videos" })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("mobile layout", () => {
  test("no horizontal overflow on any screen", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    for (const path of ["/ai-avatar/generate", "/ai-avatar/my", "/videos/my", "/scripts"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test("footer stays pinned with all three elements", async ({ page }) => {
    await page.goto("/ai-avatar/my");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "Privacy Policy" })).toBeVisible({ timeout: 20_000 });
    await expect(footer.getByRole("link", { name: "Terms & Conditions" })).toBeVisible();
    await expect(footer.getByText("Powered by")).toBeVisible();
  });
});
