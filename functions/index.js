import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import { verifyToken, verifyAdmin } from "./middleware/auth.js";
import { recordContribution, recordExpense } from "./services/accounting.js";
dotenv.config(); // Load environment variables from .env file

const app = express();
app.use(cors());
app.use(express.json());

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  initializeApp();
}
const db = getFirestore()

const razorpay = new Razorpay({
  // If process.env is missing during deployment, use a placeholder string so it doesn't crash
  key_id: process.env.RAZORPAY_KEY_ID || "deployment_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "deployment_placeholder"
});

app.get("/hello", (req, res) => {
  res.send("Hello, World!");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/create-order", verifyToken, async (req, res) => {
  const { rollNo, amount, programId = "global" } = req.body;
  if (String(req.roll_no) !== String(rollNo)) {
    return res.status(403).json({ error: "Unauthorized: Roll number mismatch" });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const amountPaise = amount * 100;
    const options = {
      amount: amountPaise,
      currency: "INR",
    };

    const order = await razorpay.orders.create(options);

    await db.collection("contributions").doc(order.id).set({
      rollNo,
      userId: req.user.uid,
      programId,
      status: "pending",
      orderId: order.id,
      amount: amount,
      createdAt: FieldValue.serverTimestamp()
    });
    res.status(200).json({ orderId: order.id, amount: amountPaise, key: process.env.RAZORPAY_KEY_ID });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ status: "failure", message: "Missing required fields" });
  }
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      const contributionRef = db.collection("contributions").doc(razorpay_order_id);

      const result = await db.runTransaction(async (transaction) => {
        const contributionSnap = await transaction.get(contributionRef);

        if (!contributionSnap.exists) {
          return { status: "not_found" };
        }

        const contributionData = contributionSnap.data();

        if (contributionData.status !== "pending") {
          return { status: "already_processed" };
        }

        // Resolve user by rollNo
        const usersQuery = db.collection("users").where("rollNo", "==", contributionData.rollNo).limit(1);
        const usersSnapshot = await transaction.get(usersQuery);
        if (usersSnapshot.empty) {
          throw new Error(`No user found for rollNo: ${contributionData.rollNo}`);
        }
        const userId = usersSnapshot.docs[0].id;

        // Use shared accounting service
        await recordContribution(db, transaction, {
          userId,
          programId: contributionData.programId,
          amount: contributionData.amount,
          source: "online",
          paymentMethod: "razorpay",
          type: contributionData.programId === "global" ? "global" : "program",
          orderId: contributionData.orderId,
          paymentId: razorpay_payment_id,
          rollNo: contributionData.rollNo,
          existingContribRef: contributionRef
        });

        return { status: "success" };
      });

      if (result.status === "success") {
        return res.status(200).json({ status: "success", message: "Payment verified successfully" });
      }

      if (result.status === "already_processed") {
        return res.status(200).json({ status: "success", message: "Payment already verified" });
      }

      return res.status(404).json({ status: "failure", message: "Transaction not found" });
    } else {
      res.status(400).json({ status: "failure", message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────

/**
 * POST /admin/contributions/manual
 * 
 * Adds a manual (cash/UPI/bank) contribution for a student.
 * All writes happen server-side inside a single Firestore transaction.
 */
app.post("/admin/contributions/manual", verifyAdmin, async (req, res) => {
  const { programId, studentId, amount, paymentMethod, notes, dateReceived } = req.body;

  // Input validation
  if (!programId || !studentId || !amount || amount <= 0) {
    return res.status(400).json({ error: "Missing or invalid required fields: programId, studentId, amount" });
  }

  const validMethods = ["cash", "upi", "bank_transfer"];
  if (!paymentMethod || !validMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: `Invalid paymentMethod. Must be one of: ${validMethods.join(", ")}` });
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      return await recordContribution(db, transaction, {
        userId: studentId,
        programId,
        amount: Number(amount),
        source: "manual",
        paymentMethod,
        type: programId === "global" ? "global" : "program",
        notes: notes || "",
        adminEmail: req.adminEmail,
        dateReceived: dateReceived ? new Date(dateReceived) : new Date()
      });
    });

    res.status(200).json({
      status: "success",
      message: "Contribution recorded successfully",
      contributionId: result.contributionId
    });
  } catch (error) {
    console.error("Error recording manual contribution:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

/**
 * POST /admin/expenses
 * 
 * Records a program expense. Rejects if amount exceeds program balance
 * unless the program is explicitly configured for overdraft.
 */
app.post("/admin/expenses", verifyAdmin, async (req, res) => {
  const { programId, title, amount, category, description, date } = req.body;

  // Input validation
  if (!programId || !title || !amount || amount <= 0 || !category) {
    return res.status(400).json({ error: "Missing or invalid required fields: programId, title, amount, category" });
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      return await recordExpense(db, transaction, {
        programId,
        title,
        amount: Number(amount),
        category,
        description: description || "",
        date: date ? new Date(date) : new Date(),
        adminEmail: req.adminEmail,
        allowOverdraft: false
      });
    });

    res.status(200).json({
      status: "success",
      message: "Expense recorded successfully",
      expenseId: result.expenseId
    });
  } catch (error) {
    console.error("Error recording expense:", error);

    // Differentiate between balance guard errors and internal errors
    if (error.message && error.message.startsWith("Insufficient program balance")) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message && error.message.startsWith("Cannot add expense")) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────
// BACKGROUND TASKS
// ─────────────────────────────────────────────────────────────

// Automatically expire "pending" transactions after 30 minutes
setInterval(async () => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const snapshot = await db.collection("contributions")
      .where("status", "==", "pending")
      .where("createdAt", "<", thirtyMinutesAgo)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { status: "expired" });
    });

    await batch.commit();
    console.log(`Expired ${snapshot.size} pending transactions.`);
  } catch (error) {
    console.error("Error expiring transactions:", error);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});