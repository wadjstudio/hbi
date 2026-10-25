// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useEventHistory } from "@/features/analysis/use-event-history";
import type { Row } from "@/types/workspace";

function fakeSave() {
  return vi.fn(async (_table: string, row: Partial<Row>, remove?: boolean) =>
    remove ? (row as Row) : ({ ...row, revision: Number(row.revision ?? 0) + 1 } as unknown as Row),
  );
}

it("undoes a new event by deleting it and its shot, then redoes it", async () => {
  const save = fakeSave();
  const { result } = renderHook(() => useEventHistory(save));
  const event = { id: "e1", revision: 1 } as unknown as Row;
  const shot = { id: "s1", event_id: "e1", revision: 1 } as unknown as Row;
  act(() => result.current.push({ event, shot }));
  expect(result.current.counts).toEqual({ undo: 1, redo: 0 });

  await act(() => result.current.step("undo"));
  expect(save.mock.calls).toEqual([
    ["shot_attempts", shot, true],
    ["events", event, true],
  ]);
  expect(result.current.counts).toEqual({ undo: 0, redo: 1 });

  save.mockClear();
  await act(() => result.current.step("redo"));
  expect(save.mock.calls.map(([table, row]) => [table, row.id, row.revision])).toEqual([
    ["events", "e1", 0],
    ["shot_attempts", "s1", 0],
  ]);
  expect(result.current.counts).toEqual({ undo: 1, redo: 0 });
});

it("undoes an edit by restoring the previous rows at the current revision", async () => {
  const save = fakeSave();
  const { result } = renderHook(() => useEventHistory(save));
  act(() =>
    result.current.push({
      event: { id: "e1", note: "new", revision: 4 } as unknown as Row,
      previousEvent: { id: "e1", note: "old", revision: 3 } as unknown as Row,
    }),
  );
  await act(() => result.current.step("undo"));
  expect(save).toHaveBeenCalledWith("events", { id: "e1", note: "old", revision: 4 });
});

it("clears both stacks on reset and when a new action follows an undo", async () => {
  const save = fakeSave();
  const { result } = renderHook(() => useEventHistory(save));
  act(() => result.current.push({ event: { id: "a" } as unknown as Row }));
  act(() => result.current.push({ event: { id: "b" } as unknown as Row }));
  await act(() => result.current.step("undo"));
  expect(result.current.counts).toEqual({ undo: 1, redo: 1 });
  act(() => result.current.push({ event: { id: "c" } as unknown as Row }));
  expect(result.current.counts).toEqual({ undo: 2, redo: 0 });
  act(() => result.current.reset());
  expect(result.current.counts).toEqual({ undo: 0, redo: 0 });
  await act(() => result.current.step("undo"));
  expect(save).toHaveBeenCalledTimes(1);
});
