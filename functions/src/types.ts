import type { Timestamp } from "@google-cloud/firestore";
import type { DiscordWebhookAction } from "./actions/discord";
import { GoogleSpreadsheetAction } from "./actions/gsheets";

export interface TwitchUser {
  readonly id: string;
  readonly display_name: string;
}

export interface GameData {
  readonly id: number;
  readonly name: string;
}

export type OutcomeColor = "BLUE" | "PINK";

export type OutcomeID = string & { readonly __OutcomeID: unique symbol };

export interface OutcomeData {
  readonly id: OutcomeID;
  readonly title: string;
  readonly total_points: number;
  readonly total_users: number;
  readonly index: number;
}

export interface PredictionData {
  readonly channel_id: string;
  readonly created_at: Timestamp;
  readonly created_by: TwitchUser;
  readonly locked_at?: Timestamp;
  readonly ended_at?: Timestamp;
  readonly ended_by?: TwitchUser;
  readonly game: GameData;
  readonly status: "ACTIVE" | "LOCKED" | "RESOLVE_PENDING" | "RESOLVED" | "CANCELED";
  readonly title: string;
  readonly winning_outcome_id?: OutcomeID;
  readonly prediction_window_seconds: number;
}

export type PredictionDataLookup =
  | Exclude<keyof PredictionData, "created_by" | "ended_by" | "game" | "outcomes">
  | `created_by.${keyof TwitchUser}`
  | `ended_by.${keyof TwitchUser}`
  | `game.${keyof GameData}`
  | `outcomes.${OutcomeColor}.${keyof OutcomeData}`;

export function getValueAtLookup(data: PredictionData, lookup: PredictionDataLookup): string | Timestamp | number | undefined {
  switch (lookup) {
    case "channel_id": return data.channel_id;
    case "created_at": return data.created_at;
    case "locked_at": return data.locked_at;
    case "ended_at": return data.ended_at;
    case "status": return data.status;
    case "title": return data.title;
    // case "winning_outcome": return data.winning_outcome;
    case "prediction_window_seconds": return data.prediction_window_seconds;
    case "created_by.id": return data.created_by.id;
    case "created_by.display_name": return data.created_by.display_name;
    case "ended_by.id": return data.ended_by?.id;
    case "ended_by.display_name": return data.ended_by?.display_name;
    case "game.id": return data.game.id;
    case "game.name": return data.game.name;
    // case "outcomes.BLUE.title": return data.outcomes.BLUE.title;
    // case "outcomes.BLUE.total_points": return data.outcomes.BLUE.total_points;
    // case "outcomes.BLUE.total_users": return data.outcomes.BLUE.total_users;
    // case "outcomes.PINK.title": return data.outcomes.PINK.title;
    // case "outcomes.PINK.total_points": return data.outcomes.PINK.total_points;
    // case "outcomes.PINK.total_users": return data.outcomes.PINK.total_users;
  }
  return;
}

export type AlertAction =
  | DiscordWebhookAction
  | GoogleSpreadsheetAction;

export interface AlertData<A extends AlertAction = AlertAction> {
  readonly action: A;
  readonly channel_id: string;
  readonly on_create: boolean;
  readonly on_update: boolean;
  readonly owner: string;
}
