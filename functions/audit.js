import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function audit() {
  const collections = [
    "users",
    "contributions",
    "programs",
    "expenses",
    "ledgers",
    "auditLogs",
    "messages",
    "settings"
  ];

  console.log("Database Audit Report");
  console.log("-----------------------");

  for (const coll of collections) {
    const snapshot = await db.collection(coll).count().get();
    const count = snapshot.data().count;
    let impact = "Low";
    if (["contributions", "expenses", "auditLogs"].includes(coll)) {
        impact = "High (Deletion)";
    } else if (coll === "users") {
        impact = "High (Reset specific fields only)";
    } else if (coll === "programs") {
        impact = "High (Deletion)";
    } else if (coll === "ledgers") {
        impact = "High (Reset specific docs, delete program ledgers)";
    } else if (coll === "messages") {
        impact = "Medium (Deletion)";
    } else if (coll === "settings") {
        impact = "Low (Keep as is / ignore)";
    }
    
    console.log(`${coll} - ${count} documents - Estimated Impact: ${impact}`);
  }
}

audit().catch(console.error);
