import Dexie, { type EntityTable } from "dexie";
import { type Row, type Table } from "@/types/workspace";
export type LocalRecord = {
  key: string;
  scope: string;
  table: Table;
  row: Row;
};
export type Operation = {
  id: string;
  queuedAt: number;
  scope: string;
  table: Table;
  row: Row;
  expected: number;
  remove: boolean;
  rpc?: "record_substitution";
  error?: string;
  conflict?: Row | null;
};
class LocalDB extends Dexie {
  records!: EntityTable<LocalRecord, "key">;
  operations!: EntityTable<Operation, "id">;
  constructor() {
    super("hbi-local-v1");
    this.version(1).stores({
      records: "key,scope,[scope+table]",
      operations: "id,scope,queuedAt",
    });
  }
}
export const localDB = new LocalDB();
export const recordKey = (scope: string, table: Table, id: string) =>
  `${scope}:${table}:${id}`;
