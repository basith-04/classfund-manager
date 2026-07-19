import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "../services/firebase.js";
import { navigateToClassFund, navigateToHome, openPayModal, closePayModal } from "../utils/navigations.js"
import { startMusic } from "../utils/startMusic.js"
import { find_balance } from "../services/balance.js";
import { loadExpenses } from "../services/expense.js";
import { getStudentData } from "../services/users.js"

let username = null
onAuthStateChanged(auth, (user) => {
  if (user) {
    username = Number(user.email.split('@')[0]);

    start()


  } else {

    window.location.href = "./index.html";
  }


});

async function start() {
  const data = await getStudentData(username);

  document.getElementById("total-balance").textContent = await find_balance()
  document.getElementById("user-total").textContent = data.totalPaid
  document.getElementById("user-name").textContent = data.name
}




//logout function 
document.getElementById("logout-btn").addEventListener("click", () => {
  window.location.href = "./index.html"
})


document.getElementById("classFund-card").addEventListener("click", () => {
  navigateToClassFund()
  loadExpenses()

})

document.getElementById("back-btn").addEventListener("click", navigateToHome)

document.getElementById("pay-btn").addEventListener("click", openPayModal)

document.getElementById("cancel-link").addEventListener("click",()=>{
  closePayModal()
  start()
})

startMusic('./bg.mp3');
