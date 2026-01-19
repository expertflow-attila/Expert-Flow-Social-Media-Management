/**
 * Copywriter Role
 * Megírja a poszt szövegét magyarul, a brand hangnemében
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

export class Copywriter {
  constructor(brandContext) {
    this.brandContext = brandContext;
    this.client = new Anthropic();
  }

  /**
   * Caption írás
   *
   * @param {string} contentIdea - A poszt ötlete
   * @param {string} platform - 'instagram' vagy 'linkedin'
   * @returns {Object} { caption, hashtags, hook, cta, reasoning }
   */
  async writeCopy(contentIdea, platform) {
    // 1. Brand voice és about betöltése
    const voiceTone = await this.loadVoiceTone();
    const about = await this.loadAbout();

    // 2. Platform-specifikus szabályok
    const platformRules = this.getPlatformRules(platform);

    // 3. Prompt összeállítása
    const prompt = `Írj egy ${platform} poszt szöveget (caption) MAGYAR nyelven az ExpertFlow.hu számára!

EXPERTFLOW BEMUTATKOZÁS:
${about}

BRAND HANGVÉTEL:
${voiceTone}

PLATFORM SZABÁLYOK (${platform.toUpperCase()}):
${platformRules}

POSZT ÖTLET:
"${contentIdea}"

KÖVETELMÉNYEK:
- MAGYAR nyelv (nagyon fontos!)
- Engaging hook az első sorban (ez látszik először!)
- Értéket adó tartalom
- Világos call-to-action a végén
- Brand voice követése
- Ne használj túl sok emoji-t (max 3-5 a teljes szövegben)

VÁLASZ FORMÁTUM (CSAK VALID JSON, SEMMI MÁS):
{
  "caption": "A teljes szöveg ide...",
  "hashtags": ["hashtag1", "hashtag2"],
  "hook": "Az első mondat/sor...",
  "cta": "A call-to-action szöveg..."
}`;

    // 4. Claude API hívás
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // 5. JSON parse
    const parsed = this.parseJSON(response.content[0].text);

    return {
      caption: parsed.caption,
      hashtags: parsed.hashtags || [],
      hook: parsed.hook,
      cta: parsed.cta,
      platform: platform,
      reasoning: `Szöveg írva a brand hangnemében, magyar nyelven (${platform})`
    };
  }

  /**
   * Szöveg javítása feedback alapján
   *
   * @param {Object} currentCopy - Jelenlegi szöveg
   * @param {string} feedback - Javítási utasítások
   * @returns {Object} { caption, hashtags, hook, cta, reasoning }
   */
  async reviseCopy(currentCopy, feedback) {
    const prompt = `Javítsd ki ezt a ${currentCopy.platform || 'social media'} caption-t a feedback alapján!

JELENLEGI CAPTION:
${currentCopy.caption}

JELENLEGI HASHTAGS:
${(currentCopy.hashtags || []).join(', ')}

FEEDBACK / JAVÍTÁSI UTASÍTÁSOK:
${feedback}

KÖVETELMÉNYEK:
- Tartsd meg a jó részeket
- Csak a feedback-ben említett problémákat javítsd
- A szöveg maradjon MAGYAR nyelven
- A hossz maradjon megfelelő

VÁLASZ FORMÁTUM (CSAK VALID JSON, SEMMI MÁS):
{
  "caption": "A javított teljes szöveg ide...",
  "hashtags": ["hashtag1", "hashtag2"],
  "hook": "Az első mondat/sor...",
  "cta": "A call-to-action szöveg..."
}`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const parsed = this.parseJSON(response.content[0].text);

    return {
      caption: parsed.caption,
      hashtags: parsed.hashtags || [],
      hook: parsed.hook,
      cta: parsed.cta,
      platform: currentCopy.platform,
      reasoning: `Szöveg javítva a feedback alapján: ${feedback.substring(0, 100)}...`
    };
  }

  /**
   * Platform-specifikus szabályok
   */
  getPlatformRules(platform) {
    if (platform === 'instagram') {
      return `- Maximum 2200 karakter
- Emoji használat mértékkel (ne legyen túl sok!)
- 5-10 releváns hashtag
- Az első sor a legfontosabb (ez látszik a feed-ben)
- Bekezdések és sortörések használata (olvashatóság)
- Tegeződés megengedett`;
    }

    if (platform === 'linkedin') {
      return `- Maximum 3000 karakter
- Professzionális hangnem
- 3-5 hashtag opcionális
- Első 2-3 sor kritikus (ez látszik "...tovább" előtt)
- Strukturált, könnyen olvasható formátum
- Tegeződés és magázás is elfogadott
- Üzleti értéket kommunikálj`;
    }

    return '- Általános social media szabályok';
  }

  /**
   * JSON válasz parse-olása
   */
  parseJSON(response) {
    // Próbáljuk közvetlenül parse-olni
    try {
      return JSON.parse(response);
    } catch (e) {
      // Keressük a JSON blokkot a válaszban
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          // Ha még mindig nem sikerül, tisztítsuk meg
          const cleaned = jsonMatch[0]
            .replace(/[\n\r]/g, ' ')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          return JSON.parse(cleaned);
        }
      }
    }

    // Fallback - alapértelmezett struktúra
    console.warn('⚠️  JSON parse sikertelen, fallback használata');
    return {
      caption: response,
      hashtags: [],
      hook: response.split('\n')[0],
      cta: ''
    };
  }

  /**
   * Brand voice betöltése
   */
  async loadVoiceTone() {
    try {
      const voicePath = path.join(process.cwd(), 'brand', 'voice-tone.md');
      const content = await fs.readFile(voicePath, 'utf-8');
      return content;
    } catch (error) {
      console.warn('⚠️  Voice-tone nem található, alapértelmezett használata');
      return `
# Alapértelmezett Hangvétel

## Alapelvek
- Professzionális, de barátságos
- Inspiráló és motiváló
- Gyakorlatorientált
- Közérthető (nem túl technikai)

## Megszólítás
- Instagram: Tegeződés
- LinkedIn: Lehet tegeződés vagy magázás kontextustól függően

## Amit használunk
- Gyakorlati példák
- Kérdések a közönségnek
- Action-oriented CTA-k
- Személyes történetek

## Amit kerülünk
- Túlzó marketing nyelv ("HIHETETLEN", "SZENZÁCIÓS")
- Negatív hangnem
- Túl sok emoji
- Clickbait
`;
    }
  }

  /**
   * About betöltése
   */
  async loadAbout() {
    try {
      const aboutPath = path.join(process.cwd(), 'brand', 'about.md');
      const content = await fs.readFile(aboutPath, 'utf-8');
      return content;
    } catch (error) {
      console.warn('⚠️  About nem található, alapértelmezett használata');
      return `
# ExpertFlow.hu

## Ki vagyunk?
Az ExpertFlow Magyarország vezető online oktatási és tanácsadási platformja szakértők és vállalkozások számára.

## Küldetésünk
Segítünk szakértőknek és vállalkozóknak automatizálni folyamataikat, online jelenlétüket építeni és skálázható üzleti modelleket létrehozni.

## Fő témáink
- AI és automatizáció
- Online marketing
- Digitális transzformáció
- Vállalkozásfejlesztés
`;
    }
  }
}

export default Copywriter;
