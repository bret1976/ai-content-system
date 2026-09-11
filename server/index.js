/**
 * ReadyBatch — Express server
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

/** Run pack generator for an order; mutates + persists order. Returns { ok, pack_path?, error? }. */
function runPackGeneration(order) {
  const slug = order.client_slug || slugify(order.client_name);
  const outDir = path.join(CLIENTS_DIR, slug);
  const intakeFile = path.join(ORDERS_DIR, `${order.order_id}.intake.json`);
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
    return { ok: false, error: order.generate_error };
  }

  const rel = path.relative(ROOT, outDir);
  order.status = "pack_ready";
  order.pack_path = rel;
  order.generate_error = null;
  order.updated_at = new Date().toISOString();
  order.generate_log = (result.stdout || "").slice(0, 2000);
  writeOrder(order);

  return { ok: true, pack_path: rel, absolute_pack_path: outDir, stdout: result.stdout };
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

  // Auto-run pack generation (same logic as POST /api/generate)
  const gen = runPackGeneration(order);

  if (gen.ok) {
    return res.status(201).json({
      ok: true,
      order_id,
      status: "pack_ready",
      pack_path: gen.pack_path,
      message:
        "Intake received and pack generated. Drive + Gmail delivery is next.",
    });
  }

  // Generate failed: still 201 — intake is saved; report generate_error
  return res.status(201).json({
    ok: true,
    order_id,
    status: "intake_received",
    generate_error: gen.error,
    message:
      "Intake received. Pack generation failed — we'll retry. You'll get Drive + Gmail delivery when the pack is ready.",
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

  const gen = runPackGeneration(order);

  if (!gen.ok) {
    return res.status(500).json({
      ok: false,
      order_id,
      error: "generate_pack failed",
      detail: gen.error,
    });
  }

  res.json({
    ok: true,
    order_id,
    status: order.status,
    pack_path: gen.pack_path,
    absolute_pack_path: gen.absolute_pack_path,
    stdout: gen.stdout,
  });
});

app.post("/api/deliver", (req, res) => {
  const body = req.body || {};
  const { order_id, drive_folder_url } = body;
  if (!order_id) {
    return res.status(400).json({ ok: false, error: "order_id required" });
  }
  if (!drive_folder_url) {
    return res.status(400).json({ ok: false, error: "drive_folder_url required" });
  }

  const order = readOrder(order_id);
  if (!order) {
    return res.status(404).json({ ok: false, error: "order not found" });
  }

  const now = new Date().toISOString();
  order.status = "delivered";
  order.drive_folder_url = drive_folder_url;
  order.delivered_at = now;
  order.updated_at = now;
  writeOrder(order);

  res.json({
    ok: true,
    order_id,
    status: order.status,
    drive_folder_url: order.drive_folder_url,
    delivered_at: order.delivered_at,
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
      drive_folder_url: o.drive_folder_url || null,
      delivered_at: o.delivered_at || null,
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
  console.log(`ReadyBatch listening on :${PORT}`);
  console.log(`  site: ${SITE}`);
  console.log(`  fulfillment: ${FULFILLMENT}`);
  console.log(`  orders: ${ORDERS_DIR}`);
});
