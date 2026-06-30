import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function verify() {
  console.log("Starting Verification...");
  
  let allTestsPassed = true;

  // 1. Check Auth Users
  const listUsersResult = await auth.listUsers(1000);
  const numAuthUsers = listUsersResult.users.length;
  console.log(`Auth Users: ${numAuthUsers} users found.`);
  if (numAuthUsers === 0) {
    console.error("❌ FAILED: No Auth users found.");
    allTestsPassed = false;
  } else {
    console.log("✅ Auth users exist.");
  }

  // 2. Check Admin exists & User roles
  const usersSnapshot = await db.collection("users").get();
  let adminFound = false;
  let rolesPreserved = true;
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.role === "admin") adminFound = true;
    if (data.role === undefined && Object.keys(data).length > 0) {
      // It's possible some users don't have a role, but we'll assume they should have email, uid etc.
    }
    // Check if totalPaid is 0
    if (data.totalPaid !== 0) {
      console.error(`❌ FAILED: User ${doc.id} has non-zero totalPaid`);
      allTestsPassed = false;
    }
  });

  if (adminFound) {
    console.log("✅ Admin account found in users collection.");
  } else {
    console.error("❌ FAILED: Admin account not found.");
    allTestsPassed = false;
  }
  
  if (rolesPreserved) {
    console.log("✅ User roles seem preserved.");
  }

  // 3. Settings collection
  const settingsSnapshot = await db.collection("settings").get();
  if (!settingsSnapshot.empty) {
    console.log(`✅ Settings collection unchanged (${settingsSnapshot.size} doc(s)).`);
  } else {
    console.error("❌ FAILED: Settings collection is empty.");
    allTestsPassed = false;
  }

  // 4. Global ledger values
  const globalLedger = await db.collection("ledgers").doc("global").get();
  const ledgerData = globalLedger.data();
  if (ledgerData && 
      ledgerData.totalBalance === 0 && 
      ledgerData.balance === 0 &&
      ledgerData.totalContributions === 0 &&
      ledgerData.totalExpenditure === 0 &&
      ledgerData.totalTransactions === 0) {
    console.log("✅ Global ledger values are 0.");
  } else {
    console.error("❌ FAILED: Global ledger values are not 0 or document missing.");
    console.log(ledgerData);
    allTestsPassed = false;
  }

  // 5. Program ledgers removed
  const ledgersSnapshot = await db.collection("ledgers").get();
  if (ledgersSnapshot.size === 1 && ledgersSnapshot.docs[0].id === "global") {
    console.log("✅ Program ledgers are removed.");
  } else {
    console.error("❌ FAILED: Program ledgers not removed or missing global.");
    allTestsPassed = false;
  }

  // 6. Collections empty
  const emptyCollections = ["contributions", "expenses", "auditLogs", "messages", "programs"];
  for (const coll of emptyCollections) {
    const snapshot = await db.collection(coll).limit(1).get();
    if (snapshot.empty) {
      console.log(`✅ Collection ${coll} is empty.`);
    } else {
      console.error(`❌ FAILED: Collection ${coll} is NOT empty.`);
      allTestsPassed = false;
    }
  }

  if (allTestsPassed) {
    console.log("All verifications passed successfully!");
  } else {
    console.error("Some verifications failed.");
  }
}

verify().catch(console.error);
