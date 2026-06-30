import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const SERVICE_ACCOUNT_PATH = "./service-account.json";

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`Error: Service account file not found at ${SERVICE_ACCOUNT_PATH}`);
  console.error("Please download it from Firebase Console and place it in the 'functions' directory.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));

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

  const batchSize = snapshot.size;
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

async function resetUsersTotalPaid() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.update(doc.ref, { totalPaid: 0 });
  });

  await batch.commit();
}

async function clearData() {
  const collectionsToDelete = ['contributions', 'expenses', 'programs', 'ledgers', 'auditLogs'];
  
  for (const collectionName of collectionsToDelete) {
    console.log(`Deleting collection: ${collectionName}...`);
    await deleteCollection(collectionName, 500);
    console.log(`Finished deleting collection: ${collectionName}`);
  }
  
  console.log('Resetting user totalPaid to 0...');
  await resetUsersTotalPaid();
  console.log('Finished resetting user totalPaid');
  
  console.log('All non-user data cleared successfully!');
}

clearData().catch(console.error);
