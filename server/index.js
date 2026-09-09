/**
 * AI Content System Install — Express server
 * Serves site/ static files + intake/generate APIs.
 * Railway: root Dockerfile or Procfile runs `node server/index.js` from repo root,
 * or set Railway Root Directory to server/ and start `npm start`.
 */
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { spawnSync } = require("child_process");

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, "..");
const SITE = path.join(ROOT, "site");
const FULFILLMENT = path.join(ROOT, "fulfillment");
const ORDERS_DIR = path.join(__dirname, "orders");
const CLIENTS_DIR = path.join(FULFILLMENT, "clients");
const GENERATOR = path.join(FULFILLMENT, "generate_pack.py");

const REQUIRED = [
  "client_name",
  "email",
  "niche",
  "offer",
  "icp",
  "primary_platform",
  "sample_links",
  "tone_keywords",
  "cta_preference",
  "tier",
];
const PLATFORMS = new Set(["linkedin", "x", "ig"]);
const TIERS = new Set(["starter", "standard", "dwy"]);

fs.mkdirSync(ORDERS_DIR, { recursive: true });
fs.mkdirSync(CLIENTS_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function slugify(name) {
  return String(name || "client")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "client";
}

function validateIntake(body) {
  const errs = [];
  for (const k of REQUIRED) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      errs.push(`missing: ${k}`);
    }
  }
  if (body.primary_platform && !PLATFORMS.has(body.primary_platform)) {
    errs.push("primary_platform must be linkedin|x|ig");
  }
  if (body.tier && !TIERS.has(body.tier)) {
    errs.push("tier must be starter|standard|dwy");
  }
  if (body.sample_links && !Array.isArray(body.sample_links)) {
    errs.push("sample_links must be an array");
  }
  if (body.tone_keywords && !Array.isArray(body.tone_keywords)) {
    errs.push("tone_keywords must be an array");
  }
  if (Array.isArray(body.sample_links) && body.sample_links.length < 1) {
    errs.push("sample_links needs at least 1 item");
  }
  if (Array.isArray(body.tone_keywords) && body.tone_keywords.length < 1) {
    errs.push("tone_keywords needs at least 1 item");
  }
  return errs;
}

function orderPath(id) {
  return path.join(ORDERS_DIR, `${id}.json`);
}

function readOrder(id) {
  const p = orderPath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeOrder(order) {
  fs.writeFileSync(orderPath(order.order_id), JSON.stringify(order, null, 2));
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ai-content-system",
    time: new Date().toISOString(),
    python: fs.existsSync(GENERATOR),
  });
});

app.post("/api/intake", (req, res) => {
  const body = req.body || {};
  const errs = validateIntake(body);
  if (errs.length) {
    return res.status(400).json({ ok: false, errors: errs });
  }

  const order_id = `ord_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const client_slug = body.client_slug || slugify(body.client_name);
  const now = new Date().toISOString();

  const order = {
    order_id,
    status: "intake_received",
    created_at: now,
    updated_at: now,
    client_slug,
    tier: body.tier,
    email: body.email,
    client_name: body.client_name,
    intake: {
      ...body,
      client_slug,
    },
    pack_path: null,
    generate_error: null,
  };

  writeOrder(order);

  // Also drop a copy under fulfillment for ops visibility
  const intakeCopyDir = path.join(CLIENTS_DIR, "_intakes");
  fs.mkdirSync(intakeCopyDir, { recursive: true });
  fs.writeFileSync(
    path.join(intakeCopyDir, `${order_id}.json`),
    JSON.stringify(order.intake, null, 2)
  );

  res.status(201).json({
    ok: true,
    order_id,
    status: order.status,
    message:
      "Intake received. We start the 72h clock now. You'll get Drive + Gmail delivery when the pack is ready.",
    next: `POST /api/generate {"order_id":"${order_id}"}`,
  });
});

app.post("/api/generate", (req, res) => {
  const order_id = (req.body || {}).order_id;
  if (!order_id) {
    return res.status(400).json({ ok: false, error: "order_id required" });
  }
  const order = readOrder(order_id);
  if (!order) {
    return res.status(404).json({ ok: false, error: "order not found" });
  }

  const slug = order.client_slug || slugify(order.client_name);
  const outDir = path.join(CLIENTS_DIR, slug);
  const intakeFile = path.join(ORDERS_DIR, `${order_id}.intake.json`);
  fs.writeFileSync(intakeFile, JSON.stringify(order.intake, null, 2));

  const result = spawnSync(
    "python3",
    [GENERATOR, intakeFile, "--out-dir", outDir],
    { encoding: "utf8", timeout: 60_000 }
  );

  if (result.status !== 0) {
    order.status = "generate_failed";
    order.generate_error = (result.stderr || result.stdout || "unknown error").slice(0, 2000);
    order.updated_at = new Date().toISOString();
    writeOrder(order);
    return res.status(500).json({
      ok: false,
      order_id,
      error: "generate_pack failed",
      detail: order.generate_error,
    });
  }

  const rel = path.relative(ROOT, outDir);
  order.status = "pack_ready";
  order.pack_path = rel;
  order.generate_error = null;
  order.updated_at = new Date().toISOString();
  order.generate_log = (result.stdout || "").slice(0, 2000);
  writeOrder(order);

  res.json({
    ok: true,
    order_id,
    status: order.status,
    pack_path: rel,
    absolute_pack_path: outDir,
    stdout: result.stdout,
  });
});

app.get("/api/orders", (_req, res) => {
  const files = fs
    .readdirSync(ORDERS_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".intake.json"));
  const orders = files
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(ORDERS_DIR, f), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  res.json({
    ok: true,
    count: orders.length,
    orders: orders.map((o) => ({
      order_id: o.order_id,
      status: o.status,
      client_name: o.client_name,
      email: o.email,
      tier: o.tier,
      created_at: o.created_at,
      pack_path: o.pack_path,
    })),
  });
});

app.get("/api/orders/:id", (req, res) => {
  const order = readOrder(req.params.id);
  if (!order) return res.status(404).json({ ok: false, error: "not found" });
  res.json({ ok: true, order });
});

// Static site (index.html, intake.html, …)
app.use(express.static(SITE));

// Fallback
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "not found" });
  }
  res.status(404).send("Not found");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Content System listening on :${PORT}`);
  console.log(`  site: ${SITE}`);
  console.log(`  fulfillment: ${FULFILLMENT}`);
  console.log(`  orders: ${ORDERS_DIR}`);
});
