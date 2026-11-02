import { jsPDF } from "../Frontend/View/node_modules/jspdf/dist/jspdf.es.min.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const W = 210;
const H = 297;
const M = 15;
const C = {
  navy: [20, 48, 70],
  green: [32, 126, 72],
  orange: [232, 142, 42],
  pale: [244, 248, 242],
  ink: [39, 52, 60],
  muted: [91, 106, 112],
  line: [214, 224, 220],
  white: [255, 255, 255],
  blue: [222, 237, 245],
};

function text(value, x, y, size = 10, color = C.ink, font = "normal", options = {}) {
  pdf.setFont("helvetica", font);
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
  pdf.text(value, x, y, options);
}

function wrap(value, width, size = 10, font = "normal") {
  pdf.setFont("helvetica", font);
  pdf.setFontSize(size);
  return pdf.splitTextToSize(value, width);
}

function paragraph(value, x, y, width, size = 9.5, color = C.ink, leading = 4.5) {
  const lines = wrap(value, width, size);
  text(lines, x, y, size, color);
  return y + lines.length * leading;
}

function heading(value, x, y, size = 16) {
  text(value, x, y, size, C.navy, "bold");
  pdf.setDrawColor(...C.orange);
  pdf.setLineWidth(1);
  pdf.line(x, y + 3, x + 25, y + 3);
  return y + 10;
}

function bullet(value, x, y, width, size = 9.3) {
  pdf.setFillColor(...C.green);
  pdf.circle(x + 1.3, y - 1.1, 1, "F");
  return paragraph(value, x + 5, y, width - 5, size, C.ink, 4.35) + 2;
}

function card(x, y, width, height, title, body, fill = C.pale) {
  pdf.setFillColor(...fill);
  pdf.setDrawColor(...C.line);
  pdf.roundedRect(x, y, width, height, 3, 3, "FD");
  text(title, x + 4, y + 7, 10, C.navy, "bold");
  paragraph(body, x + 4, y + 13, width - 8, 8.5, C.ink, 4);
}

function newPage(title, kicker) {
  pdf.addPage();
  text(kicker.toUpperCase(), M, 14, 8, C.green, "bold");
  text(title, M, 23, 19, C.navy, "bold");
  pdf.setDrawColor(...C.line);
  pdf.line(M, 28, W - M, 28);
}

function footer() {
  for (let page = 1; page <= pdf.getNumberOfPages(); page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...C.line);
    pdf.line(M, H - 13, W - M, H - 13);
    text("INDKAN | App guide & functional architecture", M, H - 7, 7.5, C.muted);
    text(`${page} / ${pdf.getNumberOfPages()}`, W - M, H - 7, 7.5, C.muted, "normal", { align: "right" });
  }
}

function arrow(x1, y1, x2, y2, label = "") {
  pdf.setDrawColor(...C.green);
  pdf.setLineWidth(0.8);
  pdf.line(x1, y1, x2, y2);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const length = 3;
  pdf.line(x2, y2, x2 - length * Math.cos(angle - 0.5), y2 - length * Math.sin(angle - 0.5));
  pdf.line(x2, y2, x2 - length * Math.cos(angle + 0.5), y2 - length * Math.sin(angle + 0.5));
  if (label) text(label, (x1 + x2) / 2 + 2, (y1 + y2) / 2, 7, C.muted);
}

function box(x, y, width, height, title, lines, fill = C.blue) {
  pdf.setFillColor(...fill);
  pdf.setDrawColor(...C.green);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(x, y, width, height, 2, 2, "FD");
  text(title, x + width / 2, y + 6, 9, C.navy, "bold", { align: "center" });
  let lineY = y + 12;
  for (const line of lines) {
    text(line, x + width / 2, lineY, 7.2, C.ink, "normal", { align: "center" });
    lineY += 4;
  }
}

// Cover
pdf.setFillColor(...C.navy);
pdf.rect(0, 0, W, 82, "F");
text("INDKAN", M, 25, 11, C.white, "bold");
text("APPLICATION GUIDE", M, 42, 23, C.white, "bold");
text("Login, daily workflows & internal architecture", M, 53, 11, [226, 237, 231]);
pdf.setFillColor(...C.orange);
pdf.roundedRect(M, 64, 42, 1.8, 1, 1, "F");
text("Practical guide for clients and owner administrators", M, 75, 8, [226, 237, 231]);
heading("Start here", M, 101, 17);
paragraph(
  "This guide explains how to use the INDKAN fruit sales application, how client and owner accounts differ, and how the browser, APIs and database work together.",
  M, 112, W - 2 * M, 10, C.ink, 5,
);
card(M, 139, 86, 42, "CLIENTS", "Create a client account with a Gmail address, browse products, place orders, follow order updates and message the business.");
card(109, 139, 86, 42, "OWNERS / ADMINS", "Sign in with an issued owner account to manage the catalog, orders, clients, distributors, packaging, exports, messages and employee IDs.");
heading("Quick links", M, 199, 14);
let y = 211;
y = bullet("Production sign-in: https://fruits-salling-app.vercel.app/login", M, y, W - 2 * M);
y = bullet("Owner area after successful admin sign-in: /owner", M, y, W - 2 * M);
y = bullet("Local development sign-in: http://localhost:2000/login (only while the local frontend server is running)", M, y, W - 2 * M);
y = bullet("Public pages include Home, Products, About, Packaging, Gallery and Contact. Sign-in is required for account-specific actions.", M, y, W - 2 * M);
card(M, 254, W - 2 * M, 24, "SECURITY FIRST", "Never share passwords, database URLs, JWT secrets or Render environment values. This guide contains no credentials.", [250, 242, 225]);

// Accounts and access
newPage("Accounts, registration & login", "01 / ACCESS");
let yy = 43;
text("Client account", M, yy, 12, C.green, "bold");
yy += 8;
yy = bullet("Choose Create an account on the sign-in page. Register with your name, Gmail address and a private password; phone and address are optional.", M, yy, W - 2 * M);
yy = bullet("After registration, sign in with the same email and password. Client accounts are routed to /home.", M, yy, W - 2 * M);
yy = bullet("Use the account menu to reach your account actions. Sign out when finished on shared devices.", M, yy, W - 2 * M);
yy += 5;
text("Owner / administrator account", M, yy, 12, C.green, "bold");
yy += 8;
yy = bullet("Owner registration requires an unused owner employee ID issued by an administrator. A guessed or previously used ID is rejected; do not bypass this validation.", M, yy, W - 2 * M);
yy = bullet("The first owner can be provisioned by an authorized operator using the temporary, protected server-side bootstrap variables documented in Backend/README.md. Bootstrap creates the account only if the email is absent; it does not reset an existing password.", M, yy, W - 2 * M);
yy = bullet("After bootstrap is confirmed in backend logs, remove the bootstrap variables and redeploy. Do not use shared or universal passwords.", M, yy, W - 2 * M);
yy = bullet("At sign-in, enter the issued owner email and the password chosen for that account. The app routes role=admin users to /owner; other users go to /home.", M, yy, W - 2 * M);
yy += 4;
card(M, yy, 88, 39, "If registration rejects an owner ID", "Check with an authorized admin that the ID was issued, is unused, and matches the exact generated email.");
card(108, yy, 87, 39, "If login is denied", "Check email spelling, account creation and password. Ask the administrator to confirm account status or use authorized password recovery.");
yy += 49;
text("What happens internally", M, yy, 11, C.navy, "bold");
yy += 7;
paragraph(
  "The frontend sends email/password to the authentication API. The backend verifies the stored password hash, creates a time-limited access token and session record, and returns the user role. Authenticated requests send the token to protected API routes. Logout revokes the session and clears the browser's saved token.",
  M, yy, W - 2 * M, 9.2, C.ink, 4.5,
);

// Day-to-day workflows
newPage("Using the app day to day", "02 / WORKFLOWS");
let y2 = 43;
const tasks = [
  ["Browse the catalog", "Open Products, browse the available fruit and packaging information, then open a product for its details."],
  ["Place and follow an order", "Add desired items to the cart, proceed through checkout, and use the order/status pages to review progress. Exact payment options depend on the configured deployment."],
  ["Contact the business", "Use Contact for inquiries. Signed-in users can use Messages / Client messages for direct communication when enabled for their account."],
  ["Owner dashboard", "After admin sign-in open /owner. Use its navigation for Dashboard, Orders, Products, Add product, Clients, Distributors, Packaging, Coming soon, Messages, Exports and Settings."],
  ["Manage products", "In Products or Add product, review the catalog and use the available create/edit/deactivate controls. Product image upload is handled by the backend."],
  ["Manage orders and shipment status", "Use Orders to review orders and update permitted order states. Use Exports for shipment records/status; follow the UI prompts and verify saved changes."],
  ["Manage employees", "Employee Settings is for authorized admin issuance of employee IDs. Issue an ID before an owner registration; download and retain generated documents securely."],
  ["Sign out", "Use Logout in the owner navigation or account controls. On shared computers, verify you return to sign-in."],
];
for (const [title, body] of tasks) {
  text(title, M, y2, 10.5, C.navy, "bold");
  y2 = paragraph(body, M + 2, y2 + 5, W - 2 * M - 2, 8.8, C.ink, 4.1) + 5;
}
card(M, 261, W - 2 * M, 23, "Access rule", "Owner data and management operations require an authenticated admin role. A direct visit to /owner is not a substitute for signing in.");

// Architecture diagram
newPage("Internal functional architecture", "03 / SYSTEM MAP");
paragraph(
  "Production is served as a React single-page application calling the combined FastAPI backend. Authenticated APIs enforce user/admin permissions. PostgreSQL stores account, catalog and business records; uploaded product images use the configured persistent storage path.",
  M, 39, W - 2 * M, 8.7, C.ink, 4.1,
);
box(17, 63, 51, 25, "Client / owner browser", ["Routes, forms, UI"], [250, 242, 225]);
box(79, 63, 53, 25, "React + Vite frontend", ["Pages, state, API client"], C.blue);
box(143, 63, 50, 25, "Identity token", ["Bearer token for APIs"], [232, 245, 235]);
arrow(68, 75, 79, 75, "HTTPS");
arrow(132, 75, 143, 75, "auth");
pdf.setFillColor(245, 249, 247);
pdf.setDrawColor(...C.line);
pdf.roundedRect(17, 104, 176, 77, 3, 3, "FD");
text("COMBINED BACKEND / FastAPI on Render", 105, 112, 10, C.navy, "bold", { align: "center" });
box(23, 120, 79, 50, "Authentication & user APIs", ["Register / login / logout", "Profile, password, messages", "Admin employee-ID issuance"], [232, 242, 247]);
box(108, 120, 79, 50, "Fruit business APIs", ["Products, images, categories", "Cart / orders / bulk orders", "Gallery, packaging, exports"], [232, 242, 247]);
arrow(104, 88, 104, 103, "JSON / REST");
arrow(63, 170, 63, 190, "SQL");
arrow(147, 170, 147, 190, "SQL / files");
box(24, 194, 81, 39, "PostgreSQL database", ["Users / hashes / sessions", "Products, orders, messages"], [250, 242, 225]);
box(111, 194, 78, 39, "Persistent uploads", ["Product image files", "Storage depends on deployment"], [250, 242, 225]);
text("Shared authorization helpers validate tokens and enforce admin-only operations.", 105, 246, 8.2, C.muted, "normal", { align: "center" });
card(M, 255, W - 2 * M, 24, "Local vs production", "Local Docker can run separate auth and fruit APIs. Render runs a combined backend service. Both patterns use PostgreSQL; keep database credentials and JWT_SECRET in private environment settings.");

// Troubleshooting and security
newPage("Troubleshooting & safe operation", "04 / OPERATIONS");
let y3 = 43;
const issues = [
  ["Local page says ERR_CONNECTION_REFUSED", "The Vite server is stopped or port 2000 is unavailable. Start the frontend from the project: npm run dev --prefix Frontend\\View -- --port 2000. Then reopen http://localhost:2000/login."],
  ["Owner registration says ID invalid or already used", "The supplied employee ID has not been issued, is already consumed, or does not match the issued email. An authorized admin must issue a valid ID, or provision the initial owner via the protected bootstrap path."],
  ["Render shows Application startup failed", "Open the failed deployment logs and inspect the first exception/traceback above the generic summary. Check required environment variables and database connectivity. Never paste secrets into support chats."],
  ["Login returns invalid email or password", "Confirm the correct account type and exact email. Owner login requires the owner credential record. Bootstrap does not overwrite existing accounts or reset passwords. Use authorized recovery if the account already exists."],
  ["Images or APIs fail after deploy", "Check the backend health endpoint, Render service status, frontend API base URL and CORS origins. Frontend environment changes usually require a frontend rebuild/redeploy."],
];
for (const [title, body] of issues) {
  text(title, M, y3, 10, C.navy, "bold");
  y3 = paragraph(body, M + 2, y3 + 5, W - 2 * M - 2, 8.6, C.ink, 4) + 5;
}
y3 += 1;
text("Security checklist", M, y3, 11, C.green, "bold");
y3 += 7;
y3 = bullet("Use unique passwords; rotate any credential exposed in screenshots, chat or source.", M, y3, W - 2 * M, 8.5);
y3 = bullet("Keep .env files, DATABASE_URL, DB passwords and JWT_SECRET out of Git and documentation.", M, y3, W - 2 * M, 8.5);
y3 = bullet("Keep owner bootstrap disabled except during a planned first-owner setup. Remove bootstrap variables once account creation is confirmed.", M, y3, W - 2 * M, 8.5);
y3 = bullet("Use HTTPS in production; grant administrator access only to trusted staff.", M, y3, W - 2 * M, 8.5);
text("Reference: Backend/README.md contains deployment, Docker, bootstrap and API setup details.", M, 278, 8, C.muted);

footer();
const output = resolve("docs/INDKAN-App-User-Guide-and-Architecture.pdf");
mkdirSync(resolve("docs"), { recursive: true });
writeFileSync(output, Buffer.from(pdf.output("arraybuffer")));
console.log(`Created ${output} (${pdf.getNumberOfPages()} pages)`);
