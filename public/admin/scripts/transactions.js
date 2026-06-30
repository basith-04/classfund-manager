import { collection, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db, auth } from "../../js/services/firebase.js";

/** @type {Array<{id: string, date: Date|null, rollNo: string, amount: number, status: string}>} */
let allTransactions = [];

// ── DOM References ──
const tableBody = document.getElementById("class-fund-table2");
const searchInput = document.getElementById("search-roll");
const statusFilter = document.getElementById("filter-status");
const dateFrom = document.getElementById("filter-date-from");
const dateTo = document.getElementById("filter-date-to");
const clearBtn = document.getElementById("clear-filters-btn");
const resultsCount = document.getElementById("results-count");
const totalAmountBadge = document.getElementById("total-amount-badge");

// ── Fetch all transactions from Firestore ──
async function loadTransactions() {
    const transactionsRef = collection(db, "contributions");

    try {
        const q = query(transactionsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        allTransactions = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const dateObj = data.createdAt?.toDate ? data.createdAt.toDate() : null;
            allTransactions.push({
                id: doc.id,
                date: dateObj,
                rollNo: String(data.rollNo ?? "—"),
                amount: Number(data.amount) || 0,
                status: (data.status ?? "completed").toLowerCase(),
            });
        });

        applyFilters();
    } catch (err) {
        console.error("Failed to load transactions:", err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; padding:2rem; color:#64748b;">
                    Failed to load transactions. Please try again.
                </td>
            </tr>`;
    }
}

// ── Filter logic ──
function applyFilters() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const fromDate = dateFrom.value ? new Date(dateFrom.value) : null;
    const toDate = dateTo.value ? new Date(dateTo.value + "T23:59:59") : null;

    const filtered = allTransactions.filter((txn) => {
        // Search: match roll no or amount
        if (searchTerm) {
            const rollMatch = txn.rollNo.toLowerCase().includes(searchTerm);
            const amountMatch = String(txn.amount).includes(searchTerm);
            if (!rollMatch && !amountMatch) return false;
        }

        // Status filter
        if (selectedStatus !== "all" && txn.status !== selectedStatus) {
            return false;
        }

        // Date range
        if (fromDate && txn.date && txn.date < fromDate) return false;
        if (toDate && txn.date && txn.date > toDate) return false;

        return true;
    });

    renderTable(filtered);
    updateSummary(filtered);
}

// ── Render filtered results ──
function renderTable(transactions) {
    tableBody.textContent = "";

    if (transactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            <line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                        <p>No transactions match your filters</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    transactions.forEach((txn) => {
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.textContent = txn.date ? txn.date.toLocaleDateString() : "—";

        const rollNoCell = document.createElement("td");
        rollNoCell.textContent = txn.rollNo;

        const amountCell = document.createElement("td");
        amountCell.textContent = `₹${txn.amount}`;
        amountCell.style.fontWeight = "600";

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `status-badge status-${txn.status}`;
        badge.textContent = txn.status.charAt(0).toUpperCase() + txn.status.slice(1);
        statusCell.appendChild(badge);

        row.append(dateCell, rollNoCell, amountCell, statusCell);
        tableBody.appendChild(row);
    });
}

// ── Update the summary line ──
function updateSummary(filtered) {
    const total = allTransactions.length;
    const shown = filtered.length;
    const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);

    if (shown === total) {
        resultsCount.innerHTML = `Showing <strong>${total}</strong> transaction${total !== 1 ? "s" : ""}`;
    } else {
        resultsCount.innerHTML = `Showing <strong>${shown}</strong> of <strong>${total}</strong> transaction${total !== 1 ? "s" : ""}`;
    }

    totalAmountBadge.textContent = `₹${totalAmount.toLocaleString("en-IN")}`;
}

// ── Wire up event listeners ──
searchInput.addEventListener("input", applyFilters);
statusFilter.addEventListener("change", applyFilters);

dateFrom.addEventListener("change", () => {
    if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
        dateTo.value = dateFrom.value;
    }
    applyFilters();
});

dateTo.addEventListener("change", () => {
    if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
        dateFrom.value = dateTo.value;
    }
    applyFilters();
});

clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    statusFilter.value = "all";
    dateFrom.value = "";
    dateTo.value = "";
    applyFilters();
});

// ── Auth gate ──
onAuthStateChanged(auth, (user) => {
    if (user && user.email === "admin@example.com") {
        loadTransactions();
    } else if (!user) {
        window.location.href = "../index.html";
    }
});
