// Generated from the migrated PostgreSQL catalog by scripts/catalog-types.mjs.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = { public: { Tables: {
"analysis_sessions": { Row: {
"id": string;
"organization_id": string;
"match_id": string;
"video_id": string | null;
"title": string | null;
"analyst_id": string;
"is_primary": boolean;
"created_at": string;
"updated_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"match_id": string;
"video_id"?: string | null;
"title"?: string | null;
"analyst_id": string;
"is_primary"?: boolean;
"created_at"?: string;
"updated_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["analysis_sessions"]["Insert"]>; Relationships: [
{foreignKeyName:"analysis_sessions_analyst_id_fkey";columns:["analyst_id"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
{foreignKeyName:"analysis_sessions_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"analysis_sessions_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"analysis_sessions_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"analysis_sessions_video_id_fkey";columns:["video_id"];isOneToOne:false;referencedRelation:"videos";referencedColumns:["id"];},
{foreignKeyName:"analysis_sessions_video_id_scope_fk";columns:["organization_id","video_id"];isOneToOne:false;referencedRelation:"videos";referencedColumns:["organization_id","id"];},
]; };
"clip_events": { Row: {
"clip_id": string;
"event_id": string;
"organization_id": string;
}; Insert: {
"clip_id": string;
"event_id": string;
"organization_id": string;
}; Update: Partial<Database["public"]["Tables"]["clip_events"]["Insert"]>; Relationships: [
{foreignKeyName:"clip_events_clip_id_fkey";columns:["clip_id"];isOneToOne:false;referencedRelation:"clips";referencedColumns:["id"];},
{foreignKeyName:"clip_events_clip_id_scope_fk";columns:["organization_id","clip_id"];isOneToOne:false;referencedRelation:"clips";referencedColumns:["organization_id","id"];},
{foreignKeyName:"clip_events_event_id_fkey";columns:["event_id"];isOneToOne:false;referencedRelation:"events";referencedColumns:["id"];},
{foreignKeyName:"clip_events_event_id_scope_fk";columns:["organization_id","event_id"];isOneToOne:false;referencedRelation:"events";referencedColumns:["organization_id","id"];},
]; };
"clips": { Row: {
"id": string;
"organization_id": string;
"video_id": string;
"match_id": string | null;
"title": string;
"start_ms": number;
"end_ms": number;
"created_by": string;
"created_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"video_id": string;
"match_id"?: string | null;
"title": string;
"start_ms": number;
"end_ms": number;
"created_by": string;
"created_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["clips"]["Insert"]>; Relationships: [
{foreignKeyName:"clips_created_by_fkey";columns:["created_by"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
{foreignKeyName:"clips_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"clips_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"clips_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"clips_video_id_fkey";columns:["video_id"];isOneToOne:false;referencedRelation:"videos";referencedColumns:["id"];},
{foreignKeyName:"clips_video_id_scope_fk";columns:["organization_id","video_id"];isOneToOne:false;referencedRelation:"videos";referencedColumns:["organization_id","id"];},
]; };
"competitions": { Row: {
"id": string;
"organization_id": string;
"season_id": string | null;
"name": string;
"competition_type": string | null;
"country_code": string | null;
"created_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"season_id"?: string | null;
"name": string;
"competition_type"?: string | null;
"country_code"?: string | null;
"created_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["competitions"]["Insert"]>; Relationships: [
{foreignKeyName:"competitions_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"competitions_season_id_fkey";columns:["season_id"];isOneToOne:false;referencedRelation:"seasons";referencedColumns:["id"];},
{foreignKeyName:"competitions_season_id_scope_fk";columns:["organization_id","season_id"];isOneToOne:false;referencedRelation:"seasons";referencedColumns:["organization_id","id"];},
]; };
"event_participants": { Row: {
"event_id": string;
"player_id": string;
"role": "actor" | "assister" | "passer" | "receiver" | "defender" | "goalkeeper" | "victim" | "other";
"organization_id": string;
"id": string;
"revision": number;
}; Insert: {
"event_id": string;
"player_id": string;
"role": "actor" | "assister" | "passer" | "receiver" | "defender" | "goalkeeper" | "victim" | "other";
"organization_id": string;
"id"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["event_participants"]["Insert"]>; Relationships: [
{foreignKeyName:"event_participants_event_id_fkey";columns:["event_id"];isOneToOne:false;referencedRelation:"events";referencedColumns:["id"];},
{foreignKeyName:"event_participants_event_id_scope_fk";columns:["organization_id","event_id"];isOneToOne:false;referencedRelation:"events";referencedColumns:["organization_id","id"];},
{foreignKeyName:"event_participants_player_id_fkey";columns:["player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["id"];},
{foreignKeyName:"event_participants_player_id_scope_fk";columns:["organization_id","player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["organization_id","id"];},
]; };
"event_tags": { Row: {
"event_id": string;
"tag_id": string;
"organization_id": string;
}; Insert: {
"event_id": string;
"tag_id": string;
"organization_id": string;
}; Update: Partial<Database["public"]["Tables"]["event_tags"]["Insert"]>; Relationships: [
{foreignKeyName:"event_tags_event_id_fkey";columns:["event_id"];isOneToOne:false;referencedRelation:"events";referencedColumns:["id"];},
{foreignKeyName:"event_tags_event_id_scope_fk";columns:["organization_id","event_id"];isOneToOne:false;referencedRelation:"events";referencedColumns:["organization_id","id"];},
{foreignKeyName:"event_tags_tag_id_fkey";columns:["tag_id"];isOneToOne:false;referencedRelation:"tags";referencedColumns:["id"];},
{foreignKeyName:"event_tags_tag_id_scope_fk";columns:["organization_id","tag_id"];isOneToOne:false;referencedRelation:"tags";referencedColumns:["organization_id","id"];},
]; };
"events": { Row: {
"id": string;
"organization_id": string;
"analysis_session_id": string;
"match_id": string;
"possession_id": string | null;
"team_id": string | null;
"actor_player_id": string | null;
"timestamp_ms": number;
"end_ms": number | null;
"period": number;
"event_type": "possession_start" | "possession_end" | "shot" | "goal" | "save" | "miss" | "blocked_shot" | "turnover" | "steal" | "assist" | "technical_error" | "seven_meter_won" | "seven_meter_shot" | "two_minute_penalty" | "yellow_card" | "red_card" | "timeout" | "substitution" | "offensive_foul" | "defensive_foul" | "block" | "duel" | "custom";
"outcome": "success" | "failure" | "neutral" | "unknown";
"phase": "positional_attack" | "fast_break" | "second_wave" | "transition_defense" | "set_defense" | "seven_vs_six" | "empty_goal" | "power_play" | "short_handed" | "timeout" | "other" | null;
"attack_system": "unknown" | "standard_6v6" | "seven_vs_six" | "two_pivots" | "cross" | "double_cross" | "wing_entry" | "pivot_entry" | "backcourt" | "fast_break" | "second_wave" | "custom" | null;
"defense_system": "unknown" | "six_zero" | "five_one" | "three_two_one" | "four_two" | "three_three" | "man_to_man" | "mixed" | "custom" | null;
"court_zone": "lw" | "left_half" | "center" | "right_half" | "rw" | "pivot_left" | "pivot_center" | "pivot_right" | "seven_meter" | "nine_meter_left" | "nine_meter_center" | "nine_meter_right" | "backcourt_left" | "backcourt_center" | "backcourt_right" | "unknown" | null;
"shot_x": number | null;
"shot_y": number | null;
"goal_x": number | null;
"goal_y": number | null;
"numerical_for": number | null;
"numerical_against": number | null;
"note": string | null;
"metadata": Json;
"created_by": string;
"created_at": string;
"match_clock_ms": number | null;
"actor_position": "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P" | null;
"score_for": number | null;
"score_against": number | null;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"analysis_session_id": string;
"match_id": string;
"possession_id"?: string | null;
"team_id"?: string | null;
"actor_player_id"?: string | null;
"timestamp_ms": number;
"end_ms"?: number | null;
"period": number;
"event_type": "possession_start" | "possession_end" | "shot" | "goal" | "save" | "miss" | "blocked_shot" | "turnover" | "steal" | "assist" | "technical_error" | "seven_meter_won" | "seven_meter_shot" | "two_minute_penalty" | "yellow_card" | "red_card" | "timeout" | "substitution" | "offensive_foul" | "defensive_foul" | "block" | "duel" | "custom";
"outcome"?: "success" | "failure" | "neutral" | "unknown";
"phase"?: "positional_attack" | "fast_break" | "second_wave" | "transition_defense" | "set_defense" | "seven_vs_six" | "empty_goal" | "power_play" | "short_handed" | "timeout" | "other" | null;
"attack_system"?: "unknown" | "standard_6v6" | "seven_vs_six" | "two_pivots" | "cross" | "double_cross" | "wing_entry" | "pivot_entry" | "backcourt" | "fast_break" | "second_wave" | "custom" | null;
"defense_system"?: "unknown" | "six_zero" | "five_one" | "three_two_one" | "four_two" | "three_three" | "man_to_man" | "mixed" | "custom" | null;
"court_zone"?: "lw" | "left_half" | "center" | "right_half" | "rw" | "pivot_left" | "pivot_center" | "pivot_right" | "seven_meter" | "nine_meter_left" | "nine_meter_center" | "nine_meter_right" | "backcourt_left" | "backcourt_center" | "backcourt_right" | "unknown" | null;
"shot_x"?: number | null;
"shot_y"?: number | null;
"goal_x"?: number | null;
"goal_y"?: number | null;
"numerical_for"?: number | null;
"numerical_against"?: number | null;
"note"?: string | null;
"metadata"?: Json;
"created_by": string;
"created_at"?: string;
"match_clock_ms"?: number | null;
"actor_position"?: "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P" | null;
"score_for"?: number | null;
"score_against"?: number | null;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>; Relationships: [
{foreignKeyName:"events_actor_player_id_fkey";columns:["actor_player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["id"];},
{foreignKeyName:"events_actor_player_id_scope_fk";columns:["organization_id","actor_player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["organization_id","id"];},
{foreignKeyName:"events_analysis_session_id_fkey";columns:["analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["id"];},
{foreignKeyName:"events_analysis_session_id_scope_fk";columns:["organization_id","analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["organization_id","id"];},
{foreignKeyName:"events_created_by_fkey";columns:["created_by"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
{foreignKeyName:"events_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"events_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"events_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"events_possession_id_fkey";columns:["possession_id"];isOneToOne:false;referencedRelation:"possessions";referencedColumns:["id"];},
{foreignKeyName:"events_possession_id_scope_fk";columns:["organization_id","possession_id"];isOneToOne:false;referencedRelation:"possessions";referencedColumns:["organization_id","id"];},
{foreignKeyName:"events_team_id_fkey";columns:["team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"events_team_id_scope_fk";columns:["organization_id","team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
]; };
"evidence_links": { Row: {
"id": string;
"organization_id": string;
"insight_id": string | null;
"event_id": string | null;
"shot_id": string | null;
"clip_id": string | null;
"tactic_id": string | null;
"note": string | null;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"insight_id"?: string | null;
"event_id"?: string | null;
"shot_id"?: string | null;
"clip_id"?: string | null;
"tactic_id"?: string | null;
"note"?: string | null;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["evidence_links"]["Insert"]>; Relationships: [
{foreignKeyName:"evidence_links_clip_id_fkey";columns:["clip_id"];isOneToOne:false;referencedRelation:"clips";referencedColumns:["id"];},
{foreignKeyName:"evidence_links_clip_id_scope_fk";columns:["organization_id","clip_id"];isOneToOne:false;referencedRelation:"clips";referencedColumns:["organization_id","id"];},
{foreignKeyName:"evidence_links_event_id_fkey";columns:["event_id"];isOneToOne:false;referencedRelation:"events";referencedColumns:["id"];},
{foreignKeyName:"evidence_links_event_id_scope_fk";columns:["organization_id","event_id"];isOneToOne:false;referencedRelation:"events";referencedColumns:["organization_id","id"];},
{foreignKeyName:"evidence_links_insight_id_fkey";columns:["insight_id"];isOneToOne:false;referencedRelation:"insights";referencedColumns:["id"];},
{foreignKeyName:"evidence_links_insight_id_scope_fk";columns:["organization_id","insight_id"];isOneToOne:false;referencedRelation:"insights";referencedColumns:["organization_id","id"];},
{foreignKeyName:"evidence_links_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"evidence_links_shot_id_fkey";columns:["shot_id"];isOneToOne:false;referencedRelation:"shot_attempts";referencedColumns:["id"];},
{foreignKeyName:"evidence_links_shot_id_scope_fk";columns:["organization_id","shot_id"];isOneToOne:false;referencedRelation:"shot_attempts";referencedColumns:["organization_id","id"];},
{foreignKeyName:"evidence_links_tactic_id_fkey";columns:["tactic_id"];isOneToOne:false;referencedRelation:"tactic_documents";referencedColumns:["id"];},
{foreignKeyName:"evidence_links_tactic_id_scope_fk";columns:["organization_id","tactic_id"];isOneToOne:false;referencedRelation:"tactic_documents";referencedColumns:["organization_id","id"];},
]; };
"insights": { Row: {
"id": string;
"organization_id": string;
"team_id": string | null;
"match_id": string | null;
"player_id": string | null;
"source": "rule" | "ai" | "manual";
"insight_key": string | null;
"title": string;
"body": string;
"confidence": number | null;
"evidence": Json;
"is_reviewed": boolean;
"generated_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"team_id"?: string | null;
"match_id"?: string | null;
"player_id"?: string | null;
"source": "rule" | "ai" | "manual";
"insight_key"?: string | null;
"title": string;
"body": string;
"confidence"?: number | null;
"evidence"?: Json;
"is_reviewed"?: boolean;
"generated_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["insights"]["Insert"]>; Relationships: [
{foreignKeyName:"insights_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"insights_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"insights_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"insights_player_id_fkey";columns:["player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["id"];},
{foreignKeyName:"insights_player_id_scope_fk";columns:["organization_id","player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["organization_id","id"];},
{foreignKeyName:"insights_team_id_fkey";columns:["team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"insights_team_id_scope_fk";columns:["organization_id","team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
]; };
"legacy_shot_reviews": { Row: {
"id": string;
"organization_id": string;
"event_id": string;
"reason": string;
"resolved": boolean;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"event_id": string;
"reason": string;
"resolved"?: boolean;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["legacy_shot_reviews"]["Insert"]>; Relationships: [
{foreignKeyName:"legacy_shot_reviews_event_id_fkey";columns:["event_id"];isOneToOne:true;referencedRelation:"events";referencedColumns:["id"];},
{foreignKeyName:"legacy_shot_reviews_event_id_scope_fk";columns:["organization_id","event_id"];isOneToOne:false;referencedRelation:"events";referencedColumns:["organization_id","id"];},
{foreignKeyName:"legacy_shot_reviews_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"match_roster": { Row: {
"match_id": string;
"player_id": string;
"team_id": string;
"side": "home" | "away";
"shirt_number": number | null;
"starting": boolean;
"organization_id": string;
"id": string;
"revision": number;
}; Insert: {
"match_id": string;
"player_id": string;
"team_id": string;
"side": "home" | "away";
"shirt_number"?: number | null;
"starting"?: boolean;
"organization_id": string;
"id"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["match_roster"]["Insert"]>; Relationships: [
{foreignKeyName:"match_roster_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"match_roster_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"match_roster_player_id_fkey";columns:["player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["id"];},
{foreignKeyName:"match_roster_player_id_scope_fk";columns:["organization_id","player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["organization_id","id"];},
{foreignKeyName:"match_roster_team_id_fkey";columns:["team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"match_roster_team_id_scope_fk";columns:["organization_id","team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
]; };
"matches": { Row: {
"id": string;
"organization_id": string;
"season_id": string | null;
"competition_id": string | null;
"home_team_id": string;
"away_team_id": string;
"starts_at": string | null;
"venue": string | null;
"home_score": number | null;
"away_score": number | null;
"status": "scheduled" | "ready" | "in_analysis" | "analysed" | "archived";
"notes": string | null;
"created_by": string;
"created_at": string;
"updated_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"season_id"?: string | null;
"competition_id"?: string | null;
"home_team_id": string;
"away_team_id": string;
"starts_at"?: string | null;
"venue"?: string | null;
"home_score"?: number | null;
"away_score"?: number | null;
"status"?: "scheduled" | "ready" | "in_analysis" | "analysed" | "archived";
"notes"?: string | null;
"created_by": string;
"created_at"?: string;
"updated_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>; Relationships: [
{foreignKeyName:"matches_away_team_id_fkey";columns:["away_team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"matches_away_team_id_scope_fk";columns:["organization_id","away_team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
{foreignKeyName:"matches_competition_id_fkey";columns:["competition_id"];isOneToOne:false;referencedRelation:"competitions";referencedColumns:["id"];},
{foreignKeyName:"matches_competition_id_scope_fk";columns:["organization_id","competition_id"];isOneToOne:false;referencedRelation:"competitions";referencedColumns:["organization_id","id"];},
{foreignKeyName:"matches_created_by_fkey";columns:["created_by"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
{foreignKeyName:"matches_home_team_id_fkey";columns:["home_team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"matches_home_team_id_scope_fk";columns:["organization_id","home_team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
{foreignKeyName:"matches_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"matches_season_id_fkey";columns:["season_id"];isOneToOne:false;referencedRelation:"seasons";referencedColumns:["id"];},
{foreignKeyName:"matches_season_id_scope_fk";columns:["organization_id","season_id"];isOneToOne:false;referencedRelation:"seasons";referencedColumns:["organization_id","id"];},
]; };
"metric_definitions": { Row: {
"code": string;
"label_ar": string;
"label_en": string;
"unit": string;
"positions": ("GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P")[];
"formula": string;
}; Insert: {
"code": string;
"label_ar": string;
"label_en": string;
"unit": string;
"positions": ("GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P")[];
"formula": string;
}; Update: Partial<Database["public"]["Tables"]["metric_definitions"]["Insert"]>; Relationships: [
]; };
"on_court_intervals": { Row: {
"id": string;
"organization_id": string;
"analysis_session_id": string;
"match_id": string;
"team_id": string;
"player_id": string;
"position": "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P";
"period": number;
"start_clock_ms": number;
"end_clock_ms": number | null;
"verified": boolean;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"analysis_session_id": string;
"match_id": string;
"team_id": string;
"player_id": string;
"position": "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P";
"period": number;
"start_clock_ms": number;
"end_clock_ms"?: number | null;
"verified"?: boolean;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["on_court_intervals"]["Insert"]>; Relationships: [
{foreignKeyName:"on_court_intervals_analysis_session_id_fkey";columns:["analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["id"];},
{foreignKeyName:"on_court_intervals_analysis_session_id_scope_fk";columns:["organization_id","analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["organization_id","id"];},
{foreignKeyName:"on_court_intervals_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"on_court_intervals_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"on_court_intervals_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"on_court_intervals_player_id_fkey";columns:["player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["id"];},
{foreignKeyName:"on_court_intervals_player_id_scope_fk";columns:["organization_id","player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["organization_id","id"];},
{foreignKeyName:"on_court_intervals_team_id_fkey";columns:["team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"on_court_intervals_team_id_scope_fk";columns:["organization_id","team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
]; };
"organization_members": { Row: {
"organization_id": string;
"user_id": string;
"role": "owner" | "technical_director" | "head_coach" | "assistant_coach" | "analyst" | "viewer";
"created_at": string;
}; Insert: {
"organization_id": string;
"user_id": string;
"role": "owner" | "technical_director" | "head_coach" | "assistant_coach" | "analyst" | "viewer";
"created_at"?: string;
}; Update: Partial<Database["public"]["Tables"]["organization_members"]["Insert"]>; Relationships: [
{foreignKeyName:"organization_members_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"organization_members_user_id_fkey";columns:["user_id"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
]; };
"organizations": { Row: {
"id": string;
"name": string;
"slug": string;
"logo_url": string | null;
"country_code": string | null;
"created_by": string;
"created_at": string;
}; Insert: {
"id"?: string;
"name": string;
"slug": string;
"logo_url"?: string | null;
"country_code"?: string | null;
"created_by": string;
"created_at"?: string;
}; Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>; Relationships: [
{foreignKeyName:"organizations_created_by_fkey";columns:["created_by"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
]; };
"players": { Row: {
"id": string;
"organization_id": string;
"first_name": string;
"last_name": string;
"display_name": string | null;
"birth_date": string | null;
"nationality_code": string | null;
"height_cm": number | null;
"weight_kg": number | null;
"dominant_hand": "left" | "right" | "both" | "unknown";
"primary_position": "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P" | null;
"secondary_position": "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P" | null;
"shirt_number": number | null;
"photo_url": string | null;
"external_ref": string | null;
"created_at": string;
"updated_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"first_name": string;
"last_name": string;
"birth_date"?: string | null;
"nationality_code"?: string | null;
"height_cm"?: number | null;
"weight_kg"?: number | null;
"dominant_hand"?: "left" | "right" | "both" | "unknown";
"primary_position"?: "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P" | null;
"secondary_position"?: "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P" | null;
"shirt_number"?: number | null;
"photo_url"?: string | null;
"external_ref"?: string | null;
"created_at"?: string;
"updated_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>; Relationships: [
{foreignKeyName:"players_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"playlist_items": { Row: {
"id": string;
"playlist_id": string;
"clip_id": string;
"position": number;
"title_override": string | null;
"coach_note": string | null;
"organization_id": string;
"revision": number;
}; Insert: {
"id"?: string;
"playlist_id": string;
"clip_id": string;
"position": number;
"title_override"?: string | null;
"coach_note"?: string | null;
"organization_id": string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["playlist_items"]["Insert"]>; Relationships: [
{foreignKeyName:"playlist_items_clip_id_fkey";columns:["clip_id"];isOneToOne:false;referencedRelation:"clips";referencedColumns:["id"];},
{foreignKeyName:"playlist_items_clip_id_scope_fk";columns:["organization_id","clip_id"];isOneToOne:false;referencedRelation:"clips";referencedColumns:["organization_id","id"];},
{foreignKeyName:"playlist_items_playlist_id_fkey";columns:["playlist_id"];isOneToOne:false;referencedRelation:"playlists";referencedColumns:["id"];},
{foreignKeyName:"playlist_items_playlist_id_scope_fk";columns:["organization_id","playlist_id"];isOneToOne:false;referencedRelation:"playlists";referencedColumns:["organization_id","id"];},
]; };
"playlists": { Row: {
"id": string;
"organization_id": string;
"team_id": string | null;
"match_id": string | null;
"title": string;
"description": string | null;
"created_by": string;
"created_at": string;
"updated_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"team_id"?: string | null;
"match_id"?: string | null;
"title": string;
"description"?: string | null;
"created_by": string;
"created_at"?: string;
"updated_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["playlists"]["Insert"]>; Relationships: [
{foreignKeyName:"playlists_created_by_fkey";columns:["created_by"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
{foreignKeyName:"playlists_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"playlists_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"playlists_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"playlists_team_id_fkey";columns:["team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"playlists_team_id_scope_fk";columns:["organization_id","team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
]; };
"possession_tactics": { Row: {
"id": string;
"organization_id": string;
"possession_id": string;
"term_id": string;
"sequence_no": number;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"possession_id": string;
"term_id": string;
"sequence_no"?: number;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["possession_tactics"]["Insert"]>; Relationships: [
{foreignKeyName:"possession_tactics_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"possession_tactics_possession_id_fkey";columns:["possession_id"];isOneToOne:false;referencedRelation:"possessions";referencedColumns:["id"];},
{foreignKeyName:"possession_tactics_possession_id_scope_fk";columns:["organization_id","possession_id"];isOneToOne:false;referencedRelation:"possessions";referencedColumns:["organization_id","id"];},
{foreignKeyName:"possession_tactics_term_id_fkey";columns:["term_id"];isOneToOne:false;referencedRelation:"tactical_terms";referencedColumns:["id"];},
]; };
"possessions": { Row: {
"id": string;
"organization_id": string;
"analysis_session_id": string;
"match_id": string;
"team_id": string;
"sequence_no": number;
"period": number;
"start_ms": number;
"end_ms": number | null;
"phase": "positional_attack" | "fast_break" | "second_wave" | "transition_defense" | "set_defense" | "seven_vs_six" | "empty_goal" | "power_play" | "short_handed" | "timeout" | "other";
"attack_system": "unknown" | "standard_6v6" | "seven_vs_six" | "two_pivots" | "cross" | "double_cross" | "wing_entry" | "pivot_entry" | "backcourt" | "fast_break" | "second_wave" | "custom" | null;
"opponent_defense": "unknown" | "six_zero" | "five_one" | "three_two_one" | "four_two" | "three_three" | "man_to_man" | "mixed" | "custom" | null;
"score_for": number | null;
"score_against": number | null;
"numerical_for": number | null;
"numerical_against": number | null;
"result": "possession_start" | "possession_end" | "shot" | "goal" | "save" | "miss" | "blocked_shot" | "turnover" | "steal" | "assist" | "technical_error" | "seven_meter_won" | "seven_meter_shot" | "two_minute_penalty" | "yellow_card" | "red_card" | "timeout" | "substitution" | "offensive_foul" | "defensive_foul" | "block" | "duel" | "custom" | null;
"created_at": string;
"review_status": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"analysis_session_id": string;
"match_id": string;
"team_id": string;
"sequence_no": number;
"period": number;
"start_ms": number;
"end_ms"?: number | null;
"phase": "positional_attack" | "fast_break" | "second_wave" | "transition_defense" | "set_defense" | "seven_vs_six" | "empty_goal" | "power_play" | "short_handed" | "timeout" | "other";
"attack_system"?: "unknown" | "standard_6v6" | "seven_vs_six" | "two_pivots" | "cross" | "double_cross" | "wing_entry" | "pivot_entry" | "backcourt" | "fast_break" | "second_wave" | "custom" | null;
"opponent_defense"?: "unknown" | "six_zero" | "five_one" | "three_two_one" | "four_two" | "three_three" | "man_to_man" | "mixed" | "custom" | null;
"score_for"?: number | null;
"score_against"?: number | null;
"numerical_for"?: number | null;
"numerical_against"?: number | null;
"result"?: "possession_start" | "possession_end" | "shot" | "goal" | "save" | "miss" | "blocked_shot" | "turnover" | "steal" | "assist" | "technical_error" | "seven_meter_won" | "seven_meter_shot" | "two_minute_penalty" | "yellow_card" | "red_card" | "timeout" | "substitution" | "offensive_foul" | "defensive_foul" | "block" | "duel" | "custom" | null;
"created_at"?: string;
"review_status"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["possessions"]["Insert"]>; Relationships: [
{foreignKeyName:"possessions_analysis_session_id_fkey";columns:["analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["id"];},
{foreignKeyName:"possessions_analysis_session_id_scope_fk";columns:["organization_id","analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["organization_id","id"];},
{foreignKeyName:"possessions_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"possessions_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"possessions_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"possessions_team_id_fkey";columns:["team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"possessions_team_id_scope_fk";columns:["organization_id","team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
]; };
"presentation_items": { Row: {
"id": string;
"organization_id": string;
"presentation_id": string;
"position": number;
"clip_id": string | null;
"tactic_id": string | null;
"insight_id": string | null;
"body": string | null;
"speaker_note": string | null;
"autoplay": boolean;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"presentation_id": string;
"position": number;
"clip_id"?: string | null;
"tactic_id"?: string | null;
"insight_id"?: string | null;
"body"?: string | null;
"speaker_note"?: string | null;
"autoplay"?: boolean;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["presentation_items"]["Insert"]>; Relationships: [
{foreignKeyName:"presentation_items_clip_id_fkey";columns:["clip_id"];isOneToOne:false;referencedRelation:"clips";referencedColumns:["id"];},
{foreignKeyName:"presentation_items_clip_id_scope_fk";columns:["organization_id","clip_id"];isOneToOne:false;referencedRelation:"clips";referencedColumns:["organization_id","id"];},
{foreignKeyName:"presentation_items_insight_id_fkey";columns:["insight_id"];isOneToOne:false;referencedRelation:"insights";referencedColumns:["id"];},
{foreignKeyName:"presentation_items_insight_id_scope_fk";columns:["organization_id","insight_id"];isOneToOne:false;referencedRelation:"insights";referencedColumns:["organization_id","id"];},
{foreignKeyName:"presentation_items_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"presentation_items_presentation_id_fkey";columns:["presentation_id"];isOneToOne:false;referencedRelation:"presentations";referencedColumns:["id"];},
{foreignKeyName:"presentation_items_presentation_id_scope_fk";columns:["organization_id","presentation_id"];isOneToOne:false;referencedRelation:"presentations";referencedColumns:["organization_id","id"];},
{foreignKeyName:"presentation_items_tactic_id_fkey";columns:["tactic_id"];isOneToOne:false;referencedRelation:"tactic_documents";referencedColumns:["id"];},
{foreignKeyName:"presentation_items_tactic_id_scope_fk";columns:["organization_id","tactic_id"];isOneToOne:false;referencedRelation:"tactic_documents";referencedColumns:["organization_id","id"];},
]; };
"presentations": { Row: {
"id": string;
"organization_id": string;
"title": string;
"created_by": string;
"created_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"title": string;
"created_by": string;
"created_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["presentations"]["Insert"]>; Relationships: [
{foreignKeyName:"presentations_created_by_fkey";columns:["created_by"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
{foreignKeyName:"presentations_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"profiles": { Row: {
"id": string;
"display_name": string;
"avatar_url": string | null;
"locale": string;
"created_at": string;
"updated_at": string;
}; Insert: {
"id": string;
"display_name": string;
"avatar_url"?: string | null;
"locale"?: string;
"created_at"?: string;
"updated_at"?: string;
}; Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>; Relationships: [
{foreignKeyName:"profiles_id_fkey";columns:["id"];isOneToOne:true;referencedRelation:"users";referencedColumns:["id"];},
]; };
"reports": { Row: {
"id": string;
"organization_id": string;
"report_type": "match" | "opponent" | "player" | "team";
"match_id": string | null;
"team_id": string | null;
"player_id": string | null;
"title": string;
"status": string;
"content": Json;
"created_by": string;
"created_at": string;
"updated_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"report_type": "match" | "opponent" | "player" | "team";
"match_id"?: string | null;
"team_id"?: string | null;
"player_id"?: string | null;
"title": string;
"status"?: string;
"content"?: Json;
"created_by": string;
"created_at"?: string;
"updated_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>; Relationships: [
{foreignKeyName:"reports_created_by_fkey";columns:["created_by"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
{foreignKeyName:"reports_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"reports_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"reports_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"reports_player_id_fkey";columns:["player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["id"];},
{foreignKeyName:"reports_player_id_scope_fk";columns:["organization_id","player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["organization_id","id"];},
{foreignKeyName:"reports_team_id_fkey";columns:["team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"reports_team_id_scope_fk";columns:["organization_id","team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
]; };
"seasons": { Row: {
"id": string;
"organization_id": string;
"name": string;
"starts_on": string | null;
"ends_on": string | null;
"is_current": boolean;
"created_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"name": string;
"starts_on"?: string | null;
"ends_on"?: string | null;
"is_current"?: boolean;
"created_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["seasons"]["Insert"]>; Relationships: [
{foreignKeyName:"seasons_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"shot_attempts": { Row: {
"id": string;
"organization_id": string;
"event_id": string;
"shooter_id": string | null;
"goalkeeper_id": string | null;
"shooter_position": "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P" | null;
"result": string;
"empty_goal": boolean;
"zone": "lw" | "left_half" | "center" | "right_half" | "rw" | "pivot_left" | "pivot_center" | "pivot_right" | "seven_meter" | "nine_meter_left" | "nine_meter_center" | "nine_meter_right" | "backcourt_left" | "backcourt_center" | "backcourt_right" | "unknown" | null;
"distance_m": number | null;
"shot_type_id": string | null;
"court_x": number | null;
"court_y": number | null;
"goal_x": number | null;
"goal_y": number | null;
"rebound": string | null;
"starts_fast_break": boolean | null;
"review_required": boolean;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"event_id": string;
"shooter_id"?: string | null;
"goalkeeper_id"?: string | null;
"shooter_position"?: "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P" | null;
"result": string;
"empty_goal"?: boolean;
"zone"?: "lw" | "left_half" | "center" | "right_half" | "rw" | "pivot_left" | "pivot_center" | "pivot_right" | "seven_meter" | "nine_meter_left" | "nine_meter_center" | "nine_meter_right" | "backcourt_left" | "backcourt_center" | "backcourt_right" | "unknown" | null;
"distance_m"?: number | null;
"shot_type_id"?: string | null;
"court_x"?: number | null;
"court_y"?: number | null;
"goal_x"?: number | null;
"goal_y"?: number | null;
"rebound"?: string | null;
"starts_fast_break"?: boolean | null;
"review_required"?: boolean;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["shot_attempts"]["Insert"]>; Relationships: [
{foreignKeyName:"shot_attempts_event_id_fkey";columns:["event_id"];isOneToOne:true;referencedRelation:"events";referencedColumns:["id"];},
{foreignKeyName:"shot_attempts_event_id_scope_fk";columns:["organization_id","event_id"];isOneToOne:false;referencedRelation:"events";referencedColumns:["organization_id","id"];},
{foreignKeyName:"shot_attempts_goalkeeper_id_fkey";columns:["goalkeeper_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["id"];},
{foreignKeyName:"shot_attempts_goalkeeper_id_scope_fk";columns:["organization_id","goalkeeper_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["organization_id","id"];},
{foreignKeyName:"shot_attempts_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"shot_attempts_shooter_id_fkey";columns:["shooter_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["id"];},
{foreignKeyName:"shot_attempts_shooter_id_scope_fk";columns:["organization_id","shooter_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["organization_id","id"];},
{foreignKeyName:"shot_attempts_shot_type_id_fkey";columns:["shot_type_id"];isOneToOne:false;referencedRelation:"tactical_terms";referencedColumns:["id"];},
]; };
"substitutions": { Row: {
"id": string;
"organization_id": string;
"analysis_session_id": string;
"match_id": string;
"team_id": string;
"out_player_id": string | null;
"in_player_id": string | null;
"period": number;
"clock_ms": number;
"video_ms": number;
"position": "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P";
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"analysis_session_id": string;
"match_id": string;
"team_id": string;
"out_player_id"?: string | null;
"in_player_id"?: string | null;
"period": number;
"clock_ms": number;
"video_ms": number;
"position": "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P";
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["substitutions"]["Insert"]>; Relationships: [
{foreignKeyName:"substitutions_analysis_session_id_fkey";columns:["analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["id"];},
{foreignKeyName:"substitutions_analysis_session_id_scope_fk";columns:["organization_id","analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["organization_id","id"];},
{foreignKeyName:"substitutions_in_player_id_fkey";columns:["in_player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["id"];},
{foreignKeyName:"substitutions_in_player_id_scope_fk";columns:["organization_id","in_player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["organization_id","id"];},
{foreignKeyName:"substitutions_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"substitutions_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"substitutions_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"substitutions_out_player_id_fkey";columns:["out_player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["id"];},
{foreignKeyName:"substitutions_out_player_id_scope_fk";columns:["organization_id","out_player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["organization_id","id"];},
{foreignKeyName:"substitutions_team_id_fkey";columns:["team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"substitutions_team_id_scope_fk";columns:["organization_id","team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
]; };
"sync_receipts": { Row: {
"operation_id": string;
"user_id": string;
"organization_id": string;
"result": Json;
"created_at": string;
}; Insert: {
"operation_id": string;
"user_id": string;
"organization_id": string;
"result": Json;
"created_at"?: string;
}; Update: Partial<Database["public"]["Tables"]["sync_receipts"]["Insert"]>; Relationships: [
{foreignKeyName:"sync_receipts_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"sync_receipts_user_id_fkey";columns:["user_id"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
]; };
"tactic_animations": { Row: {
"id": string;
"organization_id": string;
"from_frame_id": string;
"to_frame_id": string;
"duration_ms": number;
"easing": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"from_frame_id": string;
"to_frame_id": string;
"duration_ms"?: number;
"easing"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["tactic_animations"]["Insert"]>; Relationships: [
{foreignKeyName:"tactic_animations_from_frame_id_fkey";columns:["from_frame_id"];isOneToOne:false;referencedRelation:"tactic_frames";referencedColumns:["id"];},
{foreignKeyName:"tactic_animations_from_frame_id_scope_fk";columns:["organization_id","from_frame_id"];isOneToOne:false;referencedRelation:"tactic_frames";referencedColumns:["organization_id","id"];},
{foreignKeyName:"tactic_animations_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"tactic_animations_to_frame_id_fkey";columns:["to_frame_id"];isOneToOne:false;referencedRelation:"tactic_frames";referencedColumns:["id"];},
{foreignKeyName:"tactic_animations_to_frame_id_scope_fk";columns:["organization_id","to_frame_id"];isOneToOne:false;referencedRelation:"tactic_frames";referencedColumns:["organization_id","id"];},
]; };
"tactic_documents": { Row: {
"id": string;
"organization_id": string;
"title": string;
"description": string | null;
"team_id": string | null;
"match_id": string | null;
"created_by": string;
"created_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"title": string;
"description"?: string | null;
"team_id"?: string | null;
"match_id"?: string | null;
"created_by": string;
"created_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["tactic_documents"]["Insert"]>; Relationships: [
{foreignKeyName:"tactic_documents_created_by_fkey";columns:["created_by"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
{foreignKeyName:"tactic_documents_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"tactic_documents_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"tactic_documents_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"tactic_documents_team_id_fkey";columns:["team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"tactic_documents_team_id_scope_fk";columns:["organization_id","team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
]; };
"tactic_frame_objects": { Row: {
"id": string;
"organization_id": string;
"frame_id": string;
"object_id": string;
"x": number;
"y": number;
"geometry": Json;
"visible": boolean;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"frame_id": string;
"object_id": string;
"x": number;
"y": number;
"geometry"?: Json;
"visible"?: boolean;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["tactic_frame_objects"]["Insert"]>; Relationships: [
{foreignKeyName:"tactic_frame_objects_frame_id_fkey";columns:["frame_id"];isOneToOne:false;referencedRelation:"tactic_frames";referencedColumns:["id"];},
{foreignKeyName:"tactic_frame_objects_frame_id_scope_fk";columns:["organization_id","frame_id"];isOneToOne:false;referencedRelation:"tactic_frames";referencedColumns:["organization_id","id"];},
{foreignKeyName:"tactic_frame_objects_object_id_fkey";columns:["object_id"];isOneToOne:false;referencedRelation:"tactic_objects";referencedColumns:["id"];},
{foreignKeyName:"tactic_frame_objects_object_id_scope_fk";columns:["organization_id","object_id"];isOneToOne:false;referencedRelation:"tactic_objects";referencedColumns:["organization_id","id"];},
{foreignKeyName:"tactic_frame_objects_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"tactic_frames": { Row: {
"id": string;
"organization_id": string;
"document_id": string;
"position": number;
"title": string | null;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"document_id": string;
"position": number;
"title"?: string | null;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["tactic_frames"]["Insert"]>; Relationships: [
{foreignKeyName:"tactic_frames_document_id_fkey";columns:["document_id"];isOneToOne:false;referencedRelation:"tactic_documents";referencedColumns:["id"];},
{foreignKeyName:"tactic_frames_document_id_scope_fk";columns:["organization_id","document_id"];isOneToOne:false;referencedRelation:"tactic_documents";referencedColumns:["organization_id","id"];},
{foreignKeyName:"tactic_frames_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"tactic_objects": { Row: {
"id": string;
"organization_id": string;
"document_id": string;
"kind": string;
"label": string | null;
"color": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"document_id": string;
"kind": string;
"label"?: string | null;
"color"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["tactic_objects"]["Insert"]>; Relationships: [
{foreignKeyName:"tactic_objects_document_id_fkey";columns:["document_id"];isOneToOne:false;referencedRelation:"tactic_documents";referencedColumns:["id"];},
{foreignKeyName:"tactic_objects_document_id_scope_fk";columns:["organization_id","document_id"];isOneToOne:false;referencedRelation:"tactic_documents";referencedColumns:["organization_id","id"];},
{foreignKeyName:"tactic_objects_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"tactical_terms": { Row: {
"id": string;
"organization_id": string | null;
"category": string;
"code": string;
"label_ar": string;
"label_en": string;
"archived": boolean;
"created_at": string;
}; Insert: {
"id"?: string;
"organization_id"?: string | null;
"category": string;
"code": string;
"label_ar": string;
"label_en": string;
"archived"?: boolean;
"created_at"?: string;
}; Update: Partial<Database["public"]["Tables"]["tactical_terms"]["Insert"]>; Relationships: [
{foreignKeyName:"tactical_terms_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"tagging_templates": { Row: {
"id": string;
"organization_id": string;
"title": string;
"buttons": Json;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"title": string;
"buttons": Json;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["tagging_templates"]["Insert"]>; Relationships: [
{foreignKeyName:"tagging_templates_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"tags": { Row: {
"id": string;
"organization_id": string;
"name": string;
"color_key": string | null;
"created_at": string;
}; Insert: {
"id"?: string;
"organization_id": string;
"name": string;
"color_key"?: string | null;
"created_at"?: string;
}; Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>; Relationships: [
{foreignKeyName:"tags_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"team_players": { Row: {
"id": string;
"team_id": string;
"player_id": string;
"season_id": string | null;
"shirt_number": number | null;
"starts_on": string | null;
"ends_on": string | null;
"organization_id": string;
"revision": number;
}; Insert: {
"id"?: string;
"team_id": string;
"player_id": string;
"season_id"?: string | null;
"shirt_number"?: number | null;
"starts_on"?: string | null;
"ends_on"?: string | null;
"organization_id": string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["team_players"]["Insert"]>; Relationships: [
{foreignKeyName:"team_players_player_id_fkey";columns:["player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["id"];},
{foreignKeyName:"team_players_player_id_scope_fk";columns:["organization_id","player_id"];isOneToOne:false;referencedRelation:"players";referencedColumns:["organization_id","id"];},
{foreignKeyName:"team_players_season_id_fkey";columns:["season_id"];isOneToOne:false;referencedRelation:"seasons";referencedColumns:["id"];},
{foreignKeyName:"team_players_season_id_scope_fk";columns:["organization_id","season_id"];isOneToOne:false;referencedRelation:"seasons";referencedColumns:["organization_id","id"];},
{foreignKeyName:"team_players_team_id_fkey";columns:["team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["id"];},
{foreignKeyName:"team_players_team_id_scope_fk";columns:["organization_id","team_id"];isOneToOne:false;referencedRelation:"teams";referencedColumns:["organization_id","id"];},
]; };
"teams": { Row: {
"id": string;
"organization_id": string;
"name": string;
"short_name": string | null;
"gender": string | null;
"age_group": string | null;
"country_code": string | null;
"logo_url": string | null;
"is_own_team": boolean;
"created_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"name": string;
"short_name"?: string | null;
"gender"?: string | null;
"age_group"?: string | null;
"country_code"?: string | null;
"logo_url"?: string | null;
"is_own_team"?: boolean;
"created_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>; Relationships: [
{foreignKeyName:"teams_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"video_annotations": { Row: {
"id": string;
"organization_id": string;
"video_id": string;
"analysis_session_id": string;
"start_ms": number;
"end_ms": number;
"pause_on_entry": boolean;
"objects": Json;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"video_id": string;
"analysis_session_id": string;
"start_ms": number;
"end_ms": number;
"pause_on_entry"?: boolean;
"objects"?: Json;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["video_annotations"]["Insert"]>; Relationships: [
{foreignKeyName:"video_annotations_analysis_session_id_fkey";columns:["analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["id"];},
{foreignKeyName:"video_annotations_analysis_session_id_scope_fk";columns:["organization_id","analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["organization_id","id"];},
{foreignKeyName:"video_annotations_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
{foreignKeyName:"video_annotations_video_id_fkey";columns:["video_id"];isOneToOne:false;referencedRelation:"videos";referencedColumns:["id"];},
{foreignKeyName:"video_annotations_video_id_scope_fk";columns:["organization_id","video_id"];isOneToOne:false;referencedRelation:"videos";referencedColumns:["organization_id","id"];},
]; };
"video_clock_segments": { Row: {
"id": string;
"organization_id": string;
"analysis_session_id": string;
"period": number;
"video_start_ms": number;
"video_end_ms": number;
"clock_start_ms": number;
"running": boolean;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"analysis_session_id": string;
"period": number;
"video_start_ms": number;
"video_end_ms": number;
"clock_start_ms": number;
"running"?: boolean;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["video_clock_segments"]["Insert"]>; Relationships: [
{foreignKeyName:"video_clock_segments_analysis_session_id_fkey";columns:["analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["id"];},
{foreignKeyName:"video_clock_segments_analysis_session_id_scope_fk";columns:["organization_id","analysis_session_id"];isOneToOne:false;referencedRelation:"analysis_sessions";referencedColumns:["organization_id","id"];},
{foreignKeyName:"video_clock_segments_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
"videos": { Row: {
"id": string;
"organization_id": string;
"match_id": string | null;
"storage_mode": "local" | "r2";
"status": "pending" | "ready" | "missing_local_file" | "uploading" | "error";
"original_filename": string | null;
"mime_type": string | null;
"file_size_bytes": number | null;
"duration_ms": number | null;
"width": number | null;
"height": number | null;
"fps": number | null;
"local_fingerprint": string | null;
"r2_object_key": string | null;
"created_by": string;
"created_at": string;
"revision": number;
}; Insert: {
"id"?: string;
"organization_id": string;
"match_id"?: string | null;
"storage_mode": "local" | "r2";
"status"?: "pending" | "ready" | "missing_local_file" | "uploading" | "error";
"original_filename"?: string | null;
"mime_type"?: string | null;
"file_size_bytes"?: number | null;
"duration_ms"?: number | null;
"width"?: number | null;
"height"?: number | null;
"fps"?: number | null;
"local_fingerprint"?: string | null;
"r2_object_key"?: string | null;
"created_by": string;
"created_at"?: string;
"revision"?: number;
}; Update: Partial<Database["public"]["Tables"]["videos"]["Insert"]>; Relationships: [
{foreignKeyName:"videos_created_by_fkey";columns:["created_by"];isOneToOne:false;referencedRelation:"users";referencedColumns:["id"];},
{foreignKeyName:"videos_match_id_fkey";columns:["match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["id"];},
{foreignKeyName:"videos_match_id_scope_fk";columns:["organization_id","match_id"];isOneToOne:false;referencedRelation:"matches";referencedColumns:["organization_id","id"];},
{foreignKeyName:"videos_organization_id_fkey";columns:["organization_id"];isOneToOne:false;referencedRelation:"organizations";referencedColumns:["id"];},
]; };
}; Views: {
"v_event_metrics": {Row:{"organization_id":string | null;"match_id":string | null;"team_id":string | null;"actor_player_id":string | null;"period":number | null;"phase":"positional_attack" | "fast_break" | "second_wave" | "transition_defense" | "set_defense" | "seven_vs_six" | "empty_goal" | "power_play" | "short_handed" | "timeout" | "other" | null;"attack_system":"unknown" | "standard_6v6" | "seven_vs_six" | "two_pivots" | "cross" | "double_cross" | "wing_entry" | "pivot_entry" | "backcourt" | "fast_break" | "second_wave" | "custom" | null;"defense_system":"unknown" | "six_zero" | "five_one" | "three_two_one" | "four_two" | "three_three" | "man_to_man" | "mixed" | "custom" | null;"court_zone":"lw" | "left_half" | "center" | "right_half" | "rw" | "pivot_left" | "pivot_center" | "pivot_right" | "seven_meter" | "nine_meter_left" | "nine_meter_center" | "nine_meter_right" | "backcourt_left" | "backcourt_center" | "backcourt_right" | "unknown" | null;"shot_events":number | null;"goals":number | null;"turnovers":number | null;"saves":number | null;};Relationships:[];};
"v_shot_metrics": {Row:{"id":string | null;"organization_id":string | null;"event_id":string | null;"shooter_id":string | null;"goalkeeper_id":string | null;"shooter_position":"GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P" | null;"result":string | null;"empty_goal":boolean | null;"zone":"lw" | "left_half" | "center" | "right_half" | "rw" | "pivot_left" | "pivot_center" | "pivot_right" | "seven_meter" | "nine_meter_left" | "nine_meter_center" | "nine_meter_right" | "backcourt_left" | "backcourt_center" | "backcourt_right" | "unknown" | null;"distance_m":number | null;"shot_type_id":string | null;"court_x":number | null;"court_y":number | null;"goal_x":number | null;"goal_y":number | null;"rebound":string | null;"starts_fast_break":boolean | null;"review_required":boolean | null;"revision":number | null;"match_id":string | null;"analysis_session_id":string | null;"team_id":string | null;"period":number | null;"timestamp_ms":number | null;"match_clock_ms":number | null;"actor_position":"GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P" | null;"is_primary":boolean | null;};Relationships:[];};
"v_tactical_observations": {Row:{"organization_id":string | null;"possession_id":string | null;"match_id":string | null;"analysis_session_id":string | null;"term_id":string | null;"category":string | null;"code":string | null;"label_ar":string | null;"label_en":string | null;"observed_team_id":string | null;};Relationships:[];};
}; Functions: {
"apply_workspace_change":{Args:{"p_table":string;"p_row":Json;"p_expected_revision":number;"p_operation_id":string;"p_delete"?:boolean;};Returns:Json;};
"create_organization":{Args:{"p_name":string;"p_slug":string;"p_country_code"?:string;};Returns:string;};
"get_defense_system_distribution":{Args:{"p_team_id":string;"p_match_ids"?:(string)[];};Returns:{"defense_system":"unknown" | "six_zero" | "five_one" | "three_two_one" | "four_two" | "three_three" | "man_to_man" | "mixed" | "custom";"possessions":number;"share":number;}[];};
"get_tactical_distribution":{Args:{"p_team_id":string;"p_match_ids"?:(string)[];};Returns:{"term_id":string;"category":string;"code":string;"label_ar":string;"label_en":string;"possessions":number;"tagged_possessions":number;"share":number;}[];};
"get_team_attack_summary":{Args:{"p_team_id":string;"p_match_ids"?:(string)[];};Returns:Json;};
"has_org_role":{Args:{"org_id":string;"allowed":("owner" | "technical_director" | "head_coach" | "assistant_coach" | "analyst" | "viewer")[];};Returns:boolean;};
"is_org_member":{Args:{"org_id":string;};Returns:boolean;};
"record_substitution":{Args:{"p_row":Json;};Returns:Json;};
"reorder_items":{Args:{"p_table":string;"p_parent":string;"p_ids":(string)[];};Returns:undefined;};
"reserve_video_upload":{Args:{"p_video":string;"p_limit":number;};Returns:undefined;};
"set_primary_analysis":{Args:{"p_session":string;};Returns:undefined;};
}; Enums: {
"attack_system":"unknown" | "standard_6v6" | "seven_vs_six" | "two_pivots" | "cross" | "double_cross" | "wing_entry" | "pivot_entry" | "backcourt" | "fast_break" | "second_wave" | "custom";
"court_zone":"lw" | "left_half" | "center" | "right_half" | "rw" | "pivot_left" | "pivot_center" | "pivot_right" | "seven_meter" | "nine_meter_left" | "nine_meter_center" | "nine_meter_right" | "backcourt_left" | "backcourt_center" | "backcourt_right" | "unknown";
"defense_system":"unknown" | "six_zero" | "five_one" | "three_two_one" | "four_two" | "three_three" | "man_to_man" | "mixed" | "custom";
"event_outcome":"success" | "failure" | "neutral" | "unknown";
"event_participant_role":"actor" | "assister" | "passer" | "receiver" | "defender" | "goalkeeper" | "victim" | "other";
"event_type":"possession_start" | "possession_end" | "shot" | "goal" | "save" | "miss" | "blocked_shot" | "turnover" | "steal" | "assist" | "technical_error" | "seven_meter_won" | "seven_meter_shot" | "two_minute_penalty" | "yellow_card" | "red_card" | "timeout" | "substitution" | "offensive_foul" | "defensive_foul" | "block" | "duel" | "custom";
"hand_preference":"left" | "right" | "both" | "unknown";
"insight_source":"rule" | "ai" | "manual";
"match_status":"scheduled" | "ready" | "in_analysis" | "analysed" | "archived";
"match_team_side":"home" | "away";
"org_role":"owner" | "technical_director" | "head_coach" | "assistant_coach" | "analyst" | "viewer";
"phase_type":"positional_attack" | "fast_break" | "second_wave" | "transition_defense" | "set_defense" | "seven_vs_six" | "empty_goal" | "power_play" | "short_handed" | "timeout" | "other";
"player_position":"GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "P";
"report_type":"match" | "opponent" | "player" | "team";
"video_status":"pending" | "ready" | "missing_local_file" | "uploading" | "error";
"video_storage_mode":"local" | "r2";
};CompositeTypes:Record<string,never>;};};
