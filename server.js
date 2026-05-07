const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/screenshot', async (req, res) => {
  const { html, width = 1080, height = 1080 } = req.body;
  if (!html) return res.status(400).json({ error: 'html is required' });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height }
    });
    await browser.close();
    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
