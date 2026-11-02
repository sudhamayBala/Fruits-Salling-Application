import { jsPDF } from "./Frontend/View/node_modules/jspdf/dist/jspdf.es.min.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
const W = 297;
const H = 210;
const M = 14;
const C = {
  navy: [20, 48, 70],
  green: [32, 126, 72],
  pale: [244, 248, 242],
  ink: [39, 52, 60],
  muted: [91, 106, 112],
  line: [214, 224, 220],
  white: [255, 255, 255],
  blue: [222, 237, 245],
  mint: [232, 245, 235],
  gold: [250, 242, 225],
};

function text(value, x, y, size = 9, color = C.ink, font = "normal", options = {}) {
  pdf.setFont("helvetica", font);
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
  pdf.text(value, x, y, options);
}

function paragraph(value, x, y, width, size = 8.5, color = C.ink, leading = 4) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(size);
  const lines = pdf.splitTextToSize(value, width);
  text(lines, x, y, size, color);
  return y + lines.length * leading;
}

function box(x, y, width, height, title, body, fill = C.blue, bodySize = 7.5) {
  pdf.setFillColor(...fill);
  pdf.setDrawColor(...C.line);
  pdf.setLineWidth(0.45);
  pdf.roundedRect(x, y, width, height, 2, 2, "FD");
  text(title, x + width / 2, y + 7, 9, C.navy, "bold", { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(bodySize);
  const lines = pdf.splitTextToSize(body, width - 8);
  text(lines, x + width / 2, y + 13, bodySize, C.ink, "normal", {
    align: "center",
  });
}

function card(x, y, width, height, title, body, fill = C.pale, bodySize = 8) {
  pdf.setFillColor(...fill);
  pdf.setDrawColor(...C.line);
  pdf.setLineWidth(0.45);
  pdf.roundedRect(x, y, width, height, 2, 2, "FD");
  text(title, x + 4, y + 7, 9, C.navy, "bold");
  paragraph(body, x + 4, y + 13, width - 8, bodySize, C.ink, 3.8);
}

function arrow(x1, y1, x2, y2, label = "", color = C.green) {
  pdf.setDrawColor(...color);
  pdf.setLineWidth(0.7);
  pdf.line(x1, y1, x2, y2);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const length = 2.5;
  pdf.line(x2, y2, x2 - length * Math.cos(angle - 0.5), y2 - length * Math.sin(angle - 0.5));
  pdf.line(x2, y2, x2 - length * Math.cos(angle + 0.5), y2 - length * Math.sin(angle + 0.5));
  if (label) {
    text(label, (x1 + x2) / 2, (y1 + y2) / 2 - 2, 6.7, C.muted, "normal", {
      align: "center",
    });
  }
}

function heading(kicker, title, subtitle) {
  pdf.addPage();
  text(kicker.toUpperCase(), M, 14, 8, C.green, "bold");
  text(title, M, 26, 18, C.navy, "bold");
  pdf.setDrawColor(...C.line);
  pdf.line(M, 32, W - M, 32);
  if (subtitle) paragraph(subtitle, M, 40, W - 2 * M, 8, C.muted, 3.8);
}

function step(x, y, number, title, body, width = 60) {
  pdf.setFillColor(...C.green);
  pdf.circle(x + 4, y + 4, 4, "F");
  text(String(number), x + 4, y + 5.2, 7, C.white, "bold", { align: "center" });
  text(title, x + 11, y + 4, 8.2, C.navy, "bold");
  paragraph(body, x + 11, y + 10, width - 12, 7.4, C.ink, 3.5);
}

function urlRow(y, label, url) {
  text(label, M + 3, y, 8, C.navy, "bold");
  text(url, 79, y, 8, C.green);
  pdf.link(79, y - 4, 198, 5, { url });
}

pdf.setFillColor(...C.navy);
pdf.rect(0, 0, W, 26, "F");
text("LOGIN APPLICATION URL", M, 9, 8, [226, 237, 231], "bold");
text("https://fruits-salling-app.vercel.app/login", M, 19, 13, C.white, "bold");
pdf.link(M, 12, 182, 9, {
  url: "https://fruits-salling-app.vercel.app/login",
});

text("INDKAN / FRUIT HOUSE", M, 37, 9, C.green, "bold");
text("Complete Project Architecture", M, 49, 21, C.navy, "bold");
paragraph(
  "React and TypeScript frontend, Python FastAPI APIs, PostgreSQL persistence, client and owner authentication, and persistent product-image storage.",
  M, 57, W - 2 * M, 9, C.ink, 4.2,
);
text("SYSTEM OVERVIEW", M, 78, 8, C.green, "bold");
box(15, 87, 47, 42, "People", "Client / customer\nOwner / admin\nBrowser", C.gold);
box(78, 87, 52, 42, "Web application", "React 19 + TypeScript\nVite single-page app\nReact Router pages", C.blue);
box(146, 87, 69, 42, "FastAPI backend", "Combined Render service\n/api/auth - identities\n/api - fruit operations", [232, 242, 247]);
box(232, 87, 50, 42, "PostgreSQL", "Shared customer,\nauthentication and\nbusiness records", C.gold);
arrow(62, 108, 78, 108, "HTTPS");
arrow(130, 108, 146, 108, "JSON / REST");
arrow(215, 108, 232, 108, "SQL");
box(151, 145, 58, 27, "Product images", "Render persistent disk\nserved at /uploads", C.mint, 7);
arrow(181, 129, 181, 145, "upload");
card(15, 145, 117, 27, "Trust and API boundary", "The browser calls the API; server-side JWT and role checks protect private endpoints.", C.pale, 7.5);
card(220, 145, 62, 27, "ID strategy", "UUID primary IDs; separately issued 6-digit owner employee IDs.", C.pale, 7.2);
text("Architecture and behavior documented from the repository plus the deployment URLs supplied for this document.", M, 188, 7, C.muted);

heading(
  "01 / APPLICATION",
  "Components, responsibilities & data flow",
  "The frontend is a browser SPA. Both backend modules run separately in local Compose and are assembled into one FastAPI app for the Render API deployment.",
);
text("BROWSER / FRONTEND", 17, 58, 8, C.green, "bold");
box(16, 65, 75, 43, "React pages", "Catalog, product details, cart and checkout\nClient profile, messages and orders\nOwner dashboard and management", C.blue);
box(16, 126, 75, 42, "Shared API clients", "Central URL config and JSON requests\nAuth: /api/auth\nFruit: /api", [232, 242, 247]);
arrow(53, 108, 53, 126, "UI actions");

text("FASTAPI BACKEND / RENDER", 111, 58, 8, C.green, "bold");
box(105, 65, 79, 43, "Auth User Content", "Register, login, logout, profiles\nPasswords, roles, employee IDs\nClient-owner messages", [232, 242, 247]);
box(196, 65, 85, 43, "Fruit Content", "Products, categories and images\nOrders, bulk orders and client data\nContracts, distributors, gallery, packaging, status", [232, 242, 247], 7);
box(105, 126, 79, 42, "Shared security / runtime", "PostgreSQL pool and startup\nJWT validation and admin checks\nHealth endpoint: /health", C.mint);
box(196, 126, 85, 42, "Data services", "Async SQLAlchemy models\nUpload directory exposed at /uploads\nError handling and CORS", C.mint);
arrow(91, 86, 105, 86, "REST");
arrow(91, 147, 105, 147, "requests");
arrow(144, 108, 144, 126);
arrow(239, 108, 239, 126);
box(40, 177, 86, 17, "PostgreSQL database", "Shared account + fruit data", C.gold, 6.7);
box(172, 177, 86, 17, "Persistent image storage", "Product upload files", C.gold, 6.7);
arrow(144, 168, 112, 177, "SQL");
arrow(239, 168, 217, 177, "files");

heading(
  "02 / AUTHENTICATION",
  "Client and owner login / registration",
  "Both account types use the same login page and /api/auth/login endpoint. The server recognizes the account type from the email and checks the corresponding credential record.",
);
card(15, 50, 126, 51, "CLIENT ACCOUNT", "Register with a personal Gmail address ending in @gmail.com and a password (8-128 characters). The server creates a customer-role account. Existing clients sign in with that Gmail address and password.", C.blue, 7.8);
card(156, 50, 126, 51, "OWNER / ADMIN ACCOUNT", "An admin first issues a one-time employee ID and matching @indkan.com email. Registration must use that exact, unused email and ID. Successful registration creates an admin-role account. Supported legacy @indikan.com addresses are recognized by login.", C.gold, 7.8);

text("COMMON LOGIN AND AUTHORIZATION FLOW", 16, 115, 8, C.green, "bold");
step(18, 123, 1, "Enter credentials", "Login form posts email + password to /api/auth/login.", 57);
step(80, 123, 2, "Verify identity", "Backend selects the owner/client credential record; verifies salted PBKDF2-SHA256 password hash.", 62);
step(147, 123, 3, "Issue session", "Returns a signed HS256 JWT (7-day expiry); PostgreSQL stores its hash, expiry and revocation state.", 67);
step(219, 123, 4, "Use protected APIs", "Browser stores token in localStorage; sends Bearer token. API checks signature, session and role.", 63);
arrow(70, 127, 80, 127);
arrow(137, 127, 147, 127);
arrow(204, 127, 219, 127);
card(16, 157, 125, 31, "After login", "Admin role routes to /owner; client role routes to /home. Logout calls the API to revoke the session, then clears browser token and role.", C.mint, 7.4);
card(156, 157, 126, 31, "Security and data", "Passwords are never stored as plain text. The server requires a JWT secret of at least 32 bytes. Expired, revoked or invalid sessions cannot access protected routes.", C.pale, 7.4);

heading(
  "03 / IDENTIFIERS",
  "ID generation and account identity",
  "Customer identity, employee-issued IDs, business-record IDs, contract numbers and JWT/session identifiers are distinct values with different purposes.",
);
card(15, 51, 128, 57, "1. Customer account ID", "On registration the backend creates customer_id using Python uuid4() (UUID v4). This UUID is the customer table primary key and is carried in the JWT subject. New business UUID primary keys (for example products, orders and order items) also use uuid4() defaults.", C.blue, 7.7);
card(154, 51, 128, 57, "2. Contract number", "If no contract number is provided, registration derives one from the account ID: CLI- + uppercase UUID hex for clients; OWN- + uppercase UUID hex for admins. This is a separate, human-facing account reference, not the database primary key.", C.gold, 7.7);
card(15, 117, 128, 62, "3. Admin-issued owner employee ID", "An authenticated admin submits employee details. The backend generates a cryptographically secure random six-digit value from 100000-999999, stores it as the employee ID primary key, and retries collisions (up to 100 attempts). It builds an email from normalized first name + joining year + normalized employee type + ID, e.g. first.2026.manager.123456@indkan.com.", C.mint, 7.5);
card(154, 117, 128, 62, "4. One-time use + login", "The employee ID is paired with its generated email in PostgreSQL. Owner registration must match that exact email; the ID is locked and marked used so it cannot be claimed twice. The account receives a UUID customer_id and OWN contract number. Login then uses the issued email and chosen password; employee ID is not a password.", C.pale, 7.5);
text("Also generated: each JWT has a UUID jti; each auth session has its own UUID session_id; uploaded image filenames use random UUID hex.", M, 190, 7, C.muted);

heading(
  "04 / DEPLOYMENT",
  "Hosting, environment URLs & runtime",
  "The listed public URLs are reproduced from the requested references. The client application uses the Vercel site; the API client defaults to the combined Render backend.",
);
urlRow(53, "Login Application URL", "https://fruits-salling-app.vercel.app/login");
urlRow(65, "Primary Project URL", "https://fruits-salling-app.vercel.app/");
urlRow(77, "Target Reference / Web Address", "https://fruits-salling-app.vercel.app/");
urlRow(89, "Production Auth Portal", "https://fruits-salling-o3cqyehzf-sudha19.vercel.app/");
urlRow(101, "Main Vercel Deployment", "https://fruits-salling-app-git-main-sudha19.vercel.app/");
urlRow(113, "Render API Service", "https://fruits-salling-application.onrender.com");
urlRow(125, "Source Repository", "https://github.com/sudhamayBala/e-commerce-website");

card(15, 139, 128, 39, "PRODUCTION", "Vercel serves the React/Vite SPA, including /login, /register, /home and /owner. The frontend calls Render at /api/auth and /api. Render starts one combined FastAPI backend, checks /health, connects to PostgreSQL via DATABASE_URL and stores uploads on a persistent disk.", C.blue, 7.5);
card(154, 139, 128, 39, "LOCAL DEVELOPMENT", "Docker Compose runs frontend :2000, auth API :3000, fruit API :4000 and pgAdmin :5050. Both APIs share PostgreSQL on :5432. Render variables include DATABASE_URL, JWT_SECRET and CORS_ORIGINS; secrets belong in private environment settings.", C.mint, 7.5);
text("Some frontend utilities persist cart/order-history and selected dashboard state in browser localStorage; those local values are not all synchronized to PostgreSQL.", M, 188, 7, C.muted);

for (let page = 1; page <= pdf.getNumberOfPages(); page += 1) {
  pdf.setPage(page);
  pdf.setDrawColor(...C.line);
  pdf.line(M, H - 12, W - M, H - 12);
  text("INDKAN | Complete Project Architecture", M, H - 6, 7, C.muted);
  text(`${page} / ${pdf.getNumberOfPages()}`, W - M, H - 6, 7, C.muted, "normal", {
    align: "right",
  });
}

const output = fileURLToPath(
  new URL("./docs/INDKAN-Project-Architecture.pdf", import.meta.url),
);
mkdirSync(fileURLToPath(new URL("./docs/", import.meta.url)), { recursive: true });
writeFileSync(output, Buffer.from(pdf.output("arraybuffer")));
console.log(`Created ${output} (${pdf.getNumberOfPages()} pages)`);
