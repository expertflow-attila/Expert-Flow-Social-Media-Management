/**
 * Publer API Integration
 * https://publer.io/api-documentation
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';

export class PublerAPI {
  constructor() {
    this.apiKey = process.env.PUBLER_API_KEY;
    this.baseURL = 'https://app.publer.io/api/v1';

    if (!this.apiKey) {
      console.warn('⚠️  PUBLER_API_KEY nincs beállítva - posztolás nem elérhető');
    }
  }

  /**
   * Headers az API hívásokhoz
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Poszt ütemezése vagy azonnali közzététele
   *
   * @param {string} platform - 'instagram' vagy 'linkedin'
   * @param {string} imagePath - Kép elérési útja
   * @param {string} caption - Teljes szöveg hashtagekkel
   * @param {Date|null} scheduleTime - Ütemezési időpont (null = draft/azonnali)
   * @returns {Object} Publer API válasz
   */
  async schedulePost(platform, imagePath, caption, scheduleTime = null) {
    if (!this.apiKey) {
      throw new Error('Publer API nincs konfigurálva (PUBLER_API_KEY hiányzik)');
    }

    // 1. Account ID meghatározása
    const accountId = this.getAccountId(platform);
    if (!accountId) {
      throw new Error(`${platform} account ID nincs beállítva (${platform.toUpperCase()}_ACCOUNT_ID)`);
    }

    // 2. Kép feltöltés (ha van)
    let mediaIds = [];
    if (imagePath) {
      const mediaId = await this.uploadMedia(imagePath);
      mediaIds.push(mediaId);
    }

    // 3. Poszt létrehozása
    const payload = {
      account_ids: [accountId],
      text: caption,
      media_ids: mediaIds,
      is_draft: scheduleTime === null ? false : false,
      scheduled_at: scheduleTime ? scheduleTime.toISOString() : null
    };

    // Ha nincs ütemezés, azonnal posztolunk
    if (!scheduleTime) {
      payload.post_now = true;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/posts`,
        payload,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        id: response.data.id,
        status: response.data.status,
        scheduledAt: scheduleTime ? scheduleTime.toISOString() : 'now',
        data: response.data
      };
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message;
      throw new Error(`Publer API hiba: ${message}`);
    }
  }

  /**
   * Media feltöltése Publer-re
   *
   * @param {string} imagePath - Lokális kép elérési útja
   * @returns {string} Media ID
   */
  async uploadMedia(imagePath) {
    if (!this.apiKey) {
      throw new Error('Publer API nincs konfigurálva');
    }

    // Fájl beolvasása
    const imageBuffer = await fs.readFile(imagePath);
    const filename = path.basename(imagePath);

    // Base64 kódolás
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif'
    };
    const mimeType = mimeTypes[ext] || 'image/png';

    try {
      // Publer media upload
      const response = await axios.post(
        `${this.baseURL}/media`,
        {
          file: `data:${mimeType};base64,${base64}`,
          filename: filename
        },
        { headers: this.getHeaders() }
      );

      return response.data.id;
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message;
      throw new Error(`Media feltöltési hiba: ${message}`);
    }
  }

  /**
   * Account ID lekérése platform alapján
   */
  getAccountId(platform) {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return process.env.INSTAGRAM_ACCOUNT_ID || process.env.PUBLER_INSTAGRAM_ID;
      case 'linkedin':
        return process.env.LINKEDIN_ACCOUNT_ID || process.env.PUBLER_LINKEDIN_ID;
      default:
        return null;
    }
  }

  /**
   * Összes összekapcsolt account lekérése
   */
  async getAccounts() {
    if (!this.apiKey) {
      throw new Error('Publer API nincs konfigurálva');
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/accounts`,
        { headers: this.getHeaders() }
      );

      return response.data.map(account => ({
        id: account.id,
        platform: account.platform,
        name: account.name || account.username,
        avatar: account.avatar
      }));
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      throw new Error(`Account lekérési hiba: ${message}`);
    }
  }

  /**
   * Ütemezett posztok lekérése
   */
  async getScheduledPosts() {
    if (!this.apiKey) {
      throw new Error('Publer API nincs konfigurálva');
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/posts?status=scheduled`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      throw new Error(`Scheduled posts lekérési hiba: ${message}`);
    }
  }

  /**
   * Poszt törlése
   */
  async deletePost(postId) {
    if (!this.apiKey) {
      throw new Error('Publer API nincs konfigurálva');
    }

    try {
      await axios.delete(
        `${this.baseURL}/posts/${postId}`,
        { headers: this.getHeaders() }
      );

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      throw new Error(`Poszt törlési hiba: ${message}`);
    }
  }
}

export default PublerAPI;
