/**
 * Buffer API Integration
 * https://buffer.com/developers/api
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';

export class BufferAPI {
  constructor() {
    this.accessToken = process.env.BUFFER_ACCESS_TOKEN;
    this.baseURL = 'https://api.bufferapp.com/1';

    if (!this.accessToken) {
      console.warn('⚠️  BUFFER_ACCESS_TOKEN nincs beállítva - posztolás nem elérhető');
    }
  }

  /**
   * Poszt ütemezése vagy azonnali közzététele
   *
   * @param {string} platform - 'instagram' vagy 'linkedin'
   * @param {string} imagePath - Kép elérési útja
   * @param {string} caption - Teljes szöveg hashtagekkel
   * @param {Date|null} scheduleTime - Ütemezési időpont (null = azonnali)
   * @returns {Object} Buffer API válasz
   */
  async schedulePost(platform, imagePath, caption, scheduleTime = null) {
    if (!this.accessToken) {
      throw new Error('Buffer API nincs konfigurálva (BUFFER_ACCESS_TOKEN hiányzik)');
    }

    // 1. Profile ID meghatározása
    const profileId = this.getProfileId(platform);
    if (!profileId) {
      throw new Error(`${platform} profile ID nincs beállítva (${platform.toUpperCase()}_PROFILE_ID)`);
    }

    // 2. Kép feltöltés
    let mediaUrl = null;
    if (imagePath) {
      mediaUrl = await this.uploadImage(imagePath);
    }

    // 3. Poszt létrehozása
    const payload = {
      text: caption,
      profile_ids: [profileId]
    };

    // Kép hozzáadása ha van
    if (mediaUrl) {
      payload.media = { photo: mediaUrl };
    }

    // Ütemezés vagy azonnali
    if (scheduleTime) {
      payload.scheduled_at = Math.floor(scheduleTime.getTime() / 1000);
    } else {
      payload.now = true;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/updates/create.json`,
        this.toFormData(payload),
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        id: response.data.updates?.[0]?.id,
        status: response.data.updates?.[0]?.status,
        scheduledAt: scheduleTime ? scheduleTime.toISOString() : 'now',
        data: response.data
      };
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      throw new Error(`Buffer API hiba: ${message}`);
    }
  }

  /**
   * Kép feltöltése Buffer-re
   *
   * @param {string} imagePath - Lokális kép elérési útja
   * @returns {string} Feltöltött kép URL-je
   */
  async uploadImage(imagePath) {
    if (!this.accessToken) {
      throw new Error('Buffer API nincs konfigurálva');
    }

    // Fájl beolvasása
    const imageBuffer = await fs.readFile(imagePath);
    const filename = path.basename(imagePath);
    const ext = path.extname(imagePath).toLowerCase();

    // Content type meghatározása
    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif'
    };
    const contentType = contentTypes[ext] || 'image/png';

    // Form data összeállítása
    const form = new FormData();
    form.append('photo', imageBuffer, {
      filename: filename,
      contentType: contentType
    });

    try {
      // Buffer Media Upload API
      // Megjegyzés: A Buffer v1 API nem támogat közvetlenül media upload-ot
      // Alternatíva: használjunk egy image hosting szolgáltatást (pl. Imgur)
      // vagy a Buffer Publish API-t közvetlenül

      // Egyszerűsített megoldás: base64 data URI
      const base64 = imageBuffer.toString('base64');
      return `data:${contentType};base64,${base64}`;

    } catch (error) {
      const message = error.response?.data?.error || error.message;
      throw new Error(`Kép feltöltési hiba: ${message}`);
    }
  }

  /**
   * Profile ID lekérése platform alapján
   */
  getProfileId(platform) {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return process.env.INSTAGRAM_PROFILE_ID;
      case 'linkedin':
        return process.env.LINKEDIN_PROFILE_ID;
      case 'twitter':
      case 'x':
        return process.env.TWITTER_PROFILE_ID;
      case 'facebook':
        return process.env.FACEBOOK_PROFILE_ID;
      default:
        return null;
    }
  }

  /**
   * Profile-ok lekérése a Buffer fiókból
   */
  async getProfiles() {
    if (!this.accessToken) {
      throw new Error('Buffer API nincs konfigurálva');
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/profiles.json`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data.map(profile => ({
        id: profile.id,
        service: profile.service,
        name: profile.formatted_username,
        avatar: profile.avatar
      }));
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      throw new Error(`Profile lekérési hiba: ${message}`);
    }
  }

  /**
   * Várakozó posztok lekérése
   */
  async getPendingUpdates(profileId) {
    if (!this.accessToken) {
      throw new Error('Buffer API nincs konfigurálva');
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/profiles/${profileId}/updates/pending.json`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data.updates;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      throw new Error(`Pending updates lekérési hiba: ${message}`);
    }
  }

  /**
   * Object to FormData konverzió
   */
  toFormData(obj) {
    const form = new FormData();

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          form.append(`${key}[${index}]`, item);
        });
      } else if (typeof value === 'object' && value !== null) {
        for (const [subKey, subValue] of Object.entries(value)) {
          form.append(`${key}[${subKey}]`, subValue);
        }
      } else if (value !== null && value !== undefined) {
        form.append(key, String(value));
      }
    }

    return form;
  }
}

export default BufferAPI;
