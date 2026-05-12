const express = require('express');
const puppeteer = require('puppeteer');

process.setMaxListeners(50);

const app = express();
app.use(express.json({ limit: '50mb' }));

let browser = null;

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process'
    ]
  });
  browser.on('disconnected', () => { browser = null; });
  return browser;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/screenshot', async (req, res) => {
  const { html, width = 1080, height = 1080 } = req.body;
  if (!html) return res.status(400).json({ error: 'html is required' });
  let page;
  try {
    const b = await getBrowser();
    page = await b.newPage();
    await page.setViewport({ width, height });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height }
    });
    await page.close();
    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (err) {
    if (page) await page.close().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

app.post('/screenshots', async (req, res) => {
  const { pages, width = 1080, height = 1080 } = req.body;
  if (!pages || !Array.isArray(pages)) return res.status(400).json({ error: 'pages array is required' });
  let page;
  try {
    const b = await getBrowser();
    const results = [];
    for (const html of pages) {
      page = await b.newPage();
      await page.setViewport({ width, height });
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height },
        encoding: 'base64'
      });
      await page.close();
      page = null;
      results.push(screenshot);
    }
    res.json({ images: results });
  } catch (err) {
    if (page) await page.close().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
