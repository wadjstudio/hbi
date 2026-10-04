import { describe, expect, it } from "vitest";
import { parseWorkspaceBackup } from "../../features/workspace/backup";
const organization = crypto.randomUUID(),
  scope = `${crypto.randomUUID()}:${organization}`;
const row = {
  id: crypto.randomUUID(),
  organization_id: organization,
  title: "Draft",
  revision: 1,
};
const backup = {
  format: "hbi-workspace-v1",
  scope,
  records: [{ table: "tactic_documents", row }],
  operations: [],
};
describe("backup authorization boundary", () => {
  it("restores matching drafts with their stable identity", () => {
    expect(
      parseWorkspaceBackup(backup, scope, organization).records[0]!.row.id,
    ).toBe(row.id);
  });
  it("rejects another account even if it shares the same organization", () => {
    expect(() =>
      parseWorkspaceBackup(backup, `other:${organization}`, organization),
    ).toThrow("another account");
  });
  it("rejects operations belonging to another organization before restoring anything", () => {
    const operation = {
      id: crypto.randomUUID(),
      queuedAt: 1,
      table: "tactic_documents",
      row: { ...row, organization_id: crypto.randomUUID() },
      expected: 1,
      remove: false,
    };
    expect(() =>
      parseWorkspaceBackup(
        { ...backup, operations: [operation] },
        scope,
        organization,
      ),
    ).toThrow("Organization mismatch");
  });
});
