/**
 * Shared Accounting Service
 * 
 * Single source of truth for all financial transactions.
 * Used by both Razorpay payment verification and manual admin contributions.
 * 
 * All operations run inside Firestore transactions to guarantee atomicity.
 */

import { FieldValue } from "firebase-admin/firestore";

/**
 * Records a contribution inside an existing Firestore transaction.
 * 
 * Updates: contribution doc, user cached aggregate, program ledger, global ledger, audit log.
 * 
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {FirebaseFirestore.Transaction} transaction - Active Firestore transaction
 * @param {Object} params
 * @param {string} params.userId - User document ID (uid)
 * @param {string} params.programId - Program ID or "global"
 * @param {number} params.amount - Contribution amount in INR
 * @param {string} params.source - "manual" | "online"
 * @param {string} params.paymentMethod - "cash" | "upi" | "bank_transfer" | "razorpay"
 * @param {string} params.type - "program" | "global"
 * @param {string} [params.notes] - Optional notes
 * @param {string} [params.orderId] - Razorpay order ID (online payments)
 * @param {string} [params.paymentId] - Razorpay payment ID (online payments)
 * @param {string} [params.adminEmail] - Admin email for audit trail (manual contributions)
 * @param {Date} [params.dateReceived] - Date the payment was received
 * @param {string} [params.rollNo] - Student roll number (online payments use this)
 * @param {FirebaseFirestore.DocumentReference} [params.existingContribRef] - Existing contribution doc ref to update (for Razorpay flow)
 * @returns {Object} Result with contributionId
 */
export async function recordContribution(db, transaction, params) {
  const {
    userId,
    programId,
    amount,
    source,
    paymentMethod,
    type,
    notes = "",
    orderId = null,
    paymentId = null,
    adminEmail = null,
    dateReceived = new Date(),
    rollNo = null,
    existingContribRef = null
  } = params;

  // --- READ PHASE ---

  // 1. Read user document
  const userRef = db.collection("users").doc(userId);
  const userSnap = await transaction.get(userRef);
  if (!userSnap.exists) {
    throw new Error(`User not found: ${userId}`);
  }

  // 2. Read global ledger
  const globalLedgerRef = db.collection("ledgers").doc("global");
  const globalLedgerSnap = await transaction.get(globalLedgerRef);

  // 3. Read program ledger (if program-specific)
  let programLedgerRef = null;
  let programLedgerSnap = null;
  let isNewContributor = false;
  if (programId && programId !== "global") {
    programLedgerRef = db.collection("ledgers").doc(`program_${programId}`);
    programLedgerSnap = await transaction.get(programLedgerRef);

    if (programLedgerSnap.exists) {
      const pastContribsQuery = db.collection("contributions")
        .where("userId", "==", userId)
        .where("programId", "==", programId)
        .where("status", "==", "completed")
        .limit(1);
      const pastContribsSnap = await transaction.get(pastContribsQuery);
      if (pastContribsSnap.empty) {
        isNewContributor = true;
      }
    }
  }

  // --- WRITE PHASE ---

  // 1. Create or update contribution document
  let contributionRef;
  if (existingContribRef) {
    // Razorpay flow: update existing pending contribution
    contributionRef = existingContribRef;
    transaction.update(contributionRef, {
      userId,
      status: "completed",
      paymentId,
      paymentMethod,
      source,
      type,
      completedAt: FieldValue.serverTimestamp()
    });
  } else {
    // Manual flow: create new contribution
    contributionRef = db.collection("contributions").doc();
    transaction.set(contributionRef, {
      userId,
      programId,
      amount,
      source,
      paymentMethod,
      type,
      status: "completed",
      notes,
      rollNo: rollNo || userSnap.data().rollNo,
      createdAt: dateReceived instanceof Date ? dateReceived : new Date(dateReceived),
      completedAt: FieldValue.serverTimestamp()
    });
  }

  // 2. Update user cached aggregate (totalPaid)
  const currentTotalPaid = userSnap.data().totalPaid || 0;
  transaction.update(userRef, {
    totalPaid: currentTotalPaid + amount
  });

  // 3. Update global ledger
  if (!globalLedgerSnap.exists) {
    transaction.set(globalLedgerRef, {
      totalContributions: amount,
      totalExpenditure: 0,
      balance: amount,
      totalTransactions: 1
    });
  } else {
    const gData = globalLedgerSnap.data();
    transaction.update(globalLedgerRef, {
      totalContributions: (gData.totalContributions || 0) + amount,
      balance: (gData.balance || 0) + amount,
      totalTransactions: (gData.totalTransactions || 0) + 1
    });
  }

  // 4. Update program ledger (if program-specific)
  if (programLedgerRef) {
    if (!programLedgerSnap.exists) {
      transaction.set(programLedgerRef, {
        totalContributions: amount,
        totalExpenses: 0,
        balance: amount,
        contributorsCount: 1
      });
    } else {
      const pData = programLedgerSnap.data();
      const programUpdate = {
        totalContributions: (pData.totalContributions || 0) + amount,
        balance: (pData.balance || 0) + amount
      };
      if (isNewContributor) {
        programUpdate.contributorsCount = (pData.contributorsCount || 0) + 1;
      }
      transaction.update(programLedgerRef, programUpdate);
    }
  }

  // 5. Create audit log
  const auditRef = db.collection("auditLogs").doc();
  transaction.set(auditRef, {
    action: source === "manual" ? "Manual Contribution Added" : "Online Payment Verified",
    type: "CONTRIBUTION",
    amount,
    programId,
    userId,
    rollNo,
    orderId,
    details: source === "manual"
      ? `₹${amount} for ${userSnap.data().name || userId} via ${paymentMethod}`
      : `₹${amount} via Razorpay`,
    user: adminEmail || "system",
    timestamp: FieldValue.serverTimestamp()
  });

  return { contributionId: contributionRef.id };
}

/**
 * Records an expense inside an existing Firestore transaction.
 * 
 * Updates: expense doc, program ledger, global ledger, audit log.
 * Rejects if expense exceeds program balance (unless overdraft allowed).
 * 
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {FirebaseFirestore.Transaction} transaction - Active Firestore transaction
 * @param {Object} params
 * @param {string} params.programId - Program ID
 * @param {string} params.title - Expense title
 * @param {number} params.amount - Expense amount in INR
 * @param {string} params.category - Expense category
 * @param {string} [params.description] - Optional description
 * @param {Date} [params.date] - Expense date
 * @param {string} params.adminEmail - Admin email for audit trail
 * @param {boolean} [params.allowOverdraft=false] - Whether to allow expense exceeding balance
 * @returns {Object} Result with expenseId
 */
export async function recordExpense(db, transaction, params) {
  const {
    programId,
    title,
    amount,
    category,
    description = "",
    date = new Date(),
    adminEmail,
    allowOverdraft = false
  } = params;

  // --- READ PHASE ---

  // 1. Read program ledger
  const programLedgerRef = db.collection("ledgers").doc(`program_${programId}`);
  const programLedgerSnap = await transaction.get(programLedgerRef);

  // 2. Read global ledger
  const globalLedgerRef = db.collection("ledgers").doc("global");
  const globalLedgerSnap = await transaction.get(globalLedgerRef);

  // 3. Balance guard — reject if expense exceeds program balance
  if (!allowOverdraft && programLedgerSnap.exists) {
    const currentBalance = programLedgerSnap.data().balance || 0;
    if (amount > currentBalance) {
      throw new Error(
        `Insufficient program balance. Available: ₹${currentBalance}, Requested: ₹${amount}`
      );
    }
  }

  if (!allowOverdraft && !programLedgerSnap.exists) {
    throw new Error("Cannot add expense: program ledger does not exist (no contributions yet).");
  }

  // --- WRITE PHASE ---

  // 1. Create expense document
  const expenseRef = db.collection("expenses").doc();
  transaction.set(expenseRef, {
    programId,
    title,
    amount,
    category,
    description,
    date: date instanceof Date ? date : new Date(date),
    createdAt: FieldValue.serverTimestamp(),
    scope: "program"
  });

  // 2. Update program ledger
  if (!programLedgerSnap.exists) {
    transaction.set(programLedgerRef, {
      totalContributions: 0,
      totalExpenses: amount,
      balance: -amount,
      contributorsCount: 0
    });
  } else {
    const pData = programLedgerSnap.data();
    transaction.update(programLedgerRef, {
      totalExpenses: (pData.totalExpenses || 0) + amount,
      balance: (pData.balance || 0) - amount
    });
  }

  // 3. Update global ledger
  if (!globalLedgerSnap.exists) {
    transaction.set(globalLedgerRef, {
      totalContributions: 0,
      totalExpenditure: amount,
      balance: -amount,
      totalTransactions: 1
    });
  } else {
    const gData = globalLedgerSnap.data();
    transaction.update(globalLedgerRef, {
      totalExpenditure: (gData.totalExpenditure || 0) + amount,
      balance: (gData.balance || 0) - amount,
      totalTransactions: (gData.totalTransactions || 0) + 1
    });
  }

  // 4. Create audit log
  const auditRef = db.collection("auditLogs").doc();
  transaction.set(auditRef, {
    action: "Expense Added",
    type: "EXPENSE",
    amount,
    programId,
    details: `₹${amount} for ${title} [${category}]`,
    user: adminEmail,
    timestamp: FieldValue.serverTimestamp()
  });

  return { expenseId: expenseRef.id };
}
