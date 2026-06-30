import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function backup() {
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

  const backupData = {};

  console.log("Starting backup...");
  
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  
  for (const coll of collections) {
    console.log(`Backing up collection: ${coll}`);
    const filename = `backup-${coll}-${timestamp}.json`;
    const writeStream = fs.createWriteStream(filename);
    writeStream.write('[\n');
    
    let isFirst = true;
    let lastDoc = null;
    let hasMore = true;
    
    while (hasMore) {
      let query = db.collection(coll).orderBy('__name__').limit(500);
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      
      const snapshot = await query.get();
      if (snapshot.empty) {
        hasMore = false;
        break;
      }
      
      snapshot.forEach(doc => {
        if (!isFirst) {
          writeStream.write(',\n');
        }
        writeStream.write(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
        isFirst = false;
      });
      
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
    
    writeStream.write('\n]\n');
    writeStream.end();
    console.log(`Finished backing up ${coll} to ${filename}`);
  }

  console.log(`Backup completed successfully.`);
}

backup().catch(console.error);
