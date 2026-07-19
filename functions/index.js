import {initializeApp} from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file

const app = express();
app.use(cors());
app.use(express.json());


initializeApp();
const db = getFirestore()

app.get("/hello", (req, res) => {
  res.send("Hello, World!");
});

// --- Razorpay Webhook ---
// Razorpay sends a raw JSON body with an X-Razorpay-Signature header.
// We MUST use express.raw() here so the body is available as a Buffer for
// signature verification. The global express.json() middleware is fine for
// every other route because those are called from the frontend.
app.post(
  "/razory-pay",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // ── 1. Signature verification ─────────────────────────────────────────
    const receivedSignature = req.headers["x-razorpay-signature"];
    if (!receivedSignature || !webhookSecret) {
      console.error("Webhook: missing signature header or webhook secret.");
      return res.status(400).json({ error: "Bad request" });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== receivedSignature) {
      console.error("Webhook: signature mismatch — possible spoofed request.");
      return res.status(400).json({ error: "Invalid signature" });
    }

    // ── 2. Parse payload ──────────────────────────────────────────────────
    let payload;
    try {
      payload = JSON.parse(rawBody.toString());
    } catch (e) {
      console.error("Webhook: failed to parse JSON body", e);
      return res.status(400).json({ error: "Invalid JSON" });
    }

    console.log("Razorpay webhook payload:", JSON.stringify(payload, null, 2));

    // ── 3. Only handle payment.captured events ────────────────────────────
    if (payload.event !== "payment.captured") {
      // Acknowledge other events so Razorpay doesn't keep retrying them.
      return res.status(200).json({ status: "ignored", event: payload.event });
    }

    const paymentEntity = payload?.payload?.payment?.entity;
    if (!paymentEntity) {
      console.error("Webhook: payment entity missing from payload.");
      return res.status(400).json({ error: "Malformed payload" });
    }

    const {
      id: paymentId,
      order_id: orderId,
      amount,          // in paise
      notes,
    } = paymentEntity;

    const rollNo = notes?.roll_no ?? notes?.rollNo;

    if (!rollNo) {
      console.error("Webhook: roll_no missing from payment notes.", notes);
      return res.status(400).json({ error: "roll_no not found in payment notes" });
    }

    const amountRupees = amount / 100;

    // ── 4. Firestore transaction — idempotent update ──────────────────────
    try {
      const transactionRef = db.collection("transactions").doc(orderId ?? paymentId);

      await db.runTransaction(async (t) => {
        // ── 4a. Check if we already processed this payment ────────────────
        const txSnap = await t.get(transactionRef);
        if (txSnap.exists && txSnap.data().status === "success") {
          console.log(`Webhook: payment ${paymentId} already processed, skipping.`);
          return; // idempotent — do nothing
        }

        // ── 4b. Find the user by roll_no ──────────────────────────────────
        const usersQuery = db.collection("users")
          .where("rollNo", "==", Number(rollNo))
          .limit(1);
        const usersSnap = await t.get(usersQuery);

        if (usersSnap.empty) {
          throw new Error(`Webhook: no user found for rollNo: ${rollNo}`);
        }

        const userRef = usersSnap.docs[0].ref;

        // ── 4c. Write / update transaction doc ───────────────────────────
        if (txSnap.exists) {
          // Payment already partially recorded — update status and paymentId
          t.update(transactionRef, {
            status: "success",
            paymentId,
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          // Fresh webhook-only transaction — create the doc from scratch
          t.set(transactionRef, {
            rollNo: String(rollNo),
            orderId: orderId ?? null,
            paymentId,
            amount: amountRupees,
            status: "success",
            source: "webhook",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        // ── 4d. Increment user's totalPaid ────────────────────────────────
        t.update(userRef, {
          totalPaid: FieldValue.increment(amountRupees),
        });
      });

      console.log(`Webhook: successfully processed payment ${paymentId} for rollNo ${rollNo}`);
      return res.status(200).json({ status: "success" });

    } catch (error) {
      console.error("Webhook: error processing payment:", error);
      // Return 500 so Razorpay retries the webhook
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export const api = onRequest({cors: true}, app);