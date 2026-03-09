import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | undefined;
let _db: Firestore | undefined;

function getApp(): App {
  if (!_app) {
    if (getApps().length === 0) {
      _app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    } else {
      _app = getApps()[0];
    }
  }
  return _app;
}

export function getAdminDb(): Firestore {
  if (!_db) {
    getApp();
    _db = getFirestore();
  }
  return _db;
}
