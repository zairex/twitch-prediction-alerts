import { google, sheets_v4 } from "googleapis";
import { getValueAtLookup, PredictionData, PredictionDataLookup } from "../types";
import { Timestamp } from "@google-cloud/firestore";

export interface GoogleSpreadsheetAction {
  readonly kind: "google_spreadsheet";
  readonly id: string;
  readonly range: string;
  readonly time_zone?: string;
  readonly row: readonly PredictionDataLookup[];
}

async function loadSheetsApi(): Promise<sheets_v4.Sheets> {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: "v4", auth: authClient });
}

export async function executeGoogleSpreadsheetActionOnUpdate(action: GoogleSpreadsheetAction, data: PredictionData): Promise<void> {
  const api = await loadSheetsApi();
  const valueStrings = action.row.map((lookup) => {
    const value = getValueAtLookup(data, lookup);
    if (typeof value === "undefined") {
      return "NULL";
    }
    if (value instanceof Timestamp) {
      return value.toDate().toLocaleString("en-US", { timeZone: action.time_zone });
    }
    return String(value);
  });
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

