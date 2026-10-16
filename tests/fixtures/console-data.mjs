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
    "Fixture Left Back",
    "Fixture Center",
    "Fixture Right Wing",
  ].map((name, i) =>
    row(10 + i, {
      first_name: name,
      last_name: "Test",
      primary_position: ["RB", "P", "LW", "GK", "GK", "CB", "LB", "CB", "RW"][
        i
      ],
      shirt_number: [17, 66, 24, 1, 12, 10, 8, 10, 11][i],
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
  const historicalVideo = row(2000, {
    ...video,
    id: uid(2000),
    organization_id: organization,
    match_id: uid(600),
    storage_mode: "local",
    duration_ms: duration,
  });
  const historicalSession = row(2001, {
    match_id: uid(600),
    video_id: historicalVideo.id,
    is_primary: true,
    analyst_id: user,
    title: "Synthetic historical analysis",
  });
  const historicalPossession = row(2004, {
    match_id: uid(600),
    analysis_session_id: historicalSession.id,
    team_id: away,
    sequence_no: 1,
    period: 1,
    start_ms: 5000,
    end_ms: 6000,
    result: "goal",
    phase: "positional_attack",
  });
  const historicalEvent = row(2002, {
    match_id: uid(600),
    analysis_session_id: historicalSession.id,
    possession_id: historicalPossession.id,
    team_id: away,
    event_type: "shot",
    period: 1,
    timestamp_ms: 6000,
    actor_player_id: players[0].id,
    created_by: user,
    note: "SYNTHETIC HISTORICAL EVIDENCE",
  });
  const historicalShot = row(2003, {
    event_id: historicalEvent.id,
    shooter_id: players[0].id,
    goalkeeper_id: players[3].id,
    result: "goal",
    review_required: false,
    empty_goal: false,
    court_x: 0.4,
    court_y: 0.5,
    zone: "nine_meter_right",
  });
  const historicalInsight = row(2006, {
    team_id: away,
    title: "Fixture historical goal",
    source: "rule",
    insight_key: "synthetic-history",
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
          competition_id: competition.id,
          venue: "Synthetic UI fixture",
          created_by: user,
        }),
      ),
    ],
    analysis_sessions: [session, secondary, historicalSession],
    videos: [...(video.id ? [video] : []), historicalVideo],
    players,
    on_court_intervals: [
      ...[1, 2, 6, 7, 8].map((playerIndex, index) =>
        row(952 + index, {
          ...context,
          team_id: away,
          player_id: players[playerIndex].id,
          position: players[playerIndex].primary_position,
          period: 1,
          start_clock_ms: 0,
          end_clock_ms: 30000,
          verified: playerIndex !== 7,
        }),
      ),
      row(950, {
        ...context,
        team_id: away,
        player_id: players[4].id,
        position: "GK",
        period: 1,
        start_clock_ms: 0,
        end_clock_ms: 30000,
        verified: true,
      }),
      row(951, {
        ...context,
        team_id: away,
        player_id: players[4].id,
        position: "GK",
        period: 2,
        start_clock_ms: 0,
        end_clock_ms: null,
        verified: false,
      }),
    ],
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
    possessions: [...possessions, historicalPossession],
    events: [...events, secondaryEvent, historicalEvent],
    shot_attempts: [...shots, secondaryShot, historicalShot],
    possession_tactics: [
      ...tactics,
      row(2005, {
        possession_id: historicalPossession.id,
        term_id: terms[0].id,
      }),
    ],
    insights: [insight, secondaryInsight, historicalInsight],
    legacy_shot_reviews: [
      row(3100, {
        event_id: events[1].id,
        reason:
          "Synthetic review: compare canonical result with original event",
        resolved: false,
      }),
      row(3101, {
        event_id: events[23].id,
        reason: "Synthetic review: unresolved shot result",
        resolved: false,
      }),
      row(3102, {
        event_id: secondaryEvent.id,
        reason: "Excluded secondary-session review",
        resolved: false,
      }),
    ],
    video_annotations: [
      row(3000, {
        analysis_session_id: session.id,
        video_id: video.id,
        start_ms: 6000,
        end_ms: 11000,
        pause_on_entry: true,
        objects: [
          {
            id: uid(3010),
            kind: "arrow",
            label: "Fixture cross",
            color: "#00cccc",
            x: 0.3,
            y: 0.4,
            x2: 0.5,
            y2: 0.5,
          },
          {
            id: uid(3011),
            kind: "player",
            label: "17",
            color: "#e4be82",
            x: 0.25,
            y: 0.6,
          },
        ],
      }),
      row(3001, {
        analysis_session_id: session.id,
        video_id: video.id,
        start_ms: 20000,
        end_ms: 25000,
        pause_on_entry: false,
        objects: [
          {
            id: uid(3012),
            kind: "zone",
            label: "Fixture zone",
            color: "#00cccc",
            x: 0.6,
            y: 0.4,
          },
        ],
      }),
      row(3002, {
        analysis_session_id: secondary.id,
        video_id: video.id,
        start_ms: 6000,
        end_ms: 11000,
        pause_on_entry: true,
        objects: [],
      }),
    ],
    evidence_links: [
      ...linked.map((event, i) =>
        row(800 + i, { insight_id: insight.id, event_id: event.id }),
      ),
      row(1004, {
        insight_id: secondaryInsight.id,
        event_id: secondaryEvent.id,
      }),
      row(2007, {
        insight_id: historicalInsight.id,
        event_id: historicalEvent.id,
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
