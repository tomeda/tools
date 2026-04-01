const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// ── CORS & body parsing ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

// ── Static file serving ──────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ── Offer number ─────────────────────────────────────────────────────────────
let offerNumber = 1521;
const offerNumberFile = path.join(__dirname, 'offerNumber.json');
const historyFile     = path.join(__dirname, 'offers-history.json');

// Load offer number from file on start
try {
  const data = JSON.parse(fs.readFileSync(offerNumberFile, 'utf8'));
  offerNumber = data.offerNumber;
  console.log(`✅ Offer number loaded: ${offerNumber}`);
} catch (e) {
  console.warn('⚠️  Could not read offerNumber.json, starting from 1521.');
  saveOfferNumber();
}

function saveOfferNumber() {
  fs.writeFileSync(offerNumberFile, JSON.stringify({ offerNumber }, null, 2));
}

// GET current offer number
app.get('/offerNumber', (req, res) => {
  res.json({ offerNumber });
});

// POST increment offer number + log to history
app.post('/incrementOffer', (req, res) => {
  const previous = offerNumber;
  offerNumber++;
  saveOfferNumber();

  // Log to history
  let history = [];
  try { history = JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch (e) { /* first time */ }
  history.push({
    offerNumber: previous,
    incrementedAt: new Date().toISOString()
  });
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

  console.log(`📋 Offer #${previous} finalised. Next: #${offerNumber}`);
  res.json({ success: true, previous, next: offerNumber });
});

// GET offer history
app.get('/history', (req, res) => {
  try {
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    res.json(history);
  } catch (e) {
    res.json([]);
  }
});

// ── PDF Generation (puppeteer) ────────────────────────────────────────────────
app.post('/generate-pdf', async (req, res) => {
  const { offerNumber: num, clientName } = req.body;

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    return res.json({
      success: false,
      error: 'Puppeteer не е инсталиран. Изпълни: npm install puppeteer'
    });
  }

  // Build output filename
  const safe = (clientName || 'оферта').replace(/[^а-яА-ЯёЁa-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '_');
  const filename = `TOMEDA_Оферта_${num}_${safe}.pdf`;
  const offersDir = path.join(__dirname, 'offers');
  if (!fs.existsSync(offersDir)) fs.mkdirSync(offersDir);
  const outputPath = path.join(offersDir, filename);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Open template via local server
    await page.goto(`http://localhost:${PORT}/template.html`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for the generator to render
    await page.waitForTimeout(2000);

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });

    await browser.close();

    // Log the PDF generation to history
    let history = [];
    try { history = JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch (e) {}
    history.push({
      offerNumber: num,
      clientName: clientName || '—',
      pdfFile: filename,
      generatedAt: new Date().toISOString()
    });
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

    console.log(`📄 PDF created: ${outputPath}`);
    res.json({ success: true, file: outputPath });

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('PDF error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║        ТОМЕДА ОФЕРТА - СЪРВЪР v2.0           ║');
  console.log(`║  Отвори: http://localhost:${PORT}/template.html  ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`📋 Текущ номер на оферта: #${offerNumber}`);
  console.log(`📁 Офертите се записват в: offers/`);
  console.log('');
});
