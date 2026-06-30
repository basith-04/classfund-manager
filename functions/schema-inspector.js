import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectSchema() {
  const collections = [
    "users",
    "contributions",
    "programs",
    "expenses",
    "ledgers",
    "settings"
  ];

  console.log("Database Schema Report (Sample of 1 document)");
  console.log("-----------------------------------------------");

  for (const coll of collections) {
    const snapshot = await db.collection(coll).limit(1).get();
    if (snapshot.empty) {
        console.log(`${coll}: No documents found`);
    } else {
        const doc = snapshot.docs[0];
        const data = doc.data();
        const keys = Object.keys(data);
        console.log(`${coll} (Doc ID: ${doc.id}):`);
        console.log(`  Fields: ${keys.join(", ")}`);
        if (coll === "users") {
            console.log(`  Data sample:`, JSON.stringify(data, null, 2));
        } else if (coll === "ledgers") {
            console.log(`  Data sample:`, JSON.stringify(data, null, 2));
        }
    }
  }
}

inspectSchema().catch(console.error);
