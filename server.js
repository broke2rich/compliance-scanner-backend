// Compliance Scanner MVP Codebase
// Full basic setup: Next.js frontend + Node.js backend with Express and Puppeteer

// Folder Structure:
// /frontend (Next.js app)
// /backend (Node.js + Express app)

// ----- backend/server.js -----

const express = require('express');
const cors = require('cors');
const chromium = require('chrome-aws-lambda');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/scan', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  try {
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const privacyPolicy = await page.$$eval('a', links =>
      links.some(link => link.innerText.toLowerCase().includes('privacy'))
    );

    const termsOfService = await page.$$eval('a', links =>
      links.some(link => link.innerText.toLowerCase().includes('terms'))
    );

    const cookieBanner = await page.$('[class*="cookie"], [id*="cookie"]') !== null;

    const responseHeaders = await page.goto(url).then(response => response.headers());

    const csp = responseHeaders['content-security-policy'] || false;
    const xfo = responseHeaders['x-frame-options'] || false;
    const hsts = responseHeaders['strict-transport-security'] || false;

    await browser.close();

    return res.json({
      privacyPolicy,
      termsOfService,
      cookieBanner,
      sslValid: true,
      headers: {
        contentSecurityPolicy: !!csp,
        xFrameOptions: !!xfo,
        strictTransportSecurity: !!hsts
      }
    });

  } catch (err) {
    console.error('Scan failed:', err);
    return res.status(500).json({ error: 'Failed to scan website' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


