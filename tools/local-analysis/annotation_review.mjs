import {
  emptyFrame,
  identity,
  normalBox,
  validateReview,
  visibleSuggestionBox,
} from "./annotation_contract.mjs";
const $ = (id) => document.getElementById(id),
  ns = "http://www.w3.org/2000/svg";
let sequence,
  imageReady = false,
  current = 0,
  drag = null,
  reviews = new Map();
const undo = [],
  redo = [];
const status = (text) => {
    $("status").textContent = text;
  },
  frame = () => sequence.frames[current];
function state() {
  if (!reviews.has(frame().index))
    reviews.set(frame().index, emptyFrame(frame()));
  return reviews.get(frame().index);
}
function payload() {
  return {
    schema: "sesen.annotation-review.v1",
    sequence_id: sequence.sequence_id,
    source_sha256: sequence.source_sha256,
    derivative_sha256: sequence.derivative_sha256,
    width: sequence.width,
    height: sequence.height,
    created_at: new Date().toISOString(),
    usage_rights: "not_reviewed",
    approved_for_training: false,
    confirmed_events: [],
    frames: [...reviews.values()],
  };
}
const snapshot = () => JSON.stringify([...reviews.entries()]);
function mutate(action) {
  if (!imageReady) {
    status("انتظر تحميل صورة الإطار قبل مراجعتها.");
    return;
  }
  const before = snapshot();
  try {
    action(state());
    validateReview(sequence, payload());
    undo.push(before);
    if (undo.length > 50) undo.shift();
    redo.length = 0;
    render();
    status("تم حفظ التعديل في ذاكرة المراجعة؛ صدّر الملف قبل الإغلاق.");
  } catch (error) {
    reviews = new Map(JSON.parse(before));
    render();
    status(error.message);
  }
}
function boxSvg(box, colour, text, dashed = false) {
  const [x1, y1, x2, y2] = box,
    w = sequence.width,
    h = sequence.height,
    r = document.createElementNS(ns, "rect");
  for (const [key, value] of Object.entries({
    x: x1 * w,
    y: y1 * h,
    width: (x2 - x1) * w,
    height: (y2 - y1) * h,
    stroke: colour,
    fill: "none",
    "stroke-width": 2,
    "stroke-dasharray": dashed ? "5 4" : "none",
  }))
    r.setAttribute(key, value);
  $("overlay").append(r);
  if (text) {
    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", x1 * w);
    t.setAttribute("y", Math.max(14, y1 * h - 4));
    t.textContent = text;
    $("overlay").append(t);
  }
  return r;
}
function button(text, action) {
  const b = document.createElement("button");
  b.textContent = text;
  b.onclick = action;
  return b;
}
function row(text) {
  const d = document.createElement("div");
  d.className = "row";
  const label = document.createElement("span");
  label.textContent = text;
  d.append(label);
  return d;
}
function personData(box, origin, source_prediction_id = null) {
  return {
    identity: identity($("person-id").value.trim()),
    box: normalBox(box),
    role: $("role").value,
    kit_colour: $("kit").value,
    origin,
    source_prediction_id,
  };
}
function setBox(box) {
  normalBox(box);
  if ($("tool").value === "view") return;
  mutate((s) => {
    if ($("tool").value === "ball") {
      s.ball = { status: "visible", box };
      return;
    }
    const person = personData(box, "manual"),
      index = s.persons.findIndex((p) => p.identity === person.identity);
    if (index < 0) s.persons.push(person);
    else s.persons[index] = person;
    s.persons_complete = false;
  });
}
function render() {
  const f = frame(),
    s = state();
  const uri = new URL(f.image, location.href).href;
  if ($("image").src !== uri) {
    imageReady = false;
    $("stage").classList.add("loading");
    $("image").onload = () => {
      if (frame().index !== f.index || $("image").src !== uri) return;
      imageReady =
        $("image").naturalWidth === sequence.width &&
        $("image").naturalHeight === sequence.height;
      if (imageReady) $("stage").classList.remove("loading");
      else status("أبعاد الصورة غير مطابقة؛ المراجعة متوقفة.");
    };
    $("image").onerror = () =>
      status("تعذر تحميل صورة الإطار؛ لن تُحفظ مراجعة على صورة قديمة.");
    $("image").src = uri;
  }
  $("overlay").setAttribute(
    "viewBox",
    `0 0 ${sequence.width} ${sequence.height}`,
  );
  $("overlay").replaceChildren();
  $("frame-slider").value = String(current);
  $("previous").disabled = current === 0;
  $("next").disabled = current === sequence.frames.length - 1;
  $("undo").disabled = !undo.length;
  $("redo").disabled = !redo.length;
  $("export").disabled = false;
  $("clock").textContent =
    `إطار ${current + 1}/${sequence.frames.length} · فيديو ${Math.floor(f.video_ms / 60000)}:${String(Math.floor(f.video_ms / 1000) % 60).padStart(2, "0")}.${Math.floor((f.video_ms % 1000) / 100)} · مشهد ${f.scene}${f.cut_heuristic ? " · تغيّر صورة يحتاج مراجعة" : ""}`;
  $("predictions").replaceChildren();
  const claimed = new Set(s.persons.map((p) => p.source_prediction_id));
  for (const p of f.person_suggestions) {
    if (claimed.has(p.id) || s.ignored_prediction_ids.includes(p.id)) continue;
    let visibleBox;
    try {
      visibleBox = visibleSuggestionBox(p.box);
    } catch {
      visibleBox = null;
    }
    if ($("show-suggestions").checked && visibleBox)
      boxSvg(visibleBox, "#e4a35b", p.id, true);
    const clipped = visibleBox && p.box.some((v, i) => v !== visibleBox[i]);
    const item = row(
      p.id +
        (clipped
          ? " · مقتطع عند حافة الصورة"
          : visibleBox
            ? ""
            : " · خارج الصورة أو غير صالح"),
    );
    item.append(
      button("اعتماد المربع", () =>
        mutate((s) => {
          if (!visibleBox)
            throw Error(
              "هذا الاقتراح لا يملك مساحة ظاهرة؛ تجاهله أو ارسم مربعًا صحيحًا.",
            );
          const person = personData(
            [...visibleBox],
            "reviewed_prediction",
            p.id,
          );
          if (s.persons.some((p) => p.identity === person.identity))
            throw Error(
              "هذه الهوية مستخدمة في الإطار؛ اختر هوية أخرى أو ارسم لتعديل مربعها.",
            );
          s.persons.push(person);
          s.persons_complete = false;
        }),
      ),
      button("تجاهل", () =>
        mutate((s) => {
          s.ignored_prediction_ids.push(p.id);
          s.persons_complete = false;
        }),
      ),
    );
    $("predictions").append(item);
  }
  $("people").replaceChildren();
  for (const person of s.persons) {
    boxSvg(person.box, "#00d3d8", person.identity);
    const item = row(
      `${person.identity} · ${{ player: "لاعب", referee: "حكم", staff: "طاقم", unknown: "غير محسوم" }[person.role]} · ${{ red: "أحمر", white: "أبيض", green: "أخضر", cyan: "سماوي", unknown: "لون غير محسوم" }[person.kit_colour]}`,
    );
    item.append(
      button("اختيار للتعديل", () => {
        $("person-id").value = person.identity;
        $("role").value = person.role;
        $("kit").value = person.kit_colour;
        $("tool").value = "person";
        person.box.forEach(
          (v, i) =>
            ($(["x1", "y1", "x2", "y2"][i]).value = (v * 100).toFixed(2)),
        );
        status("ارسم المربع المصحح أو عدّل حدوده ثم اضغط تعيين.");
      }),
      button("حذف", () =>
        mutate((s) => {
          s.persons = s.persons.filter((p) => p.identity !== person.identity);
          s.persons_complete = false;
        }),
      ),
    );
    $("people").append(item);
  }
  $("people-complete").checked = s.persons_complete;
  $("balls").replaceChildren();
  f.ball_proposals.forEach((p, i) => {
    boxSvg(p.box, "#e9c489", `اقتراح كرة ${i + 1}`, true);
    $("balls").append(
      button(`استخدام اقتراح الكرة ${i + 1} بعد مراجعته`, () =>
        mutate((s) => {
          s.ball = { status: "visible", box: [...p.box] };
        }),
      ),
    );
  });
  if (s.ball.status === "visible")
    boxSvg(s.ball.box, "#f2d698", "كرة · مراجعة بشرية");
  const labels = {
    unreviewed: "لم تُراجع الكرة بعد",
    visible: "كرة مرئية بمربع راجعته",
    not_visible: "الكرة غير مرئية بحسب مراجعتك",
    uncertain: "الموضع غير محسوم؛ يُستبعد من التقييم",
  };
  $("ball-status").textContent =
    `${labels[s.ball.status]} · ${f.ball_prediction_status === "complete" ? f.ball_proposals.length + " اقتراحات من النموذج" : "النموذج لم يعمل على هذا الإطار"}`;
  const complete = [...reviews.values()].filter((r) =>
    ["visible", "not_visible"].includes(r.ball.status),
  ).length;
  $("summary").textContent =
    `مراجعة الكرة: ${complete} من ${sequence.frames.length} إطارًا. لا نسبة دقة قبل وجود مراجعة بشرية. حقوق التدريب لم تُراجع.`;
}
function go(index) {
  if (!sequence) return;
  current = Math.max(0, Math.min(sequence.frames.length - 1, index));
  render();
}
function at(e) {
  const r = $("overlay").getBoundingClientRect();
  return [
    Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
    Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
  ];
}
$("overlay").onpointerdown = (e) => {
  if (!sequence || $("tool").value === "view" || e.button !== 0) return;
  e.preventDefault();
  drag = at(e);
  $("overlay").setPointerCapture(e.pointerId);
};
$("overlay").onpointermove = (e) => {
  if (!drag) return;
  $("draw-preview")?.remove();
  const p = at(e),
    preview = boxSvg(
      [
        Math.min(drag[0], p[0]),
        Math.min(drag[1], p[1]),
        Math.max(drag[0], p[0]),
        Math.max(drag[1], p[1]),
      ],
      "#fff",
      "",
      true,
    );
  preview.id = "draw-preview";
};
$("overlay").onpointerup = (e) => {
  if (!drag) return;
  const p = at(e),
    box = [
      Math.min(drag[0], p[0]),
      Math.min(drag[1], p[1]),
      Math.max(drag[0], p[0]),
      Math.max(drag[1], p[1]),
    ];
  drag = null;
  $("draw-preview")?.remove();
  try {
    setBox(box);
  } catch (error) {
    status(error.message);
  }
};
$("overlay").onpointercancel = () => {
  drag = null;
  $("draw-preview")?.remove();
};
$("set-box").onclick = () => {
  if (!sequence) return;
  try {
    setBox(
      ["x1", "y1", "x2", "y2"].map((id) => {
        if ($(id).value.trim() === "")
          throw Error("أدخل الحدود الأربعة أولًا.");
        return Number($(id).value) / 100;
      }),
    );
  } catch (error) {
    status(error.message);
  }
};
$("previous").onclick = () => go(current - 1);
$("next").onclick = () => go(current + 1);
$("frame-slider").oninput = () => go(Number($("frame-slider").value));
$("show-suggestions").onchange = () => {
  if (sequence) render();
};
$("zoom").onchange = () => {
  $("stage").className = `zoom-${$("zoom").value.replace(".", "-")}`;
  if (!imageReady) $("stage").classList.add("loading");
};
for (const [id, value] of [
  ["ball-hidden", "not_visible"],
  ["ball-uncertain", "uncertain"],
  ["ball-clear", "unreviewed"],
])
  $(id).onclick = () => {
    if (sequence)
      mutate((s) => {
        s.ball = { status: value, box: null };
      });
  };
$("people-complete").onchange = () => {
  if (sequence)
    mutate((s) => {
      s.persons_complete = $("people-complete").checked;
    });
};
function history(from, to) {
  if (!from.length) return;
  to.push(snapshot());
  reviews = new Map(JSON.parse(from.pop()));
  render();
  status("تم تحديث المراجعة.");
}
$("undo").onclick = () => history(undo, redo);
$("redo").onclick = () => history(redo, undo);
document.addEventListener("keydown", (e) => {
  if (
    !sequence ||
    e.target.closest("input,select,textarea,button") ||
    e.altKey ||
    e.metaKey
  )
    return;
  if (e.ctrlKey && e.key.toLowerCase() === "z") {
    e.preventDefault();
    history(e.shiftKey ? redo : undo, e.shiftKey ? undo : redo);
  } else if (!e.ctrlKey && ["ArrowRight", "ArrowLeft"].includes(e.key)) {
    e.preventDefault();
    go(current + (e.key === "ArrowRight" ? 1 : -1));
  }
});
$("export").onclick = () => {
  try {
    const data = validateReview(sequence, payload()),
      url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "sesen-annotation-review.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status("تم تصدير المراجعة؛ يمكنك استيرادها لاستكمالها.");
  } catch (error) {
    status(error.message);
  }
};
$("import").onchange = async () => {
  try {
    const file = $("import").files[0];
    if (!file) return;
    if (!sequence || file.size > 4 * 1024 * 1024)
      throw Error("شغّل العينة ثم اختر ملف مراجعة أقل من ٤ ميجابايت.");
    const parsed = validateReview(sequence, JSON.parse(await file.text()));
    if (
      [...reviews.values()].some(
        (s) =>
          s.ball.status !== "unreviewed" ||
          s.persons.length ||
          s.persons_complete ||
          s.ignored_prediction_ids.length,
      )
    )
      throw Error(
        "لديك تعديلات قائمة؛ صدّرها أولًا وافتح صفحة جديدة للاستيراد دون استبدالها.",
      );
    reviews = new Map(parsed.frames.map((f) => [f.frame_index, f]));
    undo.length = 0;
    redo.length = 0;
    render();
    status("استُعيدت المراجعة المطابقة؛ يمكنك المتابعة.");
  } catch (error) {
    status(error.message);
  } finally {
    $("import").value = "";
  }
};
fetch("sequence.json")
  .then((r) => {
    if (!r.ok) throw Error("تعذر تحميل وصف العينة.");
    return r.json();
  })
  .then((data) => {
    if (
      data.schema !== "sesen.annotation-sequence.v1" ||
      !Array.isArray(data.frames) ||
      data.frames.length < 2 ||
      data.frames.length > 150 ||
      data.frames.some((f, i) => f.index !== i)
    )
      throw Error("عينة غير صالحة أو غير متصلة.");
    sequence = data;
    const requested = Number(new URLSearchParams(location.search).get("frame"));
    if (
      Number.isInteger(requested) &&
      requested >= 0 &&
      requested < data.frames.length
    )
      current = requested;
    $("frame-slider").max = String(data.frames.length - 1);
    render();
    status("العينة جاهزة. راجع كل إطار مستقلًا ولا تعتمد اقتراحًا دون مشاهدة.");
  })
  .catch((error) => status(error.message));
