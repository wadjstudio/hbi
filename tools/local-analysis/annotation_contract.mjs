/** Review contracts shared by the standalone UI and its acceptance tests. */
export function normalBox(box) {
  if (
    !Array.isArray(box) ||
    box.length !== 4 ||
    box.some(
      (v) => typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1,
    ) ||
    box[2] <= box[0] ||
    box[3] <= box[1]
  )
    throw Error("مربع غير صالح؛ استخدم إحداثيات نسبية ذات مساحة.");
  return box;
}
export function visibleSuggestionBox(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    value.some((v) => typeof v !== "number" || !Number.isFinite(v))
  )
    throw Error("اقتراح مربع غير صالح.");
  return normalBox(value.map((v) => Math.max(0, Math.min(1, v))));
}
export function emptyFrame(frame) {
  return {
    frame_index: frame.index,
    source_video_ms: frame.video_ms,
    scene: frame.scene,
    image_sha256: frame.image_sha256,
    ball: { status: "unreviewed", box: null },
    persons: [],
    persons_complete: false,
    ignored_prediction_ids: [],
  };
}
export function identity(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value))
    throw Error("استخدم هوية مؤقتة مثل p1، بحروف إنجليزية وأرقام فقط.");
  return value;
}
export function validateReview(sequence, review) {
  if (
    review?.schema !== "sesen.annotation-review.v1" ||
    review.sequence_id !== sequence.sequence_id ||
    review.source_sha256 !== sequence.source_sha256 ||
    review.derivative_sha256 !== sequence.derivative_sha256 ||
    review.width !== sequence.width ||
    review.height !== sequence.height
  )
    throw Error("المراجعة لا تخص هذه العينة والمصدر.");
  if (
    !Array.isArray(review.confirmed_events) ||
    review.confirmed_events.length ||
    !Array.isArray(review.frames) ||
    review.frames.length > sequence.frames.length
  )
    throw Error("صيغة مراجعة غير صالحة.");
  const seen = new Set();
  for (const f of review.frames) {
    const source = sequence.frames.find((s) => s.index === f.frame_index);
    if (
      !source ||
      seen.has(f.frame_index) ||
      f.source_video_ms !== source.video_ms ||
      f.scene !== source.scene ||
      f.image_sha256 !== source.image_sha256
    )
      throw Error("بصمة أو زمن اللقطة غير مطابق.");
    seen.add(f.frame_index);
    if (
      typeof f.persons_complete !== "boolean" ||
      !Array.isArray(f.persons) ||
      f.persons.length > 100 ||
      !Array.isArray(f.ignored_prediction_ids)
    )
      throw Error("بيانات الأشخاص غير صالحة.");
    const ids = new Set(),
      predictions = new Set(source.person_suggestions.map((p) => p.id));
    for (const person of f.persons) {
      identity(person.identity);
      normalBox(person.box);
      if (
        ids.has(person.identity) ||
        !["player", "referee", "staff", "unknown"].includes(person.role) ||
        !["red", "white", "green", "cyan", "unknown"].includes(
          person.kit_colour,
        ) ||
        !["manual", "reviewed_prediction"].includes(person.origin) ||
        (person.source_prediction_id !== null &&
          !predictions.has(person.source_prediction_id))
      )
        throw Error("هوية متكررة أو خصائص شخص غير صالحة.");
      ids.add(person.identity);
    }
    if (
      new Set(f.ignored_prediction_ids).size !==
        f.ignored_prediction_ids.length ||
      f.ignored_prediction_ids.some((id) => !predictions.has(id))
    )
      throw Error("اقتراح مستبعد غير معروف.");
    if (
      !["unreviewed", "visible", "not_visible", "uncertain"].includes(
        f.ball?.status,
      )
    )
      throw Error("حالة الكرة غير صالحة.");
    if (f.ball.status === "visible") normalBox(f.ball.box);
    else if (f.ball.box !== null) throw Error("حالة الكرة لا تقبل مربعًا.");
  }
  return structuredClone(review);
}
