import type { Drawing } from "@/types/workspace";

// Translate both anchors together; retain the shape when an edge limits movement.
export const moveDrawing = (
  object: Drawing,
  dx: number,
  dy: number,
): Drawing => {
  const xs = [object.x, object.x2 ?? object.x];
  const ys = [object.y, object.y2 ?? object.y];
  const x = Math.max(-Math.min(...xs), Math.min(1 - Math.max(...xs), dx));
  const y = Math.max(-Math.min(...ys), Math.min(1 - Math.max(...ys), dy));
  return {
    ...object,
    x: object.x + x,
    y: object.y + y,
    ...(object.x2 == null ? {} : { x2: object.x2 + x }),
    ...(object.y2 == null ? {} : { y2: object.y2 + y }),
  };
};
