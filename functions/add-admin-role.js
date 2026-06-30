/**
 * One-time migration: Add role field to admin user document.
 * 
 * Run this ONCE before deploying the new admin endpoints:
 *   node add-admin-role.js
 * 
 * This creates/updates the users/admin document with role: "admin".
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  const SERVICE_ACCOUNT_PATH = "./service-account.json";
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`Error: Service account not provided via FIREBASE_SERVICE_ACCOUNT or ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
  }
  serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function addAdminRole() {
  const adminRef = db.collection("users").doc("admin");
  const snap = await adminRef.get();

  if (snap.exists) {
    // Update existing document
    await adminRef.update({ role: "admin" });
    console.log("Updated existing admin document with role: admin");
  } else {
    // Create new document
    await adminRef.set({
      uid: "admin",
      name: "Class Representative",
      role: "admin",
      totalPaid: 0
    });
    console.log("Created admin document with role: admin");
  }

  console.log("Done! The admin user now has role-based authorization.");
}

addAdminRole().catch(console.error);
