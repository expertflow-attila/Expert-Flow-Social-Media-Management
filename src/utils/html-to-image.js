/**
 * HTML to Image Converter
 * Puppeteer-rel készít képet HTML-ből
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

// Platform-specifikus méretek
const DIMENSIONS = {
  instagram: { width: 1080, height: 1080 },
  linkedin: { width: 1200, height: 627 },
  facebook: { width: 1200, height: 630 },
  twitter: { width: 1200, height: 675 }
};

/**
 * HTML-ből PNG kép generálása
 *
 * @param {string} html - A HTML kód
 * @param {string} platform - Platform neve (instagram, linkedin, etc.)
 * @param {Object} options - Extra opciók
 * @returns {string} A generált kép elérési útja
 */
export async function htmlToImage(html, platform, options = {}) {
  const dimensions = DIMENSIONS[platform] || DIMENSIONS.instagram;
  const outputDir = options.outputDir || path.join(process.cwd(), 'output');

  // Output mappa létrehozása ha nincs
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (e) {
    // Mappa már létezik
  }

  // Fájlnév generálása
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = options.filename || `${platform}-${timestamp}.png`;
  const outputPath = path.join(outputDir, filename);

  // HTML fájl ideiglenes mentése (debug céljából)
  const htmlPath = path.join(outputDir, filename.replace('.png', '.html'));
  await fs.writeFile(htmlPath, html, 'utf-8');

  let browser;

  try {
    // Puppeteer indítása
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Viewport beállítása
    await page.setViewport({
      width: dimensions.width,
      height: dimensions.height,
      deviceScaleFactor: options.scale || 2 // 2x a jobb minőségért
    });

    // HTML betöltése
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Várakozás a betűtípusok betöltésére
    await page.evaluate(() => document.fonts.ready);

    // Extra várakozás animációkra (ha vannak)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Screenshot készítése
    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height
      }
    });

    return outputPath;

  } catch (error) {
    console.error('HTML to Image hiba:', error.message);
    throw new Error(`Kép generálási hiba: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * HTML-ből base64 kép
 *
 * @param {string} html - A HTML kód
 * @param {string} platform - Platform neve
 * @returns {string} Base64 encoded PNG
 */
export async function htmlToBase64(html, platform) {
  const dimensions = DIMENSIONS[platform] || DIMENSIONS.instagram;

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: dimensions.width,
      height: dimensions.height,
      deviceScaleFactor: 2
    });

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.evaluate(() => document.fonts.ready);

    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      clip: {
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height
      }
    });

    return `data:image/png;base64,${screenshot}`;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Több HTML egyszerre konvertálása (batch)
 *
 * @param {Array<{html: string, platform: string, filename?: string}>} items
 * @param {Object} options
 * @returns {Array<string>} Generált képek útvonalai
 */
export async function batchHtmlToImage(items, options = {}) {
  const outputDir = options.outputDir || path.join(process.cwd(), 'output');

  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (e) {
    // Mappa már létezik
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const results = [];

    for (const item of items) {
      const dimensions = DIMENSIONS[item.platform] || DIMENSIONS.instagram;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = item.filename || `${item.platform}-${timestamp}.png`;
      const outputPath = path.join(outputDir, filename);

      const page = await browser.newPage();

      await page.setViewport({
        width: dimensions.width,
        height: dimensions.height,
        deviceScaleFactor: 2
      });

      await page.setContent(item.html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await page.evaluate(() => document.fonts.ready);
      await new Promise(resolve => setTimeout(resolve, 300));

      await page.screenshot({
        path: outputPath,
        type: 'png',
        clip: {
          x: 0,
          y: 0,
          width: dimensions.width,
          height: dimensions.height
        }
      });

      await page.close();
      results.push(outputPath);
    }

    return results;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export default htmlToImage;
