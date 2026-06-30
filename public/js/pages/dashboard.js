import { onAuthStateChanged, signOut, verifyBeforeUpdateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "../services/firebase.js";
import { navigateToClassFund, navigateToMyPayments, navigateToHome, openPayModal, closePayModal } from "../utils/navigations.js"
import { startMusic } from "../utils/startMusic.js"
import { find_balance, getLedger } from "../services/balance.js";
import { loadExpenses } from "../services/expense.js";
import { createPendingDocument, loadPayments } from "../services/payment.js";
import { getStudentData } from "../services/users.js"
import { collection, doc, getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../services/firebase.js";

let username = null
let activeProgramsData = [];
let globalConfigData = { suggestedContribution: 0, minContribution: 0, allowAnyAmount: true };
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (user.uid !== "admin") {
      username = Number(user.uid);
    }

    if (user.uid !== "admin" && user.email && user.email.endsWith('@csed.com')) {
      // First login - force setup
      document.getElementById("setupModalOverlay").classList.add("visible-modal");
    } else {
      start()
    }
  } else {
    window.location.href = "./index.html";
  }
});

async function start() {
  const data = await getStudentData(username);

  // Fetch Global Stats
  const globalLedger = await getLedger("global");
  document.getElementById("total-balance").textContent = "₹" + (globalLedger.balance || 0);
  document.getElementById("user-total").textContent = "₹" + (data.totalPaid || 0);
  document.getElementById("user-name").textContent = data.name;

  // Render Programs Grid
  try {
    const q = query(collection(db, "programs"), where("status", "in", ["Active", "Completed"]));
    const snap = await getDocs(q);
    const programsGrid = document.getElementById("programs-grid");
    programsGrid.innerHTML = "";

    for (const d of snap.docs) {
      const p = { id: d.id, ...d.data() };
      const ledger = await getLedger(`program_${p.id}`);

      const card = document.createElement("div");
      card.className = "card";
      card.style.cursor = "pointer";
      card.innerHTML = `
        <h3 style="margin-bottom: 0.5rem;">${p.name} <span style="font-size: 0.8rem; background: var(--bg); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">${p.status}</span></h3>
        <p style="font-size: 1.1rem; margin-bottom: 0.25rem;">Raised: <span style="font-weight: bold; color: #1b5e20;">₹${ledger.totalContributions || 0}</span></p>
        <p style="font-size: 0.9rem; margin-bottom: 0.25rem; color: #d32f2f;">Expenses: ₹${ledger.totalExpenses || 0}</p>
        <p style="font-size: 0.9rem; margin-bottom: 0.5rem;">Target: ${p.targetAmount ? "₹" + p.targetAmount : "N/A"}</p>
        <small style="color: var(--text-muted);">${p.description || ''}</small>
      `;
      card.addEventListener("click", () => handlePaymentMenuOpen(p.id));
      programsGrid.appendChild(card);
    }

    if (snap.empty) {
      programsGrid.innerHTML = "<p style='color: #fff; text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; padding: 1rem; font-family: \"VT323\", monospace; font-size: 1.5rem; text-align: center; grid-column: 1 / -1;'>No active programs found.</p>";
    }
  } catch (err) {
    console.error("Error rendering programs:", err);
  }
}




//logout function 
document.getElementById("logout-btn").addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "./index.html"
  });
})

// Quit button from Setup Modal
document.getElementById("setup-quit-link").addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "./index.html"
  });
})

// Setup form submission
document.getElementById("setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("setup-email").value.trim();
  const currentPass = document.getElementById("setup-current-pass").value;
  const newPass = document.getElementById("setup-new-pass").value;
  const confirmPass = document.getElementById("setup-confirm-pass").value;
  const saveBtn = document.getElementById("setup-save-btn");

  if (newPass !== confirmPass) {
    alert("New passwords do not match.");
    return;
  }

  saveBtn.textContent = "Saving...";
  saveBtn.disabled = true;

  try {
    const user = auth.currentUser;
    // 1. Re-authenticate
    const credential = EmailAuthProvider.credential(user.email, currentPass);
    await reauthenticateWithCredential(user, credential);

    // 2. Send Verification to New Email
    await verifyBeforeUpdateEmail(user, email);

    // 3. Update Password
    await updatePassword(user, newPass);

    alert("Setup almost complete! We've sent a verification link to your new email.\n\nIMPORTANT: Please check your Spam, Junk, or Promotions folder if you don't see the email in your inbox!\n\nOnce you click the link to verify, log in using your NEW email address.");
    await signOut(auth);
    window.location.href = "./index.html";
  } catch (error) {
    console.error("Setup error:", error);
    alert("Error updating account: " + error.message);
  } finally {
    saveBtn.textContent = "Save & Continue";
    saveBtn.disabled = false;
  }
});

// Settings Modal Logic
document.getElementById("settings-btn").addEventListener("click", () => {
  document.getElementById("settingsModalOverlay").classList.add("visible-modal");
});

document.getElementById("settings-cancel-link").addEventListener("click", () => {
  document.getElementById("settingsModalOverlay").classList.remove("visible-modal");
  document.getElementById("settings-form").reset();
});

document.getElementById("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const currentPass = document.getElementById("settings-current-pass").value;
  const newPass = document.getElementById("settings-new-pass").value;
  const confirmPass = document.getElementById("settings-confirm-pass").value;
  const saveBtn = document.getElementById("settings-save-btn");

  if (newPass !== confirmPass) {
    alert("New passwords do not match.");
    return;
  }

  saveBtn.textContent = "Updating...";
  saveBtn.disabled = true;

  try {
    const user = auth.currentUser;
    // 1. Re-authenticate
    const credential = EmailAuthProvider.credential(user.email, currentPass);
    await reauthenticateWithCredential(user, credential);

    // 2. Update Password
    await updatePassword(user, newPass);

    alert("Password updated successfully!");
    document.getElementById("settingsModalOverlay").classList.remove("visible-modal");
    document.getElementById("settings-form").reset();
  } catch (error) {
    console.error("Update error:", error);
    alert("Error updating password: " + error.message);
  } finally {
    saveBtn.textContent = "Update Password";
    saveBtn.disabled = false;
  }
});

document.getElementById("classFund-card").addEventListener("click", () => {
  if (auth.currentUser && auth.currentUser.email && auth.currentUser.email.endsWith('@csed.com')) {
    alert("Please complete account setup first.");
    return;
  }
  navigateToClassFund()
  loadExpenses()

})

document.getElementById("myPayments-card").addEventListener("click", () => {
  if (auth.currentUser && auth.currentUser.email && auth.currentUser.email.endsWith('@csed.com')) {
    alert("Please complete account setup first.");
    return;
  }
  navigateToMyPayments()
  loadPayments(username)
})

document.getElementById("back-btn").addEventListener("click", navigateToHome)
document.getElementById("my-payments-back-btn").addEventListener("click", navigateToHome)

async function handlePaymentMenuOpen(preSelectedProgramId = null) {
  if (auth.currentUser && auth.currentUser.email && auth.currentUser.email.endsWith('@csed.com')) {
    alert("Please complete account setup first.");
    return;
  }

  // Fetch Global Config
  try {
    const configSnap = await getDoc(doc(db, "settings", "fundingConfig"));
    if (configSnap.exists()) {
      globalConfigData = configSnap.data();
    }
  } catch (err) {
    console.error("Error fetching config:", err);
  }

  // Fetch Active Programs
  try {
    const q = query(collection(db, "programs"), where("status", "==", "Active"));
    const snap = await getDocs(q);
    activeProgramsData = [];
    snap.forEach(doc => {
      activeProgramsData.push({ id: doc.id, ...doc.data() });
    });
  } catch (err) {
    console.error("Error fetching programs:", err);
  }

  // Populate Select
  const select = document.getElementById("program-select");
  select.innerHTML = '';
  
  const isGlobalEnabled = globalConfigData.contributionsEnabled !== false && String(globalConfigData.contributionsEnabled) !== "false";

  if (isGlobalEnabled) {
    select.innerHTML += '<option value="global">Global Class Fund</option>';
  }

  activeProgramsData.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });

  if (select.options.length === 0) {
    alert("Contributions are currently disabled and there are no active programs.");
    return;
  }

  if (preSelectedProgramId) {
    let exists = Array.from(select.options).some(opt => opt.value === preSelectedProgramId);
    if (exists) {
      select.value = preSelectedProgramId;
    } else {
      alert("This program is currently not accepting new contributions.");
      return;
    }
  }

  // Reset Amount
  updateAmountInput();

  openPayModal();
}

document.getElementById("pay-btn").addEventListener("click", () => handlePaymentMenuOpen());

document.getElementById("program-select").addEventListener("change", updateAmountInput);

function updateAmountInput() {
  const select = document.getElementById("program-select");
  const amountInput = document.getElementById("payment-amount");
  const hint = document.getElementById("amount-hint");
  const fixedDisplay = document.getElementById("fixed-amount-display");
  const fixedValue = document.getElementById("fixed-amount-value");

  const val = select.value;
  let targetConfig = null;

  if (val === "global") {
    targetConfig = globalConfigData;
  } else {
    targetConfig = activeProgramsData.find(p => p.id === val);
  }

  // Helper to apply fixed display
  const setFixedDisplay = (amount) => {
    amountInput.value = amount;
    amountInput.type = "hidden";
    amountInput.style.display = "none";
    fixedValue.textContent = amount;
    fixedDisplay.style.display = "block";
    hint.textContent = "Amount is fixed for this program.";
  };

  // Helper to apply input display
  const setInputDisplay = (val, min) => {
    amountInput.value = val;
    amountInput.type = "number";
    amountInput.style.display = "block";
    amountInput.min = min;
    fixedDisplay.style.display = "none";
    hint.textContent = `Minimum: ₹${min}`;
  };

  if (targetConfig) {
    if (val !== "global" && targetConfig.allowAnyAmount === false) {
      if (targetConfig.targetType === 'per_student' && targetConfig.targetAmount) {
         setFixedDisplay(targetConfig.targetAmount);
      } else if (targetConfig.targetAmount) {
         hint.textContent = "Calculating fixed amount...";
         fixedDisplay.style.display = "none";
         amountInput.type = "hidden";
         
         getDocs(collection(db, "users")).then(snap => {
            const exempted = targetConfig.exemptedStudents || [];
            let count = 0;
            snap.forEach(d => {
               if (!exempted.includes(d.id) && d.id !== 'admin') count++;
            });
            const amt = count > 0 ? Math.ceil(targetConfig.targetAmount / count) : targetConfig.targetAmount;
            setFixedDisplay(amt);
            hint.textContent = "Amount is fixed for this program (split evenly).";
         }).catch(err => {
            console.error(err);
            setFixedDisplay(targetConfig.targetAmount);
         });
      } else {
         setFixedDisplay(targetConfig.suggestedContribution || targetConfig.minContribution || "");
      }
    } else {
      // Allow Any Amount is true OR it's the global fund
      const min = targetConfig.minContribution || 1;
      const suggested = targetConfig.suggestedContribution || min || "";
      setInputDisplay(suggested, min);
    }
  }
}

document.getElementById("cancel-link").addEventListener("click", closePayModal)

// IMPORTANT: Listen to 'submit' on the form, not 'click' on the button, since we changed it to a form
document.getElementById("payment-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (auth.currentUser && auth.currentUser.email && auth.currentUser.email.endsWith('@csed.com')) {
    alert("Please complete account setup first.");
    return;
  }

  const programId = document.getElementById("program-select").value;
  const amount = Number(document.getElementById("payment-amount").value);

  if (!amount || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  const proceedBtn = document.getElementById("proceedBtn");
  proceedBtn.disabled = true;
  proceedBtn.textContent = "Processing...";

  const user = auth.currentUser;
  const idToken = await user.getIdToken()
  try {

    // Step A: Request our backend to create an order
    const BACKEND_URL = "https://classfund-test1.onrender.com"; // User should update this after deployment
    const response = await fetch(BACKEND_URL + '/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ rollNo: username, programId, amount })
    });

    const orderData = await response.json();

    if (!response.ok) {
      throw new Error(orderData.error || "Server error: " + response.status);
    }
    // Step B: Set up the payment window options
    const options = {
      "key": orderData.key,
      "amount": orderData.amount,
      "currency": "INR",
      "name": "Class Fund Manager",
      "order_id": orderData.orderId,
      "handler": function (response) {
        alert("Payment received. Verifying payment...");
        const BACKEND_URL = "https://classfund-test1.onrender.com"; // User should update this after deployment
        const verifyResponse = fetch(BACKEND_URL + '/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response)
        }).then(res => res.json())
          .then(data => {
            if (data.status === 'success') {
              alert("Payment verified successfully!");
              window.location.reload(); // Reload to fetch new balances
            } else {
              alert("Payment verification failed.");
            }
          });
      },
      "modal": {
        "ondismiss": function () {
          alert("Payment cancelled by user.");
          proceedBtn.disabled = false;
          proceedBtn.textContent = "Proceed";
        }
      }
    };
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
      alert("Payment Failed. Reason: " + response.error.description);
      proceedBtn.disabled = false;
      proceedBtn.textContent = "Proceed";
    });
    rzp.open();

  } catch (error) {
    console.error("Payment error:", error);
    alert("Error: " + error.message);
    proceedBtn.disabled = false;
    proceedBtn.textContent = "Proceed";
  }
})

startMusic('./bg.mp3');
