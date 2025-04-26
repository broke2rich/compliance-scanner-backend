// Compliance Scanner MVP Codebase
// Full basic setup: Next.js frontend + Node.js backend with Express and Puppeteer

// Folder Structure:
// /frontend (Next.js app)
// /backend (Node.js + Express app)

// ----- backend/server.js -----

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// Scanner Route
app.post('/scan', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });

    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
          });          
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Scan for Privacy Policy
        const privacyPolicy = await page.$$eval('a', links => 
            links.some(link => link.innerText.toLowerCase().includes('privacy'))
        );

        // Scan for Terms of Service
        const termsOfService = await page.$$eval('a', links => 
            links.some(link => link.innerText.toLowerCase().includes('terms'))
        );

        // Check for Cookie Banner
        const cookieBanner = await page.$('[class*="cookie"], [id*="cookie"]') !== null;

        // Check for Security Headers
        const headers = await page.evaluate(() => JSON.stringify(performance.getEntriesByType('resource')));
        const responseHeaders = await page.goto(url).then(response => response.headers());

        const csp = responseHeaders['content-security-policy'] || false;
        const xfo = responseHeaders['x-frame-options'] || false;
        const hsts = responseHeaders['strict-transport-security'] || false;

        await browser.close();

        // SSL Certificate Check
        const sslCheck = await new Promise((resolve) => {
            const request = https.get(url, (res) => {
                const cert = res.connection.getPeerCertificate();
                if (cert && Object.keys(cert).length) {
                    const valid_to = new Date(cert.valid_to);
                    const now = new Date();
                    resolve(valid_to > now);
                } else {
                    resolve(false);
                }
            });

            request.on('error', () => resolve(false));
        });

        return res.json({
            privacyPolicy,
            termsOfService,
            cookieBanner,
            sslValid: sslCheck,
            headers: {
                contentSecurityPolicy: !!csp,
                xFrameOptions: !!xfo,
                strictTransportSecurity: !!hsts
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to scan website' });
    }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

