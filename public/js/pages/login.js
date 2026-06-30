import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {startMusic} from "../utils/startMusic.js"
import { auth } from "../services/firebase.js";

const loginBtn = document.getElementById("login-btn");
const userEl = document.getElementById("user");
const passEl = document.getElementById("pass");
loginBtn.addEventListener("click", () => {
  const user = userEl.value.trim();
  const pass = passEl.value.trim();

  if (!user || !pass) {
    alert("Enter roll no/email and password");
    return;
  }

  let email = user;
  if (!user.includes('@')) {
    email = `${user}@example.com`;
  }

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => {
      if(user==="admin"){
        setTimeout(()=>{ window.location.href='./admin/adminDashboard.html'})
      }else{

                setTimeout(() => { window.location.href = "./dashboard.html"; }, 1000);

      }
    })
    .catch((err) => {
      alert("Login failed! Double-check your roll no/email and password.\n\nIf you haven't completed setup: Use your roll number and default password.\nIf you have: Use your real email and new password.");
      console.error(err.code, err.message);
    });
});

const forgotPasswordBtn = document.getElementById("forgot-password");
if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener("click", () => {
    const resetEmail = prompt("Enter your registered email address:");
    if (resetEmail && resetEmail.trim() !== "") {
      sendPasswordResetEmail(auth, resetEmail.trim())
        .then(() => {
          alert("If this email is registered, a password reset link has been sent to your inbox. Please check your Spam or Junk folder if you don't see it.\n\nNote: If you have never logged in before, you must log in with your Roll Number to set up your account first. You cannot reset a password for an account that hasn't been set up yet!");
        })
        .catch((error) => {
          console.error("Error sending reset email:", error);
          alert("Failed to send reset email. Ensure you have completed account setup with a real email.");
        });
    }
  });
}

startMusic("./assets/audio/bg.mp3");

