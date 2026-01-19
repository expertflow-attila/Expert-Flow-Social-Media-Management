/**
 * Quality Control Role
 * Ellenőrzi a design és szöveg minőségét
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

export class QualityControl {
  constructor(brandContext) {
    this.brandContext = brandContext;
    this.client = new Anthropic();
  }

  /**
   * Tartalom audit
   *
   * @param {Object} content - { design, copy, platform }
   * @returns {Object} { score, breakdown, issues, approved, feedback, improvements }
   */
  async auditContent(content) {
    const { design, copy, platform } = content;

    // Brand kontextus betöltése
    const brandInfo = await this.loadBrandInfo();

    const prompt = `Te vagy az ExpertFlow Quality Control szakértő. Ellenőrizd ezt a ${platform} posztot!

BRAND KONTEXTUS:
${brandInfo}

=== DESIGN (HTML) ===
${design.html}

=== CAPTION ===
${copy.caption}

=== HASHTAGS ===
${(copy.hashtags || []).join(', ')}

=== HOOK (első sor) ===
${copy.hook || 'N/A'}

=== CTA ===
${copy.cta || 'N/A'}

ÉRTÉKELÉSI SZEMPONTOK (100 pont összesen):

1. BRAND ALIGNMENT (30 pont)
   - Vizuális konzisztencia a brand guide-dal
   - Hangvétel illeszkedés (professzionális de barátságos)
   - Expert Flow értékek tükröződése (fenntarthatóság, AI mint eszköz, nem birodalom)
   - Kerülendő kifejezések elkerülése (skálázás, konvertálás, funnel, lead)

2. MINŐSÉG (30 pont)
   - Design minőség (olvashatóság, esztétika, professzionalizmus)
   - Szöveg minőség (világos, érthető, értéket ad)
   - Profizmus szintje (méltó az Expert Flow-hoz?)

3. PLATFORM OPTIMALIZÁCIÓ (20 pont)
   - ${platform === 'instagram' ? 'Instagram specifikus (1080x1080, max 2200 karakter, 5-10 hashtag)' : 'LinkedIn specifikus (1200x627, max 3000 karakter, professzionális hangnem)'}
   - Engagement potenciál (megfogja a figyelmet?)
   - Hook erőssége (első sor látszik a feed-ben!)
   - CTA világossága

4. MAGYAR NYELV (20 pont)
   - Nyelvtani hibák (KRITIKUS - ha van, max 70 pont összesen!)
   - Természetes megfogalmazás (nem gépi)
   - Helyesírás
   - Magyar idiómák helyes használata

KRITIKUS SZABÁLYOK:
- Ha BÁRMILYEN nyelvtani hiba van → max 70 pont összesen
- Ha angol szó van magyarul írható helyett → -5 pont
- Ha túl sok emoji van (>5) → -5 pont
- Ha clickbait stílus → -10 pont
- Ha nincs CTA → -10 pont

VÁLASZ FORMÁTUM (CSAK VALID JSON):
{
  "overallScore": 85,
  "breakdown": {
    "brandAlignment": 28,
    "quality": 27,
    "platformOptimization": 18,
    "language": 18
  },
  "issues": [
    "Konkrét probléma leírása...",
    "Másik konkrét probléma..."
  ],
  "approved": true,
  "feedback": "Összefoglaló visszajelzés a tartalomról...",
  "improvements": [
    "Konkrét javítási javaslat 1",
    "Konkrét javítási javaslat 2"
  ],
  "strengths": [
    "Erősség 1",
    "Erősség 2"
  ]
}`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const audit = this.parseJSON(response.content[0].text);

    // Automatikus elutasítás 80 pont alatt
    if (audit.overallScore < 80) {
      audit.approved = false;
    }

    return audit;
  }

  /**
   * Gyors ellenőrzés specifikus szempontokra
   *
   * @param {Object} content - A tartalom
   * @param {string} focus - Mire fókuszáljon ('language', 'brand', 'engagement')
   * @returns {Object} Gyors audit eredmény
   */
  async quickCheck(content, focus = 'language') {
    const { copy, platform } = content;

    const focusPrompts = {
      language: `Ellenőrizd a magyar nyelvhelyességet:
        - Nyelvtani hibák
        - Helyesírás
        - Természetes megfogalmazás
        Szöveg: "${copy.caption}"`,

      brand: `Ellenőrizd a brand illeszkedést:
        - Expert Flow hangvétel (professzionális de barátságos)
        - Kerülendő kifejezések (skálázás, konvertálás, funnel, lead, A/B teszt)
        - Értékek tükröződése
        Szöveg: "${copy.caption}"`,

      engagement: `Ellenőrizd az engagement potenciált:
        - Hook erőssége: "${copy.hook}"
        - CTA világossága: "${copy.cta}"
        - Hashtag relevancia: ${(copy.hashtags || []).join(', ')}
        Platform: ${platform}`
    };

    const prompt = `${focusPrompts[focus]}

VÁLASZ FORMÁTUM (CSAK VALID JSON):
{
  "passed": true,
  "score": 85,
  "issues": ["Ha van probléma..."],
  "suggestions": ["Javítási javaslat..."]
}`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return this.parseJSON(response.content[0].text);
  }

  /**
   * JSON válasz parse-olása
   */
  parseJSON(response) {
    try {
      return JSON.parse(response);
    } catch (e) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          const cleaned = jsonMatch[0]
            .replace(/[\n\r]/g, ' ')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          return JSON.parse(cleaned);
        }
      }
    }

    // Fallback
    console.warn('⚠️  QC JSON parse sikertelen, fallback használata');
    return {
      overallScore: 0,
      breakdown: {
        brandAlignment: 0,
        quality: 0,
        platformOptimization: 0,
        language: 0
      },
      issues: ['JSON parse hiba - manuális ellenőrzés szükséges'],
      approved: false,
      feedback: 'Automatikus értékelés sikertelen',
      improvements: ['Próbáld újra'],
      strengths: []
    };
  }

  /**
   * Brand információk betöltése
   */
  async loadBrandInfo() {
    let brandInfo = '';

    try {
      const aboutPath = path.join(process.cwd(), 'brand', 'about.md');
      const about = await fs.readFile(aboutPath, 'utf-8');
      brandInfo += '## About\n' + about + '\n\n';
    } catch (e) {
      // Nincs about fájl
    }

    try {
      const voicePath = path.join(process.cwd(), 'brand', 'voice-tone.md');
      const voice = await fs.readFile(voicePath, 'utf-8');
      brandInfo += '## Voice & Tone\n' + voice + '\n\n';
    } catch (e) {
      // Nincs voice fájl
    }

    if (!brandInfo) {
      brandInfo = `
## Expert Flow Alapértelmezett Brand Info

### Filozófia
- Az AI eszköz, nem megoldás
- Fenntartható vállalkozás > végtelen növekedés
- Élhető élet a cél

### Hangvétel
- Professzionális de barátságos
- Inspiráló és motiváló
- Közérthető nyelv

### Kerülendő
- "Skálázás", "konvertálás", "funnel", "lead"
- Túlzó marketing nyelv
- Túl sok emoji
`;
    }

    return brandInfo;
  }
}

export default QualityControl;
