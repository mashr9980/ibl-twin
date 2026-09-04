import { expect, test } from "@playwright/test";

/**
 * Every screen, desktop + mobile, against the live deployment with a real
 * session and a real HeyGen credential on the tenant. These assert the app
 * actually working — real catalogue, real voices, real videos — not a gate.
 */
test.describe("screens", () => {
  test("root routes an admin with a credential to Create Twin", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ai-avatar\/generate$/, { timeout: 30_000 });
  });

  test("Create Twin: both dropzones, contact pill, and the gallery teaser", async ({ page }) => {
    await page.goto("/ai-avatar/generate");
    await expect(page.getByRole("heading", { name: "Create Twin" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Want to Create a Hyper-Realistic Live Avatar?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "mailto:support@iblai.zendesk.com");

    await expect(page.getByRole("heading", { name: "Start with a photo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start with video" })).toBeVisible();
    await expect(page.getByText("Supported formats: JPG, PNG, GIF, WEBP. Max size: 10MB.")).toBeVisible();
    await expect(page.getByText("Supported formats: MP4, MOV, WEBM. Max size: 100MB.")).toBeVisible();
    await expect(page.getByText("You can create one twin per account.").first()).toBeVisible();

    // The teaser grid pulls the real catalogue.
    await expect(page.locator("img[alt$='avatar preview']").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("link", { name: /More/ })).toBeVisible();
  });

  test("Gallery loads the real catalogue and search filters it", async ({ page }) => {
    await page.goto("/ai-avatar/my");
    await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Choose an Avatar, add or select a Voice, and get an Avatar Video in minutes.")).toBeVisible();

    await expect(page.locator("img[alt$='avatar preview']").first()).toBeVisible({ timeout: 60_000 });
    const all = await page.locator("img[alt$='avatar preview']").count();
    expect(all, "expected a populated catalogue").toBeGreaterThan(50);
    await expect(page.getByText(/\d+ avatars?$/)).toBeVisible();

    await page.getByPlaceholder("Search").fill("Abigail");
    await expect.poll(() => page.locator("img[alt$='avatar preview']").count(), { timeout: 15_000 }).toBeLessThan(all);

    await page.getByPlaceholder("Search").fill("zzzzqqq");
    await expect(page.getByText("No avatars found")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Try another search or category chip.")).toBeVisible();
  });

  test("Avatar picker opens the generation modal with real voices", async ({ page }) => {
    await page.goto("/ai-avatar/select");
    await expect(page.getByRole("heading", { name: "Avatar" })).toBeVisible({ timeout: 30_000 });
    await page.locator("button:has(img[alt$='avatar preview'])").first().click({ timeout: 60_000 });

    await expect(page.getByRole("heading", { name: "Edit Avatar Video" })).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => page.locator("select option").count(), { timeout: 45_000 }).toBeGreaterThan(10);

    // Generate stays disabled until a script exists.
    const generate = page.getByRole("button", { name: /Generate AI Avatar Video/ });
    await expect(generate).toBeDisabled();
    await page.getByRole("button", { name: "Surprise me" }).click();
    await expect(page.locator("#script")).not.toHaveValue("");
    await expect(generate).toBeEnabled();

    await expect(page.getByText("0.5x")).toBeVisible();
    await expect(page.getByText("1.5x")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Edit Avatar Video" })).toBeHidden();
  });

  test("My Videos lists real renders and chips filter by type", async ({ page }) => {
    await page.goto("/videos/my");
    await expect(page.getByRole("heading", { name: "My Videos" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Create stunning videos using our AI-powered generation.")).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible({ timeout: 45_000 });

    const chips = page.getByRole("main").getByRole("link");
    for (const chip of ["All", "Twin", "Avatar", "Video Clips"]) {
      await expect(chips.filter({ hasText: new RegExp(`^${chip}$`) })).toBeVisible();
    }
    await chips.filter({ hasText: /^Twin$/ }).click();
    await expect(page).toHaveURL(/type=twin/);
  });

  test("a completed video opens in the player", async ({ page }) => {
    await page.goto("/videos/my");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 45_000 });
    const playable = page.locator("article button:not([disabled])").first();
    await playable.click();
    await expect(page.locator("video")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Share" })).toBeVisible();
  });

  test("a stalled render is labelled, not counted as generating", async ({ page }) => {
    // This account has a render pending since ~3,300 hours ago. Without the
    // stale guard the poller chases it forever and the chip never clears.
    await page.goto("/videos/my");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Stalled")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/\+\d+ more generating/)).toHaveCount(0);
  });

  test("Voices lists the real library with previews", async ({ page }) => {
    await page.goto("/scripts");
    await expect(page.getByRole("heading", { name: "Voices", exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Clone Voice/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pre-built Voices" })).toBeVisible();
    await expect.poll(() => page.locator("li").count(), { timeout: 60_000 }).toBeGreaterThan(10);
    await expect(page.getByText(/^Showing \d+ of \d+ voices$/)).toBeVisible();
  });

  test("Create Video Clip gates its own submit until image and prompt exist", async ({ page }) => {
    await page.goto("/videos/generate");
    await expect(page.getByRole("heading", { name: "Create Video Clip" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Generate Video Clip/ })).toBeDisabled();
    await expect(page.getByText("Supported formats: JPG, PNG, GIF, WEBP. Max size: 30MB.")).toBeVisible();
  });

  test("Watch page renders without the app chrome", async ({ page }) => {
    await page.goto("/video/watch/does-not-exist");
    await expect(page.locator("aside")).toHaveCount(0);
    await expect(page.getByText("Created with")).toBeVisible({ timeout: 30_000 });
  });

  test("sidebar deep links land on the right screen with the right chip", async ({ page, isMobile }) => {
    await page.goto("/ai-avatar/my");
    await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible({ timeout: 30_000 });
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Video Clip" }).last().click();
    // Default 5 s is too tight straight after a click when the box is busy
    // with the rest of the suite; flaked once in a full run, 6/6 on rerun.
    await expect(page).toHaveURL(/\/videos\/my\?type=clip$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "My Videos" })).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("mobile layout", () => {
  test("no horizontal overflow on any screen", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    const screens: [string, string][] = [
      ["/ai-avatar/generate", "Create Twin"],
      ["/ai-avatar/my", "Gallery"],
      ["/videos/my", "My Videos"],
      ["/videos/generate", "Create Video Clip"],
      ["/scripts", "Voices"],
    ];
    for (const [path, heading] of screens) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(1500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test("footer stays pinned with all three elements", async ({ page }) => {
    await page.goto("/ai-avatar/my");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "Privacy Policy" })).toBeVisible({ timeout: 30_000 });
    await expect(footer.getByRole("link", { name: "Terms & Conditions" })).toBeVisible();
    await expect(footer.getByText("Powered by")).toBeVisible();
  });
});
