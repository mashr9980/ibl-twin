import { expect, test } from "@playwright/test";

/**
 * Link integrity. Four routes shipped dead — /videos/generate from the
 * sidebar, /faq from the profile menu, /privacy and /terms from the footer —
 * because nothing asserted that a rendered href resolves. This walks the app
 * and fails on any 404, so that class of defect cannot ship again.
 */
const ROUTES = [
  "/", "/ai-avatar/generate", "/ai-avatar/my", "/ai-avatar/select",
  "/videos/generate", "/videos/my", "/scripts", "/account", "/notifications",
  "/faq", "/privacy", "/terms", "/video/watch/sample",
];

test.describe("link integrity", () => {
  for (const route of ROUTES) {
    test(`${route} resolves`, async ({ page }) => {
      const res = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `${route} returned ${res?.status()}`).toBeLessThan(400);
      await expect(page.locator("text=404")).toHaveCount(0);
    });
  }

  test("every href the app renders resolves", async ({ page, request, isMobile }) => {
    const seen = new Set<string>();
    for (const from of ["/ai-avatar/my", "/ai-avatar/generate", "/videos/my", "/faq"]) {
      await page.goto(from, { waitUntil: "domcontentloaded" });
      // The shell is client-rendered, so hrefs don't exist at DOMContentLoaded.
      // Wait for real chrome before collecting.
      if (from === "/faq") {
        await page.getByRole("heading", { name: "Frequently Asked Questions" }).waitFor({ timeout: 30_000 });
      } else {
        await page.locator("footer").waitFor({ timeout: 30_000 });
        if (isMobile) await page.getByRole("button", { name: "Open menu" }).click().catch(() => {});
        await page.getByRole("navigation", { name: "Main" }).waitFor({ timeout: 30_000 });
      }
      for (const href of await page.locator("a[href^='/']").evaluateAll((els) => els.map((e) => e.getAttribute("href")!))) {
        seen.add(href.split("#")[0]);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
    const dead: string[] = [];
    for (const href of seen) {
      const res = await request.get(href);
      if (res.status() >= 400) dead.push(`${href} → ${res.status()}`);
    }
    expect(dead, `dead links: ${dead.join(", ")}`).toEqual([]);
  });

  test("FAQ answers are in the HTML, not hidden behind JS", async ({ page }) => {
    await page.goto("/faq");
    await expect(page.getByRole("heading", { name: "Frequently Asked Questions" })).toBeVisible();
    // <details> keeps answers server-rendered; assert one is present in the DOM.
    await expect(page.locator("details", { hasText: "What is Memorare Twin?" })).toHaveCount(1);
    await expect(page.getByText("Getting Started")).toBeVisible();
    await expect(page.getByText("Troubleshooting")).toBeVisible();
  });
});
