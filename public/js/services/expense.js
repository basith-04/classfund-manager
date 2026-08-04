import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

function parseExpenseDate(dateString) {
  const [day, month, year] = dateString.split("/").map(Number)

  if (!day || !month || year === undefined || Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return new Date(0)
  }

  return new Date(2000 + year, month - 1, day)
}


//function returning the total expenses
export async function get_total_expense() {
  const expenseRef = collection(db, 'expenses')
  let totalExpense = 0;
  try {
    const querySnapshot = await getDocs(expenseRef);
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      totalExpense += data.amount
    })

    return totalExpense

  } catch (err) {
    console.error(err)
  }
}

//function for dynamically load the expenses table 
export async function loadExpenses() {
  const expenseRef = collection(db, 'expenses')

  try {
    const querySnapshot = await getDocs(expenseRef);
    const expenses = querySnapshot.docs
      .map((doc) => doc.data())
      .sort((firstExpense, secondExpense) => parseExpenseDate(secondExpense.date) - parseExpenseDate(firstExpense.date))

    const tableBody = document.getElementById("class-fund-table")
    tableBody.textContent = ""
    expenses.forEach((data) => {

      const row = document.createElement("tr")

      const dateCell = document.createElement("td")
      dateCell.textContent = data.date

      const itemCell = document.createElement("td")
      itemCell.textContent = data.item

      const amountCell = document.createElement("td")
      amountCell.textContent = data.amount

      row.append(dateCell, itemCell, amountCell)
      tableBody.appendChild(row)
    })

  } catch (err) {
    console.error(err)
  }

}

