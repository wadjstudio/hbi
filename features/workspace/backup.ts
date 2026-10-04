import { backupSchema, validateRow, type Row } from "@/types/workspace";

export function parseWorkspaceBackup(
  input: unknown,
  scope: string,
  organizationId: string,
) {
  const data = backupSchema.parse(input);
  if (data.scope !== scope)
    throw new Error("Backup belongs to another account or organization");
  for (const entry of [...data.records, ...data.operations]) {
    const row = validateRow(entry.table, entry.row as Row);
    if (row.organization_id !== organizationId)
      throw new Error("Organization mismatch in backup");
  }
  for (const op of data.operations) {
    if (op.rpc && op.table !== "substitutions")
      throw new Error("Invalid backup RPC/table combination");
  }
  return data;
}
