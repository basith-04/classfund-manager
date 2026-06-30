import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

//function returning the total expenses from ledger
export async function get_total_expense(ledgerId = "global") {
  try {
    const docRef = doc(db, 'ledgers', ledgerId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data().totalExpenditure || 0;
    }
    return 0;
  } catch (err) {
    console.error("Error fetching total expenses from ledger:", err);
    return 0;
  }
}


//function for dynamically load the expenses table 
export async function loadExpenses() {
  const expenseRef = collection(db, 'expenses')

  try {
    const querySnapshot = await getDocs(expenseRef);
    const tableBody = document.getElementById("class-fund-table")
    tableBody.textContent = ""
    querySnapshot.forEach((doc) => {
      const data = doc.data()

      const row = document.createElement("tr")

      const dateCell = document.createElement("td")
      let dateString = data.date;
      if (data.date && typeof data.date.toDate === 'function') {
        dateString = data.date.toDate().toLocaleDateString();
      } else if (data.date && data.date.seconds) {
        dateString = new Date(data.date.seconds * 1000).toLocaleDateString();
      } else {
        dateString = new Date(data.date).toLocaleDateString();
      }
      dateCell.textContent = dateString;

      const itemCell = document.createElement("td")
      itemCell.textContent = data.title || data.description || "N/A"

      const amountCell = document.createElement("td")
      amountCell.textContent = "₹" + (data.amount || 0)

      row.append(dateCell, itemCell, amountCell)
      tableBody.appendChild(row)
    })

  } catch (err) {
    console.error(err)
  }

}

