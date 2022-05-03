import { google, sheets_v4 } from "googleapis";
import { getOutcomeValueAtLookup, getPredictionValueAtLookup, OutcomeData, OutcomeDataLookup, PredictionData, PredictionDataLookup } from "../types";
import { Timestamp } from "@google-cloud/firestore";

type PredictionCellTemplate = PredictionDataLookup | "winning_outcome_index";

export interface GoogleSpreadsheetAction {
  readonly kind: "google_spreadsheet";
  readonly id: string;
  readonly range: string;
  readonly time_zone?: string;
  readonly prediction_cells: readonly PredictionCellTemplate[];
  readonly outcome_cells: readonly OutcomeDataLookup[];
}

async function loadSheetsApi(): Promise<sheets_v4.Sheets> {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: "v4", auth: authClient });
}

function formatValue(value: string | number | Timestamp | undefined, timeZone?: string): string {
  if (typeof value === "undefined") {
    return "NULL";
  }
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString("en-US", { timeZone });
  }
  return String(value);
}

export async function executeGoogleSpreadsheetActionOnUpdate(action: GoogleSpreadsheetAction, prediction: PredictionData, outcomes: readonly OutcomeData[]): Promise<void> {
  const api = await loadSheetsApi();
  const winningOutcome = outcomes.find((outcome) => outcome.id === prediction.winning_outcome_id);
  const valueStrings = [
    ...action.prediction_cells.map((lookup) => {
      if (lookup === "winning_outcome_index") {
        return winningOutcome?.index ?? "NULL";
      }
      const value = getPredictionValueAtLookup(prediction, lookup);
      return formatValue(value, action.time_zone);
    }),
    ...outcomes.map((outcome) => {
      return action.outcome_cells.map((lookup) => {
        const value = getOutcomeValueAtLookup(outcome, lookup);
        return formatValue(value, action.time_zone);
      });
    }).flat(),
  ];
  await api.spreadsheets.values.append({
    spreadsheetId: action.id,
    insertDataOption: "INSERT_ROWS",
    valueInputOption: "USER_ENTERED",
    range: action.range,
    requestBody: {
      values: [valueStrings],
    },
  });
}
