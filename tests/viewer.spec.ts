import { expect, test } from "@playwright/test";
test("mirrors Treasury history", async ({ request }) => {
  const response = await request.get("/data/treasury.csv");
  expect(response.ok()).toBeTruthy();
  const lines = (await response.text()).trim().split(/\r?\n/);
  expect(lines.length).toBeGreaterThan(8000);
  expect(lines[0]).toBe(
    "date,1 mo,1.5 mo,2 mo,3 mo,4 mo,6 mo,1 yr,2 yr,3 yr,5 yr,7 yr,10 yr,20 yr,30 yr",
  );
  expect(lines[1]).toMatch(/^1990-01-02,/);
  const latestYear = Number(lines.at(-1)?.slice(0, 4));
  expect(latestYear).toBeGreaterThanOrEqual(new Date().getUTCFullYear() - 1);
});
test("opens editor without input", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/editor\.html$/);
  await expect(page.locator(".cm-editor")).toBeVisible();
  await expect(page.locator(".cm-lineNumbers")).toBeVisible();
  await expect(page.locator("#vis canvas").first()).toBeVisible();
  expect(errors).toEqual([]);
});
test("renders Treasury from url", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  await page.goto(
    `/?${new URLSearchParams({
      url: "data/treasury.json",
    })}`,
  );
  await expect(page.locator("#vis canvas").first()).toBeVisible();
  expect(errors).toEqual([]);
});
test("renders Treasury from JsonSpec", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  const response = await request.get("/data/treasury.json");
  expect(response.ok()).toBeTruthy();
  const spec = (await response.json()) as {
    source: string;
  };
  spec.source = "/data/treasury.csv";
  await page.goto(
    `/?${new URLSearchParams({
      spec: JSON.stringify(spec),
    })}`,
  );
  await expect(page.locator("#vis canvas").first()).toBeVisible();
  expect(errors).toEqual([]);
});
