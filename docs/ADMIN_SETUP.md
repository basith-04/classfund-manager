# Admin Setup & Usage Guide

This guide explains how to initialize your first admin account and use the Admin Dashboard to manage your class funds.

## 1. Creating the First Admin
Before anyone can access the admin portal, you must manually create the first admin user in the database.

1. Ensure your Firebase Service Account JSON is in the `functions/` folder.
2. In your terminal, run the database seed script to create the admin user document:
   ```bash
   cd functions
   node seed.js
   ```
3. Run the claim script to attach the cryptographic "admin" role to that user:
   ```bash
   node set-admin-claim.js
   ```
4. **Login**: Go to your deployed application and log in using the default credentials:
   - **Email**: `admin@example.com`
   - **Password**: `admin123`
5. **Change Password**: Immediately click the profile icon in the top right and change your password to something secure!

## 2. The Admin Dashboard
Navigate to the **Admin Portal** from your profile menu. 

### Global View
The main dashboard gives you a high-level overview of total funds collected across all programs, total expenses, and the current net balance.

### Managing Programs
A "Program" is a specific collection goal (e.g., "Farewell Party", "Exam Fees", "Monthly Maintenance").

- **Create a Program**: Click "Create New Program". Give it a title, a brief description, an overall target goal, and the expected amount from each student.
- **Completing Programs**: Once a program is finished and all expenses are settled, click the **Complete** button on the program's dashboard. This will mark it as inactive so no further contributions can be made, but all historical data will remain accessible.

## 3. Recording Contributions
While students can pay themselves online via Razorpay, you will inevitably have students who hand you cash or pay you directly via a personal UPI transfer.

You must record these manual contributions in the system to keep the ledger accurate:
1. Open the specific Program Dashboard.
2. Under the **Contributors** list, locate the student.
3. Click the **Record Manual Payment** button next to their name.
4. Select the payment method (Cash, UPI, Bank Transfer) and confirm.
   *(This bypasses Razorpay completely and instantly marks them as paid in Firestore).*

## 4. Recording Expenses
Every time you spend money from the collected funds, you must log it to maintain transparency.

1. Open the specific Program Dashboard.
2. Scroll down to the **Expenses** section and click **Add Expense**.
3. Fill in the required details: Title, Amount, Category (e.g., Food, Decoration, Logistics), and an optional description.
4. Click Submit.

> [!CAUTION]  
> The system enforces strict accounting. You **cannot** log an expense if the program's balance is insufficient to cover it (i.e., you cannot spend more money than you have collected).

## 5. Troubleshooting Permissions
If you cannot access the Admin Dashboard and are redirected back to the student view:
1. Ensure you have run `node set-admin-claim.js`.
2. **Log out and log back in**. Firebase caches user roles (custom claims) locally. A fresh login forces the system to download your updated permissions.
