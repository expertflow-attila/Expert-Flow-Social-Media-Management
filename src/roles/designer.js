/**
 * Designer Role
 * Elkészíti a vizuális designt a brand sablonok stílusa alapján
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

export class Designer {
  constructor(brandContext, templates) {
    this.brandContext = brandContext;
    this.templates = templates;
    this.client = new Anthropic();
  }

  /**
   * Design készítés
   *
   * @param {string} contentIdea - A poszt ötlete magyarul
   * @param {string} platform - 'instagram' vagy 'linkedin'
   * @returns {Object} { html, reasoning }
   */
  async createDesign(contentIdea, platform) {
    // 1. Brand visual guide betöltése
    const visualGuide = await this.loadVisualGuide();

    // 2. Sablonok betöltése (base64)
    const templateImages = await this.loadTemplates(platform);

    // 3. Méret meghatározása
    const dimensions = platform === 'instagram'
      ? { width: 1080, height: 1080 }
      : { width: 1200, height: 627 };

    // 4. Content blokkok összeállítása
    const content = [];

    // Sablon képek hozzáadása, ha vannak
    if (templateImages.length > 0) {
      for (const template of templateImages) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: template.mediaType,
            data: template.data
          }
        });
      }
    }

    // Prompt hozzáadása
    content.push({
      type: 'text',
      text: `Készíts egy ${platform} social media posztot MAGYAR nyelven!

FONTOS KÖVETELMÉNYEK:
- Méret: ${dimensions.width}x${dimensions.height}px
- Nyelv: MAGYAR (minden szöveg magyarul!)
- Self-contained HTML (inline CSS, nem külső fájlok)
- Modern, professzionális design

BRAND VIZUÁLIS ÚTMUTATÓ:
${visualGuide}

POSZT ÖTLET:
"${contentIdea}"

${templateImages.length > 0 ? 'SABLON KÉPEK:\nA fenti képek mutatják a brand stílusát. Kövesd ezt a vizuális nyelvet!' : ''}

TECHNIKAI KÖVETELMÉNYEK:
1. Használj inline CSS-t
2. A HTML legyen self-contained (ne hivatkozz külső erőforrásokra)
3. Használj web-safe fontokat vagy Google Fonts-ot inline @import-tal
4. A design legyen ${dimensions.width}x${dimensions.height}px fix méretű
5. Használj gradiens hátteret vagy színes elemeket
6. A szöveg legyen jól olvasható (kontraszt!)
7. Legyen CTA gomb vagy kiemelés

GENERÁLJ CSAK A TELJES HTML KÓDOT, SEMMI MÁST!
A válasz <!DOCTYPE html> -lel kezdődjön és </html>-lel végződjön.`
    });

    // 5. Claude API hívás
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: content
      }]
    });

    const html = this.extractHTML(response.content[0].text);

    return {
      html: html,
      dimensions: dimensions,
      reasoning: `Design készítve a brand stílus alapján (${platform}, ${dimensions.width}x${dimensions.height}px)`
    };
  }

  /**
   * Design javítása feedback alapján
   *
   * @param {Object} currentDesign - Jelenlegi design
   * @param {string} feedback - Javítási utasítások
   * @returns {Object} { html, reasoning }
   */
  async reviseDesign(currentDesign, feedback) {
    const content = [{
      type: 'text',
      text: `Javítsd ki ezt a ${currentDesign.platform || 'social media'} designt a feedback alapján!

JELENLEGI HTML:
${currentDesign.html}

FEEDBACK / JAVÍTÁSI UTASÍTÁSOK:
${feedback}

KÖVETELMÉNYEK:
- Tartsd meg az eredeti struktúrát ahol lehet
- Csak a feedback-ben említett problémákat javítsd
- A szövegek maradjanak MAGYAR nyelven
- A méret maradjon ugyanaz

GENERÁLJ CSAK A JAVÍTOTT HTML KÓDOT, SEMMI MÁST!`
    }];

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: content
      }]
    });

    const html = this.extractHTML(response.content[0].text);

    return {
      html: html,
      dimensions: currentDesign.dimensions,
      reasoning: `Design javítva a feedback alapján: ${feedback.substring(0, 100)}...`
    };
  }

  /**
   * HTML kód kinyerése a válaszból
   */
  extractHTML(response) {
    // Keressük a HTML kódot
    const htmlMatch = response.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
    if (htmlMatch) {
      return htmlMatch[0];
    }

    // Ha nincs DOCTYPE, keressük a <html> taget
    const htmlTagMatch = response.match(/<html[\s\S]*<\/html>/i);
    if (htmlTagMatch) {
      return '<!DOCTYPE html>\n' + htmlTagMatch[0];
    }

    // Ha semmi sem található, csomagoljuk be
    if (response.includes('<div') || response.includes('<body')) {
      return `<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Social Media Post</title>
</head>
<body style="margin: 0; padding: 0;">
${response}
</body>
</html>`;
    }

    return response;
  }

  /**
   * Brand visual guide betöltése
   */
  async loadVisualGuide() {
    try {
      const guidePath = path.join(process.cwd(), 'brand', 'visual-guide.md');
      const content = await fs.readFile(guidePath, 'utf-8');
      return content;
    } catch (error) {
      console.warn('⚠️  Visual guide nem található, alapértelmezett stílus használata');
      return `
# Alapértelmezett Vizuális Stílus

## Színpaletta
- Elsődleges: #2563EB (kék)
- Másodlagos: #7C3AED (lila)
- Kiemelés: #F59E0B (narancs)
- Háttér: #F8FAFC (világos szürke)
- Szöveg: #1E293B (sötét)

## Betűtípusok
- Címsor: Inter Bold vagy system-ui bold
- Szöveg: Inter Regular vagy system-ui

## Design elvek
- Modern és clean megjelenés
- Bőséges whitespace
- Professzionális de barátságos
- Jó kontraszt az olvashatóságért
`;
    }
  }

  /**
   * Sablon képek betöltése
   */
  async loadTemplates(platform) {
    const templates = [];

    try {
      const templateDir = path.join(process.cwd(), 'templates', platform);
      const files = await fs.readdir(templateDir);

      const imageFiles = files.filter(f =>
        f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
      );

      // Maximum 3 sablon betöltése (költség és kontextus miatt)
      const filesToLoad = imageFiles.slice(0, 3);

      for (const file of filesToLoad) {
        const filePath = path.join(templateDir, file);
        const buffer = await fs.readFile(filePath);
        const base64 = buffer.toString('base64');

        const ext = path.extname(file).toLowerCase();
        const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';

        templates.push({
          filename: file,
          data: base64,
          mediaType: mediaType
        });
      }

      if (templates.length > 0) {
        console.log(`   📁 ${templates.length} sablon betöltve: ${platform}`);
      }
    } catch (error) {
      // Nincs sablon mappa vagy üres - ez nem hiba
      console.log(`   📁 Nincs sablon: ${platform} (alapértelmezett stílus)`);
    }

    return templates;
  }
}

export default Designer;
