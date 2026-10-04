import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("concurrent changes preserve both versions until explicit resolution; sign-out hides drafts", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter HBI" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Players", exact: true }).click();
  const player = page.locator(".entity-list article").filter({
    has: page.getByRole("link", { name: "Match Playmaker", exact: true }),
  });
  await player.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("First name").fill("Local edit");
  const collectionReads: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "GET" &&
      request.url().startsWith("http://127.0.0.1:54329/rest/v1/")
    )
      collectionReads.push(request.url());
  });
  const rows = await (
    await page.request.get("http://127.0.0.1:54329/rest/v1/players")
  ).json();
  const original = rows.find(
    (row: { id: string }) => row.id === "40000000-0000-4000-8000-000000000001",
  );
  // Simulate the other analyst using the same revision-aware server contract.
  const remote = await page.request.post(
    "http://127.0.0.1:54329/rest/v1/rpc/apply_workspace_change",
    {
      data: {
        p_table: "players",
        p_row: { ...original, first_name: "Server edit" },
        p_expected_revision: original.revision,
        p_operation_id: crypto.randomUUID(),
        p_delete: false,
      },
    },
  );
  expect((await remote.json()).status).toBe("applied");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("button", { name: "Sync & backup", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Keep my change", exact: true }),
  ).toBeVisible();
  await page.getByText("Compare versions", { exact: true }).click();
  await expect(page.locator(".sync-operation pre")).toContainText("Local edit");
  await expect(page.locator(".sync-operation pre")).toContainText(
    "Server edit",
  );
  await page
    .getByRole("button", { name: "Keep my change", exact: true })
    .click();
  await expect(
    page.getByText("Online · 0 pending", { exact: true }),
  ).toBeVisible();
  const resolved = await (
    await page.request.get("http://127.0.0.1:54329/rest/v1/players")
  ).json();
  expect(
    resolved.find((row: { id: string }) => row.id === original.id).first_name,
  ).toBe("Local edit");
  expect(collectionReads).toHaveLength(0);
  const backupDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const backupPath = await (await backupDownload).path();
  const bytes = await readFile(backupPath!);
  const wrongScope = {
    ...JSON.parse(bytes.toString()),
    scope: "another-account:another-organization",
  };
  await page.getByLabel("Restore", { exact: true }).setInputFiles({
    name: "wrong-account.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(wrongScope)),
  });
  await expect(
    page.getByText("Backup belongs to another account or organization", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Restore", { exact: true }).setInputFiles({
    name: "matching-backup.json",
    mimeType: "application/json",
    buffer: bytes,
  });
  await expect(
    page.getByText("Backup belongs to another account or organization", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Local edit Playmaker", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Sync & backup", exact: true }),
  ).toHaveCount(0);
});
