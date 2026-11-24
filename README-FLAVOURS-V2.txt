FLAVOURS BUSINESS MANAGER V2.2 – SECURITY EDITION

INSTALLATION (Windows folder / file://)
1. Back up your current business records from Backup & Restore.
2. Close the application tab.
3. Keep a copy of your existing app.js and index.html.
4. Replace app.js with flavours-business-manager-v2.js, renaming the new file to app.js.
5. Keep index.html in its original folder and do not change the browser profile.
6. Open index.html. On first launch, create an administrator PIN (minimum 4 characters).
7. Sign in with that administrator PIN, then open Staff and create cashier accounts with unique PINs.

CASHIER PERMISSIONS
Cashiers can access Point of Sale, Customers, and Cash Closing. They can add customers, scan/search products, process sales and print receipts. They cannot access inventory management, suppliers, purchases, expenses, reports, staff, settings, local backup/restore, or cloud backup/restore. Discounts require the administrator PIN for approval. Product, customer and supplier deletion and other restricted operations require administrator access.

ADMINISTRATOR
The administrator has access to all modules. Keep the administrator PIN private. Create staff accounts from Staff and assign role Cashier or Admin.

DATA PRESERVATION
The app retains the existing V2.1 localStorage key and V1.9 migration path. It does not intentionally clear existing records. Always keep a separate JSON backup before upgrading. Open the upgraded app in the same browser profile and same origin/folder as before; changing browser or origin can make localStorage appear missing.

SECURITY LIMITATION
This is a client-side, offline browser application. PINs and permissions provide application-level access control, not tamper-proof security. A technically skilled user with access to the computer/browser developer tools or local files may bypass client-side controls. For stronger security across multiple computers/users, use a properly hosted backend with server-enforced authentication and permissions. Do not use the same PIN for multiple staff members.

CLOUD SERVER
flavours-cloud-sync-server.js is a separate optional Node.js server component. It is not app.js and is not needed for offline use. Cloud sync requires deployment, HTTPS and server configuration.

INSTALLING THE APP
For local development, run `npm install` once and then `npm run dev`. Open the local URL printed by Vite (normally http://127.0.0.1:5173). The app can be installed as a Progressive Web App on supported desktop and Android browsers from HTTPS or localhost; use the Install app prompt or the browser's install option. Opening index.html directly as a file remains usable but cannot install the app.
On iPhone or iPad, open the HTTPS app in Safari, tap Share, then choose Add to Home Screen. iOS does not allow websites to launch the native install prompt automatically. Once installed, the app shell is available offline; business records remain stored in that browser's local storage.
