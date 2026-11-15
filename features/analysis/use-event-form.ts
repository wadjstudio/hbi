"use client";
import { useState } from "react";

// Field state for the event tagging form. The workspace owns recording and
// editing logic; this only keeps the inputs together so the editor UI can be
// rendered from one object.
export function useEventForm() {
  const [templateId, setTemplate] = useState(""),
    [team, setTeam] = useState(""),
    [actor, setActor] = useState(""),
    [keeper, setKeeper] = useState(""),
    [eventType, setEventType] = useState("shot"),
    [phase, setPhase] = useState("other"),
    [eventX, setEventX] = useState(""),
    [eventY, setEventY] = useState(""),
    [result, setResult] = useState("unknown"),
    [empty, setEmpty] = useState(false),
    [shotType, setShotType] = useState(""),
    [distance, setDistance] = useState(""),
    [rebound, setRebound] = useState("unknown"),
    [fastBreak, setFastBreak] = useState(false),
    [zone, setZone] = useState("unknown"),
    [outcome, setOutcome] = useState("unknown"),
    [scoreFor, setScoreFor] = useState(""),
    [scoreAgainst, setScoreAgainst] = useState(""),
    [numericalFor, setNumericalFor] = useState(6),
    [numericalAgainst, setNumericalAgainst] = useState(6),
    [note, setNote] = useState(""),
    [terms, setTerms] = useState<string[]>([]),
    [pre, setPre] = useState(8),
    [post, setPost] = useState(4);
  return {
    templateId, setTemplate, team, setTeam, actor, setActor, keeper, setKeeper,
    eventType, setEventType, phase, setPhase, eventX, setEventX, eventY, setEventY,
    result, setResult, empty, setEmpty, shotType, setShotType,
    distance, setDistance, rebound, setRebound, fastBreak, setFastBreak,
    zone, setZone, outcome, setOutcome, scoreFor, setScoreFor,
    scoreAgainst, setScoreAgainst, numericalFor, setNumericalFor,
    numericalAgainst, setNumericalAgainst, note, setNote, terms, setTerms,
    pre, setPre, post, setPost,
  };
}

export type EventForm = ReturnType<typeof useEventForm>;
