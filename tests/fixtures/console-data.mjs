// Explicitly synthetic UI records. Only the loopback mock server imports this module.
export function consoleData({
  organization,
  home,
  away,
  match,
  user,
  session,
  video,
}) {
  const uid = (index) =>
    `a0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  const row = (index, data) => ({
    id: uid(index),
    organization_id: organization,
    revision: 2,
    ...data,
  });
  const context = { analysis_session_id: session.id, match_id: match.id };
  const duration = video.duration_ms;
  const competition = row(1, { name: "VISUAL TEST DATA · NOT MATCH ANALYSIS" });
  const players = [
    "Fixture Back",
    "Fixture Pivot",
    "Fixture Wing",
    "Fixture Home Keeper",
    "Fixture Away Keeper",
    "Fixture Home Back",
  ].map((name, i) =>
    row(10 + i, {
      first_name: name,
      last_name: "Test",
      primary_position: ["RB", "P", "LW", "GK", "GK", "CB"][i],
      shirt_number: [17, 66, 24, 1, 12, 10][i],
    }),
  );
  const terms = [
    {
      code: "fixture_cross",
      category: "attack_action",
      label_ar: "تقاطع تجريبي",
      label_en: "Fixture cross",
    },
    {
      code: "fixture_wing",
      category: "attack_action",
      label_ar: "دخول جناح تجريبي",
      label_en: "Fixture wing entry",
    },
    {
      code: "fixture_60",
      category: "defense_system",
      label_ar: "6:0",
      label_en: "6:0",
    },
    {
      code: "fixture_51",
      category: "defense_system",
      label_ar: "5:1",
      label_en: "5:1",
    },
  ].map((term, i) => row(20 + i, { ...term, archived: false }));
  const events = [],
    possessions = [],
    shots = [],
    tactics = [];
  for (let i = 0; i < 24; i++) {
    const team_id = i % 2 ? away : home;
    const timestamp_ms = Math.floor((duration * (i + 1)) / 26);
    const start_ms = Math.floor((duration * (i + 0.1)) / 26);
    const isTurnover = i % 5 === 0;
    const result =
      i === 23 ? "unknown" : ["goal", "save", "goal", "miss", "blocked"][i % 5];
    const actor =
      team_id === away ? players[Math.floor(i / 2) % 3] : players[5];
    const possession = row(100 + i, {
      ...context,
      team_id,
      sequence_no: i + 1,
      period: 1,
      start_ms,
      end_ms: timestamp_ms,
      phase: i % 3 === 0 ? "fast_break" : "positional_attack",
      result: isTurnover
        ? "turnover"
        : result === "unknown"
          ? null
          : result === "goal"
            ? "goal"
            : "shot",
    });
    const event = row(200 + i, {
      ...context,
      team_id,
      possession_id: possession.id,
      period: 1,
      timestamp_ms,
      actor_player_id: actor.id,
      event_type: isTurnover ? "turnover" : "shot",
      phase: possession.phase,
      shot_x: isTurnover && i !== 15 ? 0.1 + i / 30 : null,
      shot_y: isTurnover && i !== 15 ? 0.25 + (i % 3) / 5 : null,
      outcome: result === "goal" ? "success" : "unknown",
      created_by: user,
      note: "Synthetic visual fixture; not an observation from this footage.",
    });
    possessions.push(possession);
    events.push(event);
    if (!isTurnover)
      shots.push(
        row(300 + i, {
          event_id: event.id,
          shooter_id: actor.id,
          goalkeeper_id: team_id === away ? players[3].id : players[4].id,
          empty_goal: false,
          result,
          review_required: result === "unknown",
          zone: ["lw", "rw", "nine_meter_right", "pivot_center", "seven_meter"][
            i % 5
          ],
          court_x: 0.08 + ((i * 17) % 84) / 100,
          court_y: 0.1 + ((i * 13) % 76) / 100,
        }),
      );
    const term = team_id === away ? terms[i % 3 ? 0 : 1] : terms[i % 3 ? 2 : 3];
    tactics.push(
      row(400 + i, { possession_id: possession.id, term_id: term.id }),
    );
  }
  const insight = row(500, {
    team_id: away,
    source: "rule",
    insight_key: "fixture-only-cross",
    title: "Fixture cross sample",
    body: "Synthetic saved insight for UI acceptance only.",
    is_reviewed: false,
    evidence: [],
  });
  const linked = events.filter(
    (e) =>
      e.team_id === away &&
      tactics.some(
        (t) => t.possession_id === e.possession_id && t.term_id === terms[0].id,
      ),
  );
  const secondary = row(1000, {
    match_id: match.id,
    video_id: video.id,
    title: "Excluded duplicate analysis",
    analyst_id: user,
    is_primary: false,
  });
  const secondaryEvent = row(1001, {
    ...context,
    analysis_session_id: secondary.id,
    team_id: away,
    event_type: "shot",
    timestamp_ms: 500,
    period: 1,
    actor_player_id: players[0].id,
    created_by: user,
    note: "SECONDARY EXCLUDED",
  });
  const secondaryShot = row(1002, {
    event_id: secondaryEvent.id,
    shooter_id: players[0].id,
    result: "goal",
    empty_goal: false,
    review_required: false,
  });
  const secondaryInsight = row(1003, {
    team_id: away,
    source: "rule",
    insight_key: "excluded-fixture",
    title: "Wrong session insight",
    is_reviewed: false,
    evidence: [],
  });
  return {
    competitions: [competition],
    matches: [
      {
        ...match,
        competition_id: competition.id,
        home_score: 31,
        away_score: 28,
        starts_at: "2025-01-24T12:00:00Z",
        venue: "Synthetic UI fixture",
        revision: 2,
      },
      ...[
        [26, 29],
        [25, 25],
        [23, 28],
        [30, 27],
      ].map(([home_score, away_score], i) =>
        row(600 + i, {
          home_team_id: home,
          away_team_id: away,
          home_score,
          away_score,
          starts_at: `2025-01-${String(20 - i).padStart(2, "0")}T12:00:00Z`,
          status: "analysed",
          created_by: user,
        }),
      ),
    ],
    analysis_sessions: [session, secondary],
    players,
    match_roster: players.map((player, i) =>
      row(700 + i, {
        match_id: match.id,
        player_id: player.id,
        team_id: i === 3 || i === 5 ? home : away,
        side: i === 3 || i === 5 ? "home" : "away",
        shirt_number: player.shirt_number,
        starting: true,
      }),
    ),
    tactical_terms: terms,
    possessions,
    events: [...events, secondaryEvent],
    shot_attempts: [...shots, secondaryShot],
    possession_tactics: tactics,
    insights: [insight, secondaryInsight],
    evidence_links: [
      ...linked.map((event, i) =>
        row(800 + i, { insight_id: insight.id, event_id: event.id }),
      ),
      row(1004, {
        insight_id: secondaryInsight.id,
        event_id: secondaryEvent.id,
      }),
    ],
    video_clock_segments: [
      row(900, {
        analysis_session_id: session.id,
        period: 1,
        video_start_ms: 0,
        video_end_ms: duration,
        clock_start_ms: 0,
        running: true,
      }),
    ],
  };
}
