// Synthetic layout stress data; imported by the loopback mock server only.
export function denseIntelligence(data, team, sessionId) {
  const events = data.events.filter(
    (event) =>
      event.team_id === team && event.analysis_session_id === sessionId,
  );
  const organization = events[0]?.organization_id;
  if (!organization || events.length !== 12)
    throw new Error("Expected the isolated twelve-event team sample");
  const uid = (index) =>
    `b0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  const row = (index, fields) => ({
    id: uid(index),
    organization_id: organization,
    revision: 2,
    ...fields,
  });
  const terms = [
    [
      "pivot_cooperation",
      "Fixture pivot cooperation",
      "تعاون تجريبي مع الدائرة",
    ],
    ["screen", "Fixture screen", "حجز تجريبي"],
    [
      "position_exchange",
      "Fixture position exchange with an intentionally long recorded tactical label",
      "تبادل مراكز تجريبي بعنوان تكتيكي طويل لاختبار إتاحة النص الكامل دون فقد أي جزء منه",
    ],
    ["isolation", "Fixture isolation", "عزل فردي تجريبي"],
  ].map(([code, label_en, label_ar], i) =>
    row(5000 + i, {
      category: "attack_action",
      code,
      label_en,
      label_ar,
      archived: false,
    }),
  );
  const assignments = terms.flatMap((term, i) =>
    events.slice(0, 2).map((event, j) =>
      row(5100 + i * 2 + j, {
        possession_id: event.possession_id,
        term_id: term.id,
      }),
    ),
  );
  const specs = [
    ["Fixture wing procedure", [203, 209, 215, 221], false],
    ["Fixture reviewed goals", [207, 217], true],
    ["Fixture nine-metre attempts", [207, 217], false],
    [
      "Fixture pending attempt with a deliberately long saved title that must remain available without clipping the full list",
      [223],
      false,
    ],
    [
      "عينة تجريبية بعنوان عربي طويل جدًا لقراءة النص الكامل مع قائمة أدلة مستقلة وأرقام لا تمثل الفيديو المعروض",
      [201, 203, 209],
      true,
    ],
  ];
  const insights = specs.map(([title, , is_reviewed], i) =>
    row(6100 + i, {
      team_id: team,
      source: "rule",
      insight_key: `dense-fixture-${i}`,
      title,
      is_reviewed,
      evidence: [],
      body: `Synthetic layout explanation ${i + 1}. These observations do not describe the displayed footage.\n${"LongSavedReference".repeat(20)}`,
    }),
  );
  const links = specs.flatMap(([, numbers], i) =>
    numbers.map((number, j) => {
      const event = events.find((event) =>
        event.id.endsWith(String(number).padStart(12, "0")),
      );
      if (!event) throw new Error("Missing dense fixture event");
      return row(6200 + i * 10 + j, {
        insight_id: insights[i].id,
        event_id: event.id,
      });
    }),
  );
  const players = [
    row(7100, {
      first_name: "Fixture extra shooter",
      last_name: "Test",
      shirt_number: 31,
      primary_position: "CB",
    }),
    row(7101, {
      first_name:
        "Fixture pending shooter with a deliberately long full name اسم لاعب تجريبي طويل",
      last_name: "Test",
      shirt_number: 32,
      primary_position: "LW",
    }),
  ];
  const reassigned = new Map(
    [
      [209, players[0].id],
      [219, players[0].id],
      [223, players[1].id],
    ].map(([number, id]) => [
      events.find((event) =>
        event.id.endsWith(String(number).padStart(12, "0")),
      ).id,
      id,
    ]),
  );
  return {
    ...data,
    players: [...data.players, ...players],
    match_roster: [
      ...data.match_roster,
      ...players.map((player, i) =>
        row(7200 + i, {
          match_id: events[0].match_id,
          player_id: player.id,
          team_id: team,
          side: "away",
        }),
      ),
    ],
    events: data.events.map((event) =>
      reassigned.has(event.id)
        ? { ...event, actor_player_id: reassigned.get(event.id) }
        : event,
    ),
    shot_attempts: data.shot_attempts.map((shot) =>
      reassigned.has(shot.event_id)
        ? { ...shot, shooter_id: reassigned.get(shot.event_id) }
        : shot,
    ),
    tactical_terms: [...data.tactical_terms, ...terms],
    possession_tactics: [...data.possession_tactics, ...assignments],
    insights: [...data.insights, ...insights],
    evidence_links: [...data.evidence_links, ...links],
  };
}
