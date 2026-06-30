import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

const SERVICE_ACCOUNT_PATH = "./service-account.json";

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`Error: Service account file not found at ${SERVICE_ACCOUNT_PATH}`);
  console.error("Please place your Firebase service-account.json in the functions/ directory.");
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
initializeApp({ credential: cert(sa) });

async function setAdminClaim() {
  const adminUid = "admin"; // The UID of your admin user in Firebase Authentication
  
  console.log(`Setting admin custom claim on user UID: "${adminUid}"...`);
  
  await getAuth().setCustomUserClaims(adminUid, { admin: true });
  
  console.log("Admin custom claims set successfully.");
  console.log("Note: The user will need to log out and log back in (or force-refresh their token) for the claim to take effect.");
}

setAdminClaim().catch((error) => {
  console.error("Failed to set admin claim:", error);
  process.exit(1);
});
