import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function deleteCollection(collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.docs.length;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function reset() {
  console.log("Starting reset process...");

  // 1. Delete program ledgers first
  console.log("Deleting program ledgers...");
  const ledgersSnapshot = await db.collection("ledgers").get();
  const ledgersBatch = db.batch();
  ledgersSnapshot.docs.forEach(doc => {
    if (doc.id !== "global") {
      ledgersBatch.delete(doc.ref);
    }
  });
  await ledgersBatch.commit();
  console.log("Program ledgers deleted.");

  // 2. Reset global ledger
  console.log("Resetting global ledger...");
  await db.collection("ledgers").doc("global").set({
    totalBalance: 0,
    balance: 0,
    totalContributions: 0,
    totalExpenditure: 0,
    totalStudentsContributed: 0,
    totalTransactions: 0
  }, { merge: true });
  console.log("Global ledger reset.");

  // 3. Reset users
  console.log("Resetting users financial fields...");
  const usersSnapshot = await db.collection("users").get();
  const usersBatch = db.batch();
  usersSnapshot.docs.forEach(doc => {
    usersBatch.update(doc.ref, {
      totalPaid: 0,
      contributionCount: 0,
      programContributionCount: 0,
      programContributions: {},
      lastContributionDate: FieldValue.delete()
    });
  });
  await usersBatch.commit();
  console.log("Users reset.");

  // 4. Delete collections completely
  const collectionsToDelete = ["contributions", "auditLogs", "expenses", "programs", "messages"];
  for (const coll of collectionsToDelete) {
    console.log(`Deleting collection: ${coll}`);
    await deleteCollection(coll, 100);
    console.log(`Collection ${coll} deleted.`);
  }

  console.log("Reset process completed successfully.");
}

reset().catch(console.error);
