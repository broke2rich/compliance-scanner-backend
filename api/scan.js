import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/usr/bin/google-chrome-stable',  // <- Use Vercel's built-in Chrome
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

    return res.json({ success: true });

  } catch (error) {
    console.error('Scan failed:', error);
    return res.status(500).json({ error: 'Failed to scan website' });
  }
}