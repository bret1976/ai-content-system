/**
 * ReadyBatch — fulfillment server
 * Serves site/, accepts intake, generates packs, zips delivery.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');
const archiver = require('archiver');

const {
  generatePack,
  normalizeIntake,
  validate,
  asArray,
} = require('./lib/generatePack');

const ROOT = path.resolve(__dirname);
const MONEY_ROOT = path.resolve(ROOT, '..');
const SITE_DIR = path.join(MONEY_ROOT, 'site');
const ORDERS_DIR = path.join(ROOT, 'data', 'orders');
const PACKS_DIR = path.join(ROOT, 'data', 'packs');
const PYTHON_GEN = path.join(MONEY_ROOT, 'fulfillment', 'generate_pack.py');

const PORT = Number(process.env.PORT) || 3000;

fs.mkdirSync(ORDERS_DIR, { recursive: true });
fs.mkdirSync(PACKS_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS for local / preview
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'money-machine-fulfillment',
    python_generator: fs.existsSync(PYTHON_GEN),
    node_fallback: true,
    time: new Date().toISOString(),
  });
});

function orderPath(id) {
  return path.join(ORDERS_DIR, `${id}.json`);
}

function packDir(id) {
  return path.join(PACKS_DIR, id);
}

function packZipPath(id) {
  return path.join(PACKS_DIR, `${id}.zip`);
}

function readOrder(id) {
  const p = orderPath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeOrder(order) {
  fs.writeFileSync(orderPath(order.id), JSON.stringify(order, null, 2));
  return order;
}

function zipDirectory(sourceDir, outZip) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
    const output = fs.createWriteStream(outZip);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve({ bytes: archive.pointer(), path: outZip }));
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

function runPythonGenerator(intakePath, outDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'python3',
      [PYTHON_GEN, intakePath, '--out-dir', outDir],
      { cwd: path.dirname(PYTHON_GEN) }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr, engine: 'python' });
      else reject(new Error(`python generate_pack exited ${code}: ${stderr || stdout}`));
    });
  });
}

/**
 * Prefer Python if present; always have Node fallback.
 * FORCE_NODE_GENERATOR=1 skips Python (useful for standalone tests).
 */
async function runPackGeneration(intake, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const usePython =
    process.env.FORCE_NODE_GENERATOR !== '1' && fs.existsSync(PYTHON_GEN);

  if (usePython) {
    try {
      const tmpIntake = path.join(outDir, '_intake_input.json');
      fs.writeFileSync(tmpIntake, JSON.stringify(intake, null, 2));
      await runPythonGenerator(tmpIntake, outDir);
      const files = fs.readdirSync(outDir).filter((f) => f !== '_intake_input.json').sort();
      // Ensure intake.json exists
      if (!fs.existsSync(path.join(outDir, 'intake.json'))) {
        fs.writeFileSync(path.join(outDir, 'intake.json'), JSON.stringify(intake, null, 2));
      }
      try {
        fs.unlinkSync(tmpIntake);
      } catch (_) {}
      return { outDir, files, engine: 'python' };
    } catch (err) {
      console.warn('[generate] Python failed, falling back to Node:', err.message);
    }
  }

  return generatePack(intake, outDir);
}

async function fulfillOrder(order) {
  order.status = 'generating';
  order.updated_at = new Date().toISOString();
  writeOrder(order);

  const outDir = packDir(order.id);
  // Clean previous pack dir files but keep folder
  if (fs.existsSync(outDir)) {
    for (const f of fs.readdirSync(outDir)) {
      fs.rmSync(path.join(outDir, f), { recursive: true, force: true });
    }
  } else {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const result = await runPackGeneration(order.intake, outDir);
  const zip = await zipDirectory(outDir, packZipPath(order.id));

  order.status = 'ready';
  order.pack_dir = outDir;
  order.pack_zip = zip.path;
  order.pack_files = result.files;
  order.engine = result.engine;
  order.zip_bytes = zip.bytes;
  order.updated_at = new Date().toISOString();
  writeOrder(order);
  return order;
}

app.post('/api/intake', async (req, res) => {
  try {
    const body = req.body || {};
    const intake = normalizeIntake({
      client_name: body.client_name,
      email: body.email,
      niche: body.niche,
      offer: body.offer,
      icp: body.icp,
      primary_platform: body.primary_platform,
      sample_links: body.sample_links,
      tone_keywords: body.tone_keywords,
      cta_preference: body.cta_preference,
      tier: body.tier,
      handle: body.handle,
      client_slug: body.client_slug,
      notes: body.notes,
    });

    const errs = validate(intake);
    if (errs.length) {
      return res.status(400).json({ ok: false, errors: errs });
    }

    const id = randomUUID();
    const order = {
      id,
      status: 'received',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      intake,
      pack_dir: null,
      pack_zip: null,
      pack_files: [],
      engine: null,
    };
    writeOrder(order);

    // Immediate pack generation
    const fulfilled = await fulfillOrder(order);
    return res.status(201).json({
      ok: true,
      id: fulfilled.id,
      status: fulfilled.status,
      pack_dir: fulfilled.pack_dir,
      pack_zip: fulfilled.pack_zip,
      pack_files: fulfilled.pack_files,
      engine: fulfilled.engine,
    });
  } catch (err) {
    console.error('[api/intake]', err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.post('/api/fulfill/:id', async (req, res) => {
  try {
    const order = readOrder(req.params.id);
    if (!order) return res.status(404).json({ ok: false, error: 'order not found' });
    const fulfilled = await fulfillOrder(order);
    return res.json({
      ok: true,
      id: fulfilled.id,
      status: fulfilled.status,
      pack_dir: fulfilled.pack_dir,
      pack_zip: fulfilled.pack_zip,
      pack_files: fulfilled.pack_files,
      engine: fulfilled.engine,
    });
  } catch (err) {
    console.error('[api/fulfill]', err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get('/api/orders/:id', (req, res) => {
  const order = readOrder(req.params.id);
  if (!order) return res.status(404).json({ ok: false, error: 'order not found' });
  return res.json({
    ok: true,
    id: order.id,
    status: order.status,
    pack_dir: order.pack_dir,
    pack_zip: order.pack_zip,
    pack_path: order.pack_dir,
    pack_files: order.pack_files,
    engine: order.engine,
    created_at: order.created_at,
    updated_at: order.updated_at,
    intake: {
      client_name: order.intake.client_name,
      email: order.intake.email,
      tier: order.intake.tier,
      primary_platform: order.intake.primary_platform,
    },
  });
});

app.get('/api/packs/:id.zip', (req, res) => {
  const z = packZipPath(req.params.id);
  if (!fs.existsSync(z)) return res.status(404).json({ ok: false, error: 'zip not found' });
  res.download(z, `${req.params.id}.zip`);
});

// Static site (landing + intake)
if (fs.existsSync(SITE_DIR)) {
  app.use(express.static(SITE_DIR, { extensions: ['html'] }));
} else {
  console.warn('[server] site dir missing:', SITE_DIR);
}

// Friendly root if index missing
app.get('/', (_req, res, next) => {
  const index = path.join(SITE_DIR, 'index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  return res.type('text').send('Money Machine fulfillment API. See /health and /intake.html');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[money-machine] listening on :${PORT}`);
  console.log(`[money-machine] site: ${SITE_DIR}`);
  console.log(`[money-machine] python generator: ${fs.existsSync(PYTHON_GEN) ? PYTHON_GEN : 'none (node fallback)'}`);
});
