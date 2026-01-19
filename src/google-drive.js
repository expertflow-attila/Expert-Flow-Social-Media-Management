/**
 * Google Drive Integration
 * Képek feltöltése és kezelése Google Drive-ban
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';

export class GoogleDrive {
  constructor() {
    this.drive = null;
    this.initialized = false;

    // Folder IDs (a .env-ből)
    this.folders = {
      socialmedia: process.env.GDRIVE_SOCIALMEDIA_ID,
      elkeszult: process.env.GDRIVE_ELKESZULT_ID,
      posztolva: process.env.GDRIVE_POSZTOLVA_ID
    };
  }

  /**
   * Inicializálás Service Account credentials-el
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Credentials betöltése a szülő mappából
      const credentialsPath = path.join(process.cwd(), '..', 'credentials.json');
      const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf-8'));

      // Service Account auth
      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/drive']
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.initialized = true;
      console.log('   ✅ Google Drive kapcsolódva');
    } catch (error) {
      console.log('   ⚠️  Google Drive nem elérhető:', error.message);
      this.drive = null;
    }
  }

  /**
   * Kép feltöltése az "elkeszult" mappába
   *
   * @param {string} localPath - Lokális fájl elérési útja
   * @param {string} platform - Platform neve (instagram/linkedin)
   * @param {string} topic - Téma röviden
   * @returns {Object} { id, webViewLink }
   */
  async uploadToElkeszult(localPath, platform, topic = '') {
    await this.initialize();

    if (!this.drive) {
      throw new Error('Google Drive nincs inicializálva');
    }

    if (!this.folders.elkeszult) {
      throw new Error('GDRIVE_ELKESZULT_ID nincs beállítva a .env-ben');
    }

    // Fájlnév: YYYY-MM-DD_platform_tema.png
    const date = new Date().toISOString().split('T')[0];
    const safeTopic = topic.substring(0, 30).replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ ]/g, '').replace(/ /g, '_');
    const filename = `${date}_${platform}${safeTopic ? '_' + safeTopic : ''}.png`;

    const fileMetadata = {
      name: filename,
      parents: [this.folders.elkeszult]
    };

    const media = {
      mimeType: 'image/png',
      body: createReadStream(localPath)
    };

    const file = await this.drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    console.log(`   📁 Feltöltve Drive-ra: ${filename}`);

    return {
      id: file.data.id,
      webViewLink: file.data.webViewLink,
      filename: filename
    };
  }

  /**
   * Fájl áthelyezése a "posztolva" mappába
   *
   * @param {string} fileId - Google Drive fájl ID
   * @returns {Object} Frissített fájl info
   */
  async moveToPosztolva(fileId) {
    await this.initialize();

    if (!this.drive) {
      throw new Error('Google Drive nincs inicializálva');
    }

    if (!this.folders.posztolva) {
      throw new Error('GDRIVE_POSZTOLVA_ID nincs beállítva a .env-ben');
    }

    // Jelenlegi szülő lekérése
    const file = await this.drive.files.get({
      fileId: fileId,
      fields: 'parents'
    });

    const previousParents = file.data.parents.join(',');

    // Áthelyezés
    const updatedFile = await this.drive.files.update({
      fileId: fileId,
      addParents: this.folders.posztolva,
      removeParents: previousParents,
      fields: 'id, name, webViewLink'
    });

    console.log(`   📁 Áthelyezve "posztolva" mappába: ${updatedFile.data.name}`);

    return updatedFile.data;
  }

  /**
   * Mappák létrehozása (egyszeri setup)
   */
  async setupFolders() {
    await this.initialize();

    if (!this.drive) {
      throw new Error('Google Drive nincs inicializálva');
    }

    const results = {};

    // 1. Fő mappa: socialmedia
    const socialmedia = await this.drive.files.create({
      resource: {
        name: 'socialmedia',
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });
    results.socialmedia = socialmedia.data.id;
    console.log(`socialmedia mappa: ${results.socialmedia}`);

    // 2. Almappa: elkeszult
    const elkeszult = await this.drive.files.create({
      resource: {
        name: 'elkeszult',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [results.socialmedia]
      },
      fields: 'id'
    });
    results.elkeszult = elkeszult.data.id;
    console.log(`elkeszult mappa: ${results.elkeszult}`);

    // 3. Almappa: posztolva
    const posztolva = await this.drive.files.create({
      resource: {
        name: 'posztolva',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [results.socialmedia]
      },
      fields: 'id'
    });
    results.posztolva = posztolva.data.id;
    console.log(`posztolva mappa: ${results.posztolva}`);

    console.log('\n--- .env-be másolandó ---');
    console.log(`GDRIVE_SOCIALMEDIA_ID=${results.socialmedia}`);
    console.log(`GDRIVE_ELKESZULT_ID=${results.elkeszult}`);
    console.log(`GDRIVE_POSZTOLVA_ID=${results.posztolva}`);

    return results;
  }

  /**
   * Fájlok listázása egy mappából
   */
  async listFiles(folderId) {
    await this.initialize();

    if (!this.drive) {
      throw new Error('Google Drive nincs inicializálva');
    }

    const response = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, webViewLink, createdTime)',
      orderBy: 'createdTime desc'
    });

    return response.data.files;
  }
}

export default GoogleDrive;
