import "fake-indexeddb/auto";
import { describe, it, expect, afterAll } from "vitest";
import { localDB, recordKey } from "../../lib/local/database";
import { backupSchema, drawingSchema } from "../../types/workspace";
afterAll(() => localDB.close());
describe("local-first persistence", () => {
  it("isolates account/organization drafts and atomically records a retryable write", async () => {
    const org = crypto.randomUUID(),
      id = crypto.randomUUID(),
      row = { id, organization_id: org, title: "Offline draft", revision: 1 };
    await localDB.transaction(
      "rw",
      localDB.records,
      localDB.operations,
      async () => {
        await localDB.records.put({
          key: recordKey("u:a", "tactic_documents", id),
          scope: "u:a",
          table: "tactic_documents",
          row,
        });
        await localDB.operations.put({
          id: crypto.randomUUID(),
          queuedAt: 1,
          scope: "u:a",
          table: "tactic_documents",
          row,
          expected: 0,
          remove: false,
        });
      },
    );
    expect(await localDB.records.where("scope").equals("u:a").count()).toBe(1);
    expect(await localDB.records.where("scope").equals("u:b").count()).toBe(0);
    expect(await localDB.operations.where("scope").equals("u:a").count()).toBe(
      1,
    );
  });
  it("does not retain half a failed local transaction", async () => {
    const id = crypto.randomUUID();
    await expect(
      localDB.transaction(
        "rw",
        localDB.records,
        localDB.operations,
        async () => {
          await localDB.records.put({
            key: id,
            scope: "rollback",
            table: "events",
            row: { id, organization_id: crypto.randomUUID() },
          });
          throw new Error("Interrupted");
        },
      ),
    ).rejects.toThrow("Interrupted");
    expect(await localDB.records.get(id)).toBeUndefined();
  });
  it("rejects malformed backup identities and out-of-range drawings", () => {
    expect(
      backupSchema.safeParse({
        format: "hbi-workspace-v1",
        scope: "a",
        records: [{ table: "events", row: { id: "bad" } }],
        operations: [],
      }).success,
    ).toBe(false);
    expect(
      drawingSchema.safeParse({
        id: crypto.randomUUID(),
        kind: "player",
        label: "10",
        color: "#25d9f5",
        x: 1.5,
        y: 0.5,
      }).success,
    ).toBe(false);
  });
});
