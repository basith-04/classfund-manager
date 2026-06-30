import { db, auth } from "../../js/services/firebase.js";
import { collection, doc, getDoc, getDocs, query, where, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const BACKEND_URL = window.location.hostname === "localhost" 
    ? "http://localhost:3001" 
    : "https://YOUR_BACKEND_URL";

const urlParams = new URLSearchParams(window.location.search);
const programId = urlParams.get('id');

if (!programId) {
    window.location.href = "adminDashboard.html";
}

let programData = null;
let ledgerData = null;
let usersData = [];
let programContributions = [];
let programExpenses = [];

// DOM Elements
const els = {
    title: document.getElementById('prog-title'),
    status: document.getElementById('prog-status'),
    dates: document.getElementById('prog-dates'),
    
    statExpected: document.getElementById('stat-expected'),
    statActual: document.getElementById('stat-actual'),
    statRate: document.getElementById('stat-rate'),
    statExpenses: document.getElementById('stat-expenses'),
    statBalance: document.getElementById('stat-balance'),
    
    progressSection: document.getElementById('progress-section'),
    progressText: document.getElementById('progress-text'),
    progressFill: document.getElementById('progress-fill'),
    
    belowTargetList: document.getElementById('below-target-list'),
    allStudentsList: document.getElementById('all-students-list'),
    historyList: document.getElementById('history-list'),
    expensesList: document.getElementById('expenses-list'),
    auditList: document.getElementById('audit-list'),
    
    tabs: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),

    searchStudent: document.getElementById('search-student'),
    filterStatus: document.getElementById('filter-status')
};

let searchQuery = "";
let filterStatusVal = "all";

// Setup Filters & Search
els.searchStudent.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderDashboard();
});

els.filterStatus.addEventListener('change', (e) => {
    filterStatusVal = e.target.value;
    renderDashboard();
});

// Setup Tabs
els.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        els.tabs.forEach(t => t.classList.remove('active'));
        els.tabContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

/**
 * Helper: Get the admin's Firebase ID token for API calls.
 * @returns {Promise<string>} Bearer token
 */
async function getAuthHeaders() {
    const idToken = await auth.currentUser.getIdToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
    };
}

async function loadData() {
    try {
        // 1. Program Data
        const progSnap = await getDoc(doc(db, "programs", programId));
        if (!progSnap.exists()) return;
        programData = progSnap.data();

        // 2. Ledger Data
        const ledgerRef = doc(db, "ledgers", `program_${programId}`);
        const ledgerSnap = await getDoc(ledgerRef);
        ledgerData = ledgerSnap.exists() ? ledgerSnap.data() : { totalContributions: 0, totalExpenses: 0, contributorsCount: 0 };
        
        // Ensure fields exist
        if (ledgerData.totalContributions === undefined) ledgerData.totalContributions = 0;
        if (ledgerData.totalExpenses === undefined) ledgerData.totalExpenses = 0;

        // 3. Users Data
        const uSnap = await getDocs(query(collection(db, "users"), orderBy("rollNo", "asc")));
        usersData = uSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 4. Contributions for this program
        const cSnap = await getDocs(query(collection(db, "contributions"), where("programId", "==", programId)));
        programContributions = cSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => {
            const valA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
            const valB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
            return valB - valA;
        });

        // 5. Expenses for this program
        const eSnap = await getDocs(query(collection(db, "expenses"), where("programId", "==", programId)));
        programExpenses = eSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => {
            const valA = a.date?.toMillis ? a.date.toMillis() : new Date(a.date || 0).getTime();
            const valB = b.date?.toMillis ? b.date.toMillis() : new Date(b.date || 0).getTime();
            return valB - valA;
        });

        renderDashboard();
        loadAuditLogs();
        populateStudentDropdown();
    } catch (err) {
        console.error("Error loading dashboard data", err);
    }
}

async function loadAuditLogs() {
    const aSnap = await getDocs(query(collection(db, "auditLogs"), where("programId", "==", programId)));
    const logs = aSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp);
    els.auditList.innerHTML = logs.map(l => `
        <tr>
            <td>${l.timestamp.toDate ? l.timestamp.toDate().toLocaleString() : new Date(l.timestamp).toLocaleString()}</td>
            <td><strong>${l.action}</strong></td>
            <td>${l.user}</td>
            <td>${l.details}</td>
        </tr>
    `).join('');
}

function renderDashboard() {
    // Basic Header
    els.title.textContent = programData.name;
    els.status.textContent = programData.status || "Active";
    els.status.className = `status-badge ${programData.status ? programData.status.toLowerCase() : 'active'}`;
    els.dates.textContent = `Created: ${programData.createdAt ? programData.createdAt.toDate().toLocaleDateString() : 'N/A'}`;

    // Compute Student Aggregates for this program
    const studentPayments = {};
    programContributions.forEach(c => {
        // Only count valid, completed payments
        const isPaid = c.status ? !['pending', 'expired', 'failed', 'cancelled', 'voided', 'refunded'].includes(c.status) : true;
        
        if (isPaid) {
            let uid = c.userId;
            // Online payments might only have rollNo
            if (!uid && c.rollNo) {
                const user = usersData.find(u => String(u.rollNo) === String(c.rollNo));
                if (user) uid = user.id;
            }
            
            if (uid) {
                studentPayments[uid] = (studentPayments[uid] || 0) + Number(c.amount);
            }
        }
    });

    const exempted = programData.exemptedStudents || [];
    const eligibleUsers = usersData.filter(u => !exempted.includes(u.id));
    const totalEligible = eligibleUsers.length;

    // Financial calculations
    const allowAny = programData.allowAnyAmount;
    const globalTarget = programData.targetAmount || 0;
    const targetType = programData.targetType || 'global';
    
    let requiredPerStudent = 0;
    let expectedCollection = 0;

    if (!allowAny && globalTarget > 0 && totalEligible > 0) {
        if (targetType === 'per_student') {
            requiredPerStudent = globalTarget;
            expectedCollection = globalTarget * totalEligible;
        } else {
            // Assume targetAmount is the Global Goal. Required = Target / Eligible.
            requiredPerStudent = Math.ceil(globalTarget / totalEligible);
            expectedCollection = globalTarget;
        }
    }

    const actualCollection = ledgerData.totalContributions;
    const totalExpenses = ledgerData.totalExpenses;
    const balance = actualCollection - totalExpenses;
    const rate = expectedCollection > 0 ? ((actualCollection / expectedCollection) * 100).toFixed(1) : (actualCollection > 0 ? 100 : 0);

    els.statExpected.textContent = allowAny ? "N/A (Open)" : `₹${expectedCollection}`;
    els.statActual.textContent = `₹${actualCollection}`;
    els.statRate.textContent = `${allowAny ? 'N/A' : rate + '%'}`;
    els.statExpenses.textContent = `₹${totalExpenses}`;
    els.statBalance.textContent = `₹${balance}`;

    if (!allowAny && expectedCollection > 0) {
        els.progressSection.style.display = 'block';
        els.progressText.textContent = `₹${actualCollection} / ₹${expectedCollection} (${rate}%)`;
        els.progressFill.style.width = `${Math.min(rate, 100)}%`;
    }

    // Render Lists
    let belowTargetHTML = '';
    let allStudentsHTML = '';

    usersData.forEach(u => {
        const paid = studentPayments[u.id] || 0;
        const isExempted = exempted.includes(u.id);
        const remaining = isExempted ? 0 : Math.max(0, requiredPerStudent - paid);
        
        let statusObj = { text: 'Not Paid', class: 'unpaid' };
        if (isExempted) statusObj = { text: 'Exempted', class: 'exempted' };
        else if (allowAny && paid > 0) statusObj = { text: 'Contributor', class: 'paid' };
        else if (!allowAny && paid >= requiredPerStudent) statusObj = { text: 'Fully Paid', class: 'paid' };
        else if (paid > 0) statusObj = { text: 'Partially Paid', class: 'partial' };

        const rowHTML = `
            <tr>
                <td>${u.rollNo}</td>
                <td>${u.name}</td>
                ${!allowAny ? `<td>₹${isExempted ? 0 : requiredPerStudent}</td>` : ''}
                <td>₹${paid}</td>
                ${!allowAny ? `<td>₹${remaining}</td>` : ''}
                <td>
                    <button class="btn add-quick-contrib" data-uid="${u.id}" style="padding: 4px 8px; font-size:0.8rem;">+ Cash</button>
                    ${!isExempted ? `<button class="btn mark-exempt" data-uid="${u.id}" style="padding: 4px 8px; font-size:0.8rem;">Exempt</button>` : `<button class="btn unmark-exempt" data-uid="${u.id}" style="padding: 4px 8px; font-size:0.8rem;">Unexempt</button>`}
                </td>
            </tr>
        `;

        if (!isExempted && remaining > 0 && !allowAny) {
            belowTargetHTML += rowHTML;
        }

        const matchesSearch = u.name.toLowerCase().includes(searchQuery) || u.rollNo.toString().toLowerCase().includes(searchQuery);
        const matchesStatus = filterStatusVal === 'all' || statusObj.class === filterStatusVal;

        if (matchesSearch && matchesStatus) {
            allStudentsHTML += `
                <tr>
                    <td>${u.rollNo}</td>
                    <td>${u.name}</td>
                    <td><span class="badge ${statusObj.class}">${statusObj.text}</span></td>
                    <td>₹${paid}</td>
                    <td><button class="btn add-quick-contrib" data-uid="${u.id}" style="padding: 4px 8px; font-size:0.8rem;">Add Funds</button></td>
                </tr>
            `;
        }
    });

    if (!allStudentsHTML) {
        allStudentsHTML = `<tr><td colspan="5" style="text-align:center;">No students match the criteria.</td></tr>`;
    }

    if (allowAny) {
        els.belowTargetList.innerHTML = `<tr><td colspan="5" style="text-align:center;">Open Contribution Mode - No specific target per student.</td></tr>`;
        document.querySelector('.priority-header h2').textContent = "Open Contributions";
    } else {
        els.belowTargetList.innerHTML = belowTargetHTML || `<tr><td colspan="6" style="text-align:center;">All students have met the target!</td></tr>`;
    }
    
    els.allStudentsList.innerHTML = allStudentsHTML;

    // Render History
    els.historyList.innerHTML = programContributions.map(c => {
        const student = usersData.find(u => u.id === c.userId || u.rollNo === c.rollNo);
        let methodText = c.paymentMethod;
        if (!methodText) {
            methodText = ['pending', 'failed', 'cancelled', 'expired', 'voided'].includes(c.status) ? 'razorpay' : 'N/A';
        }

        let badgeClass = 'paid';
        if (c.status === 'pending') badgeClass = 'unpaid';
        else if (['expired', 'failed', 'cancelled', 'voided'].includes(c.status)) badgeClass = 'danger';
        else if (c.status === 'refunded') badgeClass = 'partial';
        else badgeClass = c.source === 'manual' ? 'partial' : 'paid';

        const statusDisplay = c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1) : 'Unknown';

        const sourceBadge = ['pending', 'expired', 'failed', 'cancelled', 'voided', 'refunded'].includes(c.status)
            ? `<span class="badge ${badgeClass}">${statusDisplay}</span>`
            : `<span class="badge ${badgeClass}">${c.source || 'online'}</span>`;
            
        return `
            <tr>
                <td>${c.createdAt ? (c.createdAt.toDate ? c.createdAt.toDate().toLocaleDateString() : new Date(c.createdAt).toLocaleDateString()) : 'N/A'}</td>
                <td>${student ? student.name : 'Unknown'}</td>
                <td>₹${c.amount}</td>
                <td><span class="badge" style="background:#e2e8f0;">${methodText}</span></td>
                <td>${sourceBadge}</td>
                <td>${c.notes || '-'}</td>
            </tr>
        `;
    }).join('');

    // Render Expenses
    els.expensesList.innerHTML = programExpenses.map(ex => `
        <tr>
            <td>${ex.date ? (ex.date.toDate ? ex.date.toDate().toLocaleDateString() : new Date(ex.date).toLocaleDateString()) : 'N/A'}</td>
            <td>${ex.title}</td>
            <td>${ex.category}</td>
            <td><strong style="color:var(--danger)">₹${ex.amount}</strong></td>
            <td>Admin</td>
        </tr>
    `).join('');

    attachDynamicListeners();
}

function attachDynamicListeners() {
    document.querySelectorAll('.add-quick-contrib').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const uid = e.target.dataset.uid;
            document.getElementById('contrib-student').value = uid;
            document.getElementById('contrib-date').valueAsDate = new Date();
            document.getElementById('modal-add-contrib').style.display = 'flex';
        });
    });

    document.querySelectorAll('.mark-exempt').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const uid = e.target.dataset.uid;
            if (confirm("Mark student as exempted from this program?")) {
                const exempted = programData.exemptedStudents || [];
                if (!exempted.includes(uid)) {
                    exempted.push(uid);
                    await updateDoc(doc(db, "programs", programId), { exemptedStudents: exempted });
                    loadData();
                }
            }
        });
    });

    document.querySelectorAll('.unmark-exempt').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const uid = e.target.dataset.uid;
            let exempted = programData.exemptedStudents || [];
            exempted = exempted.filter(id => id !== uid);
            await updateDoc(doc(db, "programs", programId), { exemptedStudents: exempted });
            loadData();
        });
    });
}

function populateStudentDropdown() {
    const select = document.getElementById('contrib-student');
    select.innerHTML = '<option value="">Select Student...</option>';
    usersData.forEach(u => {
        select.innerHTML += `<option value="${u.id}">${u.rollNo} - ${u.name}</option>`;
    });
}

// Add Contribution Logic
document.getElementById('btn-add-contrib').addEventListener('click', () => {
    document.getElementById('form-add-contrib').reset();
    document.getElementById('contrib-date').valueAsDate = new Date();
    document.getElementById('modal-add-contrib').style.display = 'flex';
});

/**
 * Save contribution via backend API endpoint.
 * All financial writes happen server-side inside a Firestore transaction.
 */
async function handleSaveContribution(addAnother = false) {
    const userId = document.getElementById('contrib-student').value;
    const amount = Number(document.getElementById('contrib-amount').value);
    const method = document.getElementById('contrib-method').value;
    const date = document.getElementById('contrib-date').value;
    const notes = document.getElementById('contrib-notes').value;

    if (!userId || !amount || amount <= 0 || !date) return alert("Please fill required fields.");

    const btn1 = document.getElementById('btn-save-contrib');
    const btn2 = document.getElementById('btn-save-add-contrib');
    btn1.disabled = true; btn2.disabled = true;

    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${BACKEND_URL}/admin/contributions/manual`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                programId,
                studentId: userId,
                amount,
                paymentMethod: method,
                notes,
                dateReceived: date
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
        }

        if (addAnother) {
            document.getElementById('form-add-contrib').reset();
            document.getElementById('contrib-date').valueAsDate = new Date();
        } else {
            document.getElementById('modal-add-contrib').style.display = 'none';
        }
        loadData();
    } catch (err) {
        console.error("Error saving contribution", err);
        alert("Failed to save contribution: " + err.message);
    }
    btn1.disabled = false; btn2.disabled = false;
}

document.getElementById('btn-save-contrib').addEventListener('click', (e) => { e.preventDefault(); handleSaveContribution(false); });
document.getElementById('btn-save-add-contrib').addEventListener('click', (e) => { e.preventDefault(); handleSaveContribution(true); });

// Add Expense Logic
document.getElementById('btn-add-expense').addEventListener('click', () => {
    document.getElementById('form-add-expense').reset();
    document.getElementById('exp-date').valueAsDate = new Date();
    document.getElementById('modal-add-expense').style.display = 'flex';
});

/**
 * Save expense via backend API endpoint.
 * Rejects if expense exceeds program balance.
 */
document.getElementById('form-add-expense').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('exp-title').value;
    const amount = Number(document.getElementById('exp-amount').value);
    const category = document.getElementById('exp-category').value;
    const date = document.getElementById('exp-date').value;
    const desc = document.getElementById('exp-desc').value;

    const btn = document.getElementById('btn-save-expense');
    btn.disabled = true;
    
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${BACKEND_URL}/admin/expenses`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                programId,
                title,
                amount,
                category,
                description: desc,
                date
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
        }

        document.getElementById('modal-add-expense').style.display = 'none';
        loadData();
    } catch (err) {
        console.error("Error adding expense", err);
        alert("Failed to add expense: " + err.message);
    }
    btn.disabled = false;
});

onAuthStateChanged(auth, (user) => {
    if (user && user.email === 'admin@example.com') {
        loadData();
    } else if (!user) {
        window.location.href = "../index.html";
    }
});

// Edit Program Modal Logic
document.getElementById("prog-any-amount").addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    document.getElementById("prog-target-type").style.display = isChecked ? 'none' : 'block';
    document.getElementById("prog-target").style.display = isChecked ? 'none' : 'block';
    document.getElementById("prog-target").required = !isChecked;
    document.getElementById("prog-min-amount").style.display = isChecked ? 'block' : 'none';
    document.getElementById("prog-min-amount").required = isChecked;
});

document.getElementById('btn-edit-prog').addEventListener('click', () => {
    if (!programData) return;
    document.getElementById("prog-name").value = programData.name || "";
    document.getElementById("prog-desc").value = programData.description || "";
    document.getElementById("prog-target").value = programData.targetAmount || "";
    document.getElementById("prog-target-type").value = programData.targetType || "global";
    document.getElementById("prog-min-amount").value = programData.minContribution || "";
    document.getElementById("prog-any-amount").checked = !!programData.allowAnyAmount;
    document.getElementById("prog-status-select").value = programData.status || "Active";
    
    // Toggle field visibilities based on allowAnyAmount
    const isChecked = !!programData.allowAnyAmount;
    document.getElementById("prog-target-type").style.display = isChecked ? 'none' : 'block';
    document.getElementById("prog-target").style.display = isChecked ? 'none' : 'block';
    document.getElementById("prog-target").required = !isChecked;
    document.getElementById("prog-min-amount").style.display = isChecked ? 'block' : 'none';
    document.getElementById("prog-min-amount").required = isChecked;
    
    document.getElementById("program-modal-overlay").style.display = "flex";
});

document.getElementById("prog-cancel").addEventListener("click", () => {
    document.getElementById("program-modal-overlay").style.display = "none";
});

document.getElementById("program-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-save-prog-edit");
    const originalText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;
    try {
        const payload = {
            name: document.getElementById("prog-name").value,
            description: document.getElementById("prog-desc").value,
            targetAmount: Number(document.getElementById("prog-target").value) || null,
            targetType: document.getElementById("prog-target-type").value,
            allowAnyAmount: document.getElementById("prog-any-amount").checked,
            minContribution: Number(document.getElementById("prog-min-amount").value) || null,
            status: document.getElementById("prog-status-select").value,
            updatedAt: new Date()
        };

        await updateDoc(doc(db, "programs", programId), payload);
        
        document.getElementById("program-modal-overlay").style.display = "none";
        loadData();
    } catch (err) {
        console.error(err);
        alert("Error saving program: " + err.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});
