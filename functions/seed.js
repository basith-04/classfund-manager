import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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

const auth = getAuth();
const db = getFirestore();

const students = [
  { rollNo: 1, name: "Student One" },
  { rollNo: 2, name: "Student Two" },
  { rollNo: 3, name: "Student Three" },
  { rollNo: 4, name: "Student Four" },
  { rollNo: 5, name: "Student Five" }
];

async function clearExistingData() {
  console.log("Removing all current users from Auth...");
  let pageToken;
  do {
    const listUsersResult = await auth.listUsers(1000, pageToken);
    const uids = listUsersResult.users.map(u => u.uid);
    if (uids.length > 0) {
      await auth.deleteUsers(uids);
      console.log(`Deleted ${uids.length} users from Auth.`);
    }
    pageToken = listUsersResult.pageToken;
  } while (pageToken);

  console.log("Removing all current documents from 'users' collection in Firestore...");
  const usersSnapshot = await db.collection("users").get();
  const batch = db.batch();
  usersSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`Deleted ${usersSnapshot.size} documents from Firestore 'users' collection.`);
}

async function seed() {
  await clearExistingData();

  console.log(`\nStarting to seed ${students.length} students...`);
  
  for (const student of students) {
    const email = `${student.rollNo}@example.com`;
    const password = `password${student.rollNo}`; // Default password, e.g., password1, password2
    
    try {
      // 1. Create User in Firebase Auth
      await auth.createUser({
        uid: student.rollNo.toString(),
        email: email,
        password: password,
        displayName: student.name
      });
      console.log(`Created Auth account: ${email}`);

      // 2. Create User document in Firestore
      const userRef = db.collection("users").doc(student.rollNo.toString());
      await userRef.set({
        uid: student.rollNo.toString(),
        rollNo: student.rollNo,
        name: student.name,
        totalPaid: 0
      });
      console.log(`Created Firestore doc for roll number: ${student.rollNo}`);
    } catch (error) {
      console.error(`Error seeding roll number ${student.rollNo}:`, error.message);
    }
  }

  // Create Admin Account
  try {
    await auth.createUser({
      uid: "admin",
      email: "admin@example.com",
      password: "REDACTED_PASSWORD", 
      displayName: "Class Representative"
    });
    console.log("\nCreated admin auth account: admin@example.com (password: REDACTED_PASSWORD)");

    // Create admin Firestore document with role
    const adminRef = db.collection("users").doc("admin");
    await adminRef.set({
      uid: "admin",
      name: "Class Representative",
      role: "admin",
      totalPaid: 0
    });
    console.log("Created admin Firestore document with role: admin");
  } catch (error) {
    console.error("Error creating admin account:", error.message);
  }

  console.log("\nSeeding process completed!");
}

seed().catch(console.error);
