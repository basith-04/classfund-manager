import { collection, query, getDocs, orderBy, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db, auth } from "../../js/services/firebase.js";
import { find_balance } from "../../js/services/balance.js"
import { get_total_expense } from "../../js/services/expense.js";

async function loadData() {
    const totalBalance = await find_balance("global");
    const totalExpenses = await get_total_expense("global");
    
    document.getElementById("total-balance").textContent = `₹${totalBalance}`;
    document.getElementById('total-expenses').textContent = `₹${totalExpenses}`;

    // Load total students count and calculate actual total collected if needed
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);
        let studentCount = 0;
        querySnapshot.forEach(doc => {
            if (doc.id !== 'admin') studentCount++;
        });
        document.getElementById("total-students").textContent = studentCount;
    } catch (err) {
        console.error("Error loading total students", err);
    }
}

async function loadUsers() {
    const tbody = document.getElementById('student-table');
    const usersRef = collection(db, 'users');
    const minAmount = parseFloat(document.getElementById('min-amount').value) || 0;
    let count = 0;

    try {
        const q = query(usersRef, orderBy("rollNo", "asc"));
        const querySnapshot = await getDocs(q);

        tbody.textContent = "";
        querySnapshot.forEach((doc) => {
            if (doc.id === 'admin') return;
            const data = doc.data();
            const totalPaid = data.totalPaid || 0; // Safely read totalPaid

            if (totalPaid < minAmount) {
                const row = document.createElement("tr");

                const rollNoCell = document.createElement("td");
                rollNoCell.textContent = data.rollNo;

                const nameCell = document.createElement("td");
                nameCell.textContent = data.name;

                const paidCell = document.createElement("td");
                paidCell.textContent = `₹${totalPaid}`;

                const dueCell = document.createElement("td");
                dueCell.textContent = minAmount - totalPaid;

                row.append(rollNoCell, nameCell, paidCell, dueCell);
                tbody.appendChild(row);
                count++;
            }
        });

        document.getElementById("count-below").textContent = count;
    } catch (err) {
        console.error(err);
    }
}

document.getElementById("filter-btn").addEventListener("click", loadUsers);

// Settings Logic
const settingsRef = doc(db, "settings", "fundingConfig");

async function loadSettings() {
    try {
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
            const data = snap.data();
            document.getElementById("setting-suggested").value = data.suggestedContribution || 0;
            document.getElementById("setting-minimum").value = data.minContribution || 0;
            document.getElementById("setting-any-amount").checked = data.allowAnyAmount !== false;
            document.getElementById("setting-enabled").checked = data.contributionsEnabled !== false;
        }
    } catch (err) {
        console.error("Error loading settings:", err);
    }
}

document.getElementById("global-settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.textContent = "Saving...";
    try {
        await setDoc(settingsRef, {
            suggestedContribution: Number(document.getElementById("setting-suggested").value),
            minContribution: Number(document.getElementById("setting-minimum").value),
            allowAnyAmount: document.getElementById("setting-any-amount").checked,
            contributionsEnabled: document.getElementById("setting-enabled").checked
        }, { merge: true });
        alert("Settings saved!");
    } catch (err) {
        console.error(err);
        alert("Failed to save settings.");
    }
    btn.textContent = "Save Settings";
});

// Programs Logic
async function loadPrograms() {
    const list = document.getElementById("admin-programs-list");
    list.innerHTML = "Loading...";
    try {
        const snap = await getDocs(query(collection(db, "programs"), orderBy("createdAt", "desc")));
        list.innerHTML = "";
        if (snap.empty) {
            list.innerHTML = "<p>No programs found.</p>";
            return;
        }
        
        for (const d of snap.docs) {
            const p = d.data();
            const ledgerSnap = await getDoc(doc(db, "ledgers", `program_${d.id}`));
            const ledger = ledgerSnap.exists() ? ledgerSnap.data() : { totalContributions: 0 };
            
            const div = document.createElement("div");
            div.style.padding = "1rem";
            div.style.background = "var(--bg)";
            div.style.borderRadius = "8px";
            div.style.border = "1px solid var(--border)";
            
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${p.name}</strong>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span style="font-size: 0.8rem; padding: 2px 6px; background: var(--border); border-radius: 4px; color: var(--text-primary);">${p.status}</span>
                        <a href="programDashboard.html?id=${d.id}" style="text-decoration: none; background: var(--accent); color: #000; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; cursor: pointer; display: inline-block;">Manage</a>
                        <button class="edit-prog-btn" data-id="${d.id}" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Edit</button>
                        <button class="delete-prog-btn" data-id="${d.id}" data-raised="${ledger.totalContributions}" style="background: #f44336; border: none; color: #fff; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Delete</button>
                    </div>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">Raised: ₹${ledger.totalContributions}</div>
            `;
            list.appendChild(div);
            
            // Attach event listener immediately to the newly created button
            const editBtn = div.querySelector('.edit-prog-btn');
            editBtn.addEventListener('click', () => {
                editingProgramId = d.id;
                document.getElementById("prog-name").value = p.name;
                document.getElementById("prog-desc").value = p.description || "";
                document.getElementById("prog-target").value = p.targetAmount || "";
                document.getElementById("prog-target-type").value = p.targetType || "global";
                document.getElementById("prog-min-amount").value = p.minContribution || "";
                document.getElementById("prog-any-amount").checked = p.allowAnyAmount;
                document.getElementById("prog-target-type").style.display = p.allowAnyAmount ? 'none' : 'block';
                document.getElementById("prog-target").style.display = p.allowAnyAmount ? 'none' : 'block';
                document.getElementById("prog-target").required = !p.allowAnyAmount;
                document.getElementById("prog-min-amount").style.display = p.allowAnyAmount ? 'block' : 'none';
                document.getElementById("prog-min-amount").required = p.allowAnyAmount;
                document.getElementById("prog-status").value = p.status || "Active";
                modal.style.display = "flex";
                document.querySelector('#program-modal-overlay h2').textContent = "Edit Program";
            });

            const deleteBtn = div.querySelector('.delete-prog-btn');
            deleteBtn.addEventListener('click', async () => {
                const raised = parseFloat(deleteBtn.dataset.raised) || 0;
                if (raised > 0) {
                    alert("Cannot delete program because money has already been collected.");
                    return;
                }
                if (confirm(`Are you sure you want to delete the program "${p.name}"?`)) {
                    try {
                        await deleteDoc(doc(db, "programs", d.id));
                        loadPrograms();
                    } catch (err) {
                        console.error("Error deleting program:", err);
                        alert("Failed to delete program.");
                    }
                }
            });
        }
    } catch (err) {
        console.error("Error loading programs:", err);
        list.innerHTML = "Error loading programs.";
    }
}

let editingProgramId = null;
const modal = document.getElementById("program-modal-overlay");

document.getElementById("create-program-btn").addEventListener("click", () => {
    editingProgramId = null;
    document.getElementById("program-form").reset();
    document.getElementById("prog-target-type").style.display = 'none'; // default checked is true
    document.getElementById("prog-target").style.display = 'none';
    document.getElementById("prog-target").required = false;
    document.getElementById("prog-min-amount").style.display = 'block';
    document.getElementById("prog-min-amount").required = true;
    document.querySelector('#program-modal-overlay h2').textContent = "Create Program";
    modal.style.display = "flex";
});
document.getElementById("prog-cancel").addEventListener("click", () => {
    modal.style.display = "none";
});

document.getElementById("prog-any-amount").addEventListener("change", (e) => {
    document.getElementById("prog-target-type").style.display = e.target.checked ? 'none' : 'block';
    document.getElementById("prog-target").style.display = e.target.checked ? 'none' : 'block';
    document.getElementById("prog-target").required = !e.target.checked;
    document.getElementById("prog-min-amount").style.display = e.target.checked ? 'block' : 'none';
    document.getElementById("prog-min-amount").required = e.target.checked;
});

document.getElementById("program-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type='submit']");
    btn.textContent = "Saving...";
    try {
        const payload = {
            name: document.getElementById("prog-name").value,
            description: document.getElementById("prog-desc").value,
            targetAmount: Number(document.getElementById("prog-target").value) || null,
            targetType: document.getElementById("prog-target-type").value,
            allowAnyAmount: document.getElementById("prog-any-amount").checked,
            minContribution: Number(document.getElementById("prog-min-amount").value) || null,
            status: document.getElementById("prog-status").value,
            updatedAt: new Date()
        };

        if (editingProgramId) {
            await updateDoc(doc(db, "programs", editingProgramId), payload);
        } else {
            payload.createdAt = new Date();
            await addDoc(collection(db, "programs"), payload);
        }
        
        modal.style.display = "none";
        loadPrograms();
    } catch (err) {
        console.error(err);
        alert("Error saving program");
    }
    btn.textContent = "Save";
});

document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "../index.html";
    }).catch((error) => {
        console.error("Logout error:", error);
    });
});

onAuthStateChanged(auth, (user) => {
    if (user && user.email === 'admin@example.com') {
        loadData();
        loadSettings();
        loadPrograms();
    } else if (!user) {
        window.location.href = "../index.html";
    }
});