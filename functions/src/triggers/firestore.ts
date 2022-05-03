import * as functions from "firebase-functions";
import { loadDatabase } from "../database";
import type { AlertAction, AlertData, OutcomeData, PredictionData } from "../types";

export type DatastoreReference<T> = readonly [id: string, value: T];

export type PredictionEventHandler<A extends AlertAction> = (
  db: FirebaseFirestore.Firestore,
  action: DatastoreReference<A>,
  prediction: DatastoreReference<PredictionData>,
  outcomes: readonly OutcomeData[],
) => Promise<void>;

export type ActionHandlers = {
  readonly [K in AlertAction["kind"]]?: PredictionEventHandler<AlertAction & { readonly kind: K }>;
};

type QueryDocumentSnapshots = FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[];

async function processAllActionsInQuery(
  docs: QueryDocumentSnapshots,
  handlers: ActionHandlers,
  db: FirebaseFirestore.Firestore,
  dataId: string,
  prediction: PredictionData,
  eventType: "create" | "update"
) {
  const outcomesCollection = db.collection(`prediction/${dataId}/outcomes`);
  const outcomesSnapshot = await outcomesCollection.get();
  const outcomes = outcomesSnapshot.docs.map((doc) => {
    return {
      ...doc.data(),
      id: doc.id,
    } as OutcomeData;
  }).sort((a, b) => a.index - b.index);

  const results = await Promise.allSettled(docs.map((doc) => {
    const alert = doc.data() as AlertData<AlertAction>;
    const handler = handlers[alert.action.kind] as PredictionEventHandler<AlertAction> | undefined;
    if (!handler) {
      throw new Error(`Unable to handle prediction ${eventType} event for ${alert.action.kind} action (id=${doc.id})`);
    }
    return handler(db, [doc.id, alert.action], [dataId, prediction], outcomes);
  }));

  for (let i = 0; i < results.length; ++i) {
    const result = results[i];
    if (result.status === "rejected") {
      console.error(docs[i].id, result.reason);
    }
  }
}

export function processActionsOnPredictionCreate(handlers: ActionHandlers) {
  const kinds = Object.keys(handlers) as readonly AlertAction["kind"][];
  return functions.firestore.document("predictions/{prediction_id}").onCreate(async (snapshot) => {
    const prediction = snapshot.data() as PredictionData;

    const db = loadDatabase();
    const alertsRef = db.collection("alerts");
    const querySnapshot = await alertsRef
      .where("channel_id", "==", prediction.channel_id)
      .where("on_create", "==", true)
      .where("action.kind", "in", kinds)
      .get();

    if (querySnapshot.empty) {
      return;
    }

    await processAllActionsInQuery(querySnapshot.docs, handlers, db, snapshot.id, prediction, "create");
  });
}

export function processActionsOnPredictionUpdate(handlers: ActionHandlers) {
  const kinds = Object.keys(handlers) as readonly AlertAction["kind"][];
  return functions.firestore.document("predictions/{prediction_id}").onUpdate(async (change) => {
    const predictionBefore = change.before.data() as PredictionData;
    const predictionAfter = change.after.data() as PredictionData;
    if (predictionBefore.status === predictionAfter.status) {
      return;
    }

    const db = loadDatabase();
    const alertsRef = db.collection("alerts");
    const querySnapshot = await alertsRef
      .where("channel_id", "==", predictionAfter.channel_id)
      .where("on_update", "array-contains", predictionAfter.status)
      .where("action.kind", "in", kinds)
      .get();

    if (querySnapshot.empty) {
      return;
    }

    await processAllActionsInQuery(querySnapshot.docs, handlers, db, change.after.id, predictionAfter, "update");
  });
}

