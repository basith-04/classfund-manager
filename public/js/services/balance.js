import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

// Fetches a specific ledger (e.g. "global", or "program_XYZ")
export async function getLedger(ledgerId = "global") {
  try {
    const docRef = doc(db, 'ledgers', ledgerId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Return zeroes if the ledger doesn't exist yet
      return { totalContributions: 0, totalExpenditure: 0, balance: 0 };
    }
  } catch (err) {
    console.error("Error fetching ledger: ", err);
    return { totalContributions: 0, totalExpenditure: 0, balance: 0 };
  }
}

export async function find_balance(ledgerId = "global") {
  const ledger = await getLedger(ledgerId);
  return ledger.balance || 0;
}
