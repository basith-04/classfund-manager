import {
  collection,
  addDoc,
  serverTimestamp,
  query, 
  where, 
  getDocs, 
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

export async function createPendingDocument(username) {
  try {
    const colRef = collection(db, "contributions");

    const docRef = await addDoc(colRef, {
      rollNo: username,
      status: "pending",
      createdAt: serverTimestamp()
    });

    console.info("Document written with ID:", docRef.id);
  } catch (error) {
    console.error("Error adding document: ", error);
  }
};


export async function loadPayments(username) {
  try {
    const colRef = collection(db, "contributions");
    
    // Both online and manual payments store rollNo, so a single query is sufficient.
    const q1 = query(colRef, where("rollNo", "==", username)); 
    
    const snap1 = await getDocs(q1);
    
    const tableBody = document.getElementById("my-payments-table");
    tableBody.textContent = "";

    // Sort manually by date if orderBy causes indexing issues without a composite index
    const contributions = snap1.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    contributions.sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });

    contributions.forEach((data) => {
      const row = document.createElement("tr");

      const dateCell = document.createElement("td");
      if (data.createdAt) {
        const d = data.createdAt.toDate();
        dateCell.textContent = d.toLocaleDateString();
      } else {
        dateCell.textContent = "N/A";
      }

      const idCell = document.createElement("td");
      idCell.textContent = data.orderId || data.id || "N/A";

      const programCell = document.createElement("td");
      // Could fetch program name here, but for now just show ID or Global
      programCell.textContent = data.programId === "global" ? "Global" : (data.programId || "Global");

      const amountCell = document.createElement("td");
      amountCell.textContent = "₹" + (data.amount || "0");

      const statusCell = document.createElement("td");
      const statusText = data.status || "completed";
      statusCell.textContent = statusText.charAt(0).toUpperCase() + statusText.slice(1);

      row.append(dateCell, idCell, programCell, amountCell, statusCell);
      tableBody.appendChild(row);
    });

  } catch (error) {
    console.error("Error loading payments: ", error);
  }
}