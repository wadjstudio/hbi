import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import Papa from "papaparse";
import { test, expect } from "./fixture";
const mockURL = `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}`;

test("saved Arabic report notes, primary sample, CSV and browser PDF", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(180000);
  const org = "20000000-0000-4000-8000-000000000001";
  const home = "30000000-0000-4000-8000-000000000001";
  const away = "30000000-0000-4000-8000-000000000002";
  const shooter = "40000000-0000-4000-8000-000000000002";
  const match = randomUUID(),
    primary = randomUUID(),
    secondary = randomUUID(),
    report = randomUUID();
  async function seed(table: string, row: Record<string, unknown>) {
    const response = await request.post(`${mockURL}/rest/v1/${table}`, {
      data: { organization_id: org, ...row },
    });
    expect(response.ok()).toBe(true);
  }
  await seed("matches", {
    id: match,
    home_team_id: home,
    away_team_id: away,
    status: "analysed",
  });
  for (const [id, is_primary] of [
    [primary, true],
    [secondary, false],
  ] as const)
    await seed("analysis_sessions", { id, match_id: match, is_primary });
  for (const [session, result, player] of [
    [primary, "goal", shooter],
    [primary, "save", shooter],
    [primary, "unknown", shooter],
    [secondary, "goal", shooter],
    [primary, "goal", "40000000-0000-4000-8000-000000000001"],
  ]) {
    const event = randomUUID();
    await seed("events", {
      id: event,
      match_id: match,
      analysis_session_id: session,
      team_id: away,
      actor_player_id: player,
      event_type: "shot",
      timestamp_ms: 62000,
      period: 2,
      match_clock_ms: 12000,
      actor_position: "RW",
    });
    await seed("shot_attempts", {
      id: randomUUID(),
      event_id: event,
      shooter_id: player,
      result,
      empty_goal: false,
      review_required: result === "unknown",
      zone: "rw",
    });
  }
  const title = "تقرير تجهيز الخصم",
    original = "ملاحظات محفوظة قبل فتح الصفحة";
  await seed("reports", {
    id: report,
    title,
    report_type: "player",
    match_id: match,
    team_id: away,
    player_id: shooter,
    content: { notes: original, meeting_focus: "دفاع الجناح" },
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter HBI" }).click();
  await page.waitForURL("**/overview", { timeout: 60000 });
  await expect(page.getByText("HBI Test Club").first()).toBeAttached();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  // Direct entry/reload exercises reports arriving after the component mounts.
  await page.goto(`/reports/${report}`);
  const notes = page.getByRole("textbox", { name: "Coach notes", exact: true });
  await expect(notes).toHaveValue(original);
  const metrics = page.locator(".print-report .metric");
  await expect(metrics.nth(0).locator("b")).toHaveText("2");
  await expect(metrics.nth(1).locator("b")).toHaveText("1");
  await expect(metrics.nth(2).locator("b")).toHaveText("50.0%");
  await expect(page.getByText("1 unreviewed attempts excluded")).toBeVisible();
  await expect(page.locator('.print-report a[href*="?event="]')).toHaveCount(3);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("hbi-shots.csv");
  const csv = await readFile((await download.path())!, "utf8");
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true });
  expect(parsed.errors).toEqual([]);
  expect(parsed.data).toHaveLength(3);
  expect(parsed.data.map((r) => r.result).sort()).toEqual([
    "goal",
    "save",
    "unknown",
  ]);
  for (const row of parsed.data) {
    expect(row).toMatchObject({
      match_id: match,
      analysis_session_id: primary,
      video_ms: "62000",
      period: "2",
      match_clock_ms: "12000",
      actor_position: "RW",
    });
  }
  await testInfo.attach("shots.csv", {
    body: Buffer.from(csv),
    contentType: "text/csv",
  });
  const amended =
    'التركيز على الجناح الأيمن، "عودة سريعة"\nاللقطة في الشوط الثاني';
  await notes.fill(amended);
  await page.getByRole("button", { name: "Save report", exact: true }).click();
  await expect
    .poll(async () => {
      const response = await request.get(`${mockURL}/rest/v1/reports`);
      const reports = await response.json();
      return reports.find((r: { id: string }) => r.id === report)?.content;
    })
    .toMatchObject({ notes: amended, meeting_focus: "دفاع الجناح" });
  await page.reload();
  await expect(notes).toHaveValue(amended);
  const finalNotes = amended + "\nالنسخة المختارة بعد المراجعة";
  await notes.fill(finalNotes);
  const stored = (
    await (await request.get(`${mockURL}/rest/v1/reports`)).json()
  ).find((row: { id: string }) => row.id === report);
  const remote = await request.post(
    `${mockURL}/rest/v1/rpc/apply_workspace_change`,
    {
      data: {
        p_table: "reports",
        p_row: {
          ...stored,
          content: { ...stored.content, notes: "تعديل المحلل الآخر" },
        },
        p_expected_revision: stored.revision,
        p_operation_id: randomUUID(),
        p_delete: false,
      },
    },
  );
  expect((await remote.json()).status).toBe("applied");
  // Pulling another analyst's revision must not silently rebase an open draft.
  await page
    .getByRole("button", { name: "Sync & backup", exact: true })
    .click();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        async ({ report, scope }) => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const opening = indexedDB.open("hbi-local-v1");
            opening.onsuccess = () => resolve(opening.result);
            opening.onerror = () => reject(opening.error);
          });
          try {
            return await new Promise<string>((resolve, reject) => {
              const reading = db
                .transaction("records")
                .objectStore("records")
                .get(`${scope}:reports:${report}`);
              reading.onsuccess = () =>
                resolve(reading.result?.row?.content?.notes ?? "");
              reading.onerror = () => reject(reading.error);
            });
          } finally {
            db.close();
          }
        },
        { report, scope: `10000000-0000-4000-8000-000000000001:${org}` },
      ),
    )
    .toBe("تعديل المحلل الآخر");
  await expect(notes).toHaveValue(finalNotes);
  await page.getByRole("button", { name: "Save report", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Keep my change", exact: true }),
  ).toBeVisible();
  await page.getByText("Compare versions", { exact: true }).click();
  await expect(page.locator(".sync-operation pre")).toContainText(
    "تعديل المحلل الآخر",
  );
  await expect(page.locator(".sync-operation pre")).toContainText(
    finalNotes.split("\n").at(-1)!,
  );
  await page
    .getByRole("button", { name: "Keep my change", exact: true })
    .click();
  await expect(
    page.getByText("Online · 0 pending", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(notes).toHaveValue(finalNotes);
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".topbar")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "CSV", exact: true }),
  ).toBeHidden();
  await expect(page.locator(".report-notes")).toHaveText(finalNotes);
  await expect(page.locator(".report-notes")).toBeVisible();
  const paper = await page.screenshot({ fullPage: true });
  await testInfo.attach("arabic-report-print.png", {
    body: paper,
    contentType: "image/png",
  });
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.byteLength).toBeGreaterThan(10000);
  await testInfo.attach("arabic-report.pdf", {
    body: pdf,
    contentType: "application/pdf",
  });
  await page.emulateMedia({ media: "screen" });
  await page.goto(`/reports/${randomUUID()}`);
  await expect(page.getByText("التقرير غير متاح في هذه المؤسسة")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "CSV", exact: true }),
  ).toHaveCount(0);
});
