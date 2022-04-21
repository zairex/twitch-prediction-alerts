import { executeDiscordWebhookActionOnCreate, executeDiscordWebhookActionOnUpdate } from "./actions/discord";
import { executeGoogleSpreadsheetActionOnUpdate } from "./actions/gsheets";
import { processActionsOnPredictionCreate, processActionsOnPredictionUpdate } from "./triggers/firestore";

export const onPredictionCreate = processActionsOnPredictionCreate({
  discord_webhook: async (db, actionRef, dataRef) => {
    const messageId = await executeDiscordWebhookActionOnCreate(actionRef[1], dataRef[1]);
    if (messageId) {
      await db.collection(`alerts/${actionRef[0]}/data`).doc(dataRef[0]).set({
        message_id: messageId,
      });
    }
  },
});

export const onPredictionUpdate = processActionsOnPredictionUpdate({
  discord_webhook: async (db, actionRef, dataRef) => {
    const ref = await db.collection(`alerts/${actionRef[0]}/data`).doc(dataRef[0]).get();
    const alertData = ref.data();
    if (alertData?.message_id) {
      await executeDiscordWebhookActionOnUpdate(actionRef[1], dataRef[1], alertData?.message_id);
    } else {
      console.error(`Unable to find message_id for ${actionRef[0]} + ${dataRef[0]}`);
    }
  },
  google_spreadsheet: async (db, actionRef, dataRef) => {
    await executeGoogleSpreadsheetActionOnUpdate(actionRef[1], dataRef[1]);
  },
});
