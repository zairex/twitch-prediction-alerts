import * as admin from "firebase-admin";

let app: admin.app.App | undefined;

export function loadDatabase(): FirebaseFirestore.Firestore {
  if (!app) {
    app = admin.initializeApp();
  }
  return admin.firestore(app);
}
