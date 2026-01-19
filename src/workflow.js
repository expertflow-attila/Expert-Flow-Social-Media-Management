/**
 * ExpertFlow Social Media Assistant - Main Workflow
 */

import { Designer } from './roles/designer.js';
import { Copywriter } from './roles/copywriter.js';
import { QualityControl } from './roles/quality-control.js';
import { Manager } from './roles/manager.js';
import { PublerAPI } from './publer-api.js';
import { htmlToImage } from './utils/html-to-image.js';
import fs from 'fs/promises';
import path from 'path';

export class SocialWorkflow {
  constructor() {
    this.brandContext = null;
    this.templates = null;

    // Szerepek inicializálása (lazy loading)
    this.designer = null;
    this.copywriter = null;
    this.qc = null;
    this.manager = null;
    this.publer = null;

    this.initialized = false;
  }

  /**
   * Inicializálás (lazy)
   */
  async initialize() {
    if (this.initialized) return;

    console.log('📦 Rendszer inicializálása...');

    // Brand kontextus betöltése
    this.brandContext = await this.loadBrandContext();

    // Sablonok betöltése
    this.templates = await this.loadTemplates();

    // Szerepek inicializálása
    this.designer = new Designer(this.brandContext, this.templates);
    this.copywriter = new Copywriter(this.brandContext);
    this.qc = new QualityControl(this.brandContext);
    this.manager = new Manager(this.brandContext);

    // Manager-nek átadjuk a többi role-t az iterációhoz
    this.manager.designer = this.designer;
    this.manager.copywriter = this.copywriter;
    this.manager.qc = this.qc;

    // Publer API (opcionális)
    try {
      this.publer = new PublerAPI();
    } catch (e) {
      console.log('   ⚠️  Publer API nem konfigurált (posztolás nem elérhető)');
    }

    this.initialized = true;
    console.log('✅ Rendszer kész!\n');
  }

  /**
   * FŐ WORKFLOW: Posztötlettől a jóváhagyásig
   *
   * @param {string} contentIdea - A poszt ötlete
   * @param {string} platform - 'instagram' vagy 'linkedin'
   * @returns {Object} Eredmény objektum
   */
  async createPost(contentIdea, platform) {
    await this.initialize();

    console.log(`\n🚀 Poszt készítése: ${platform.toUpperCase()}`);
    console.log(`💡 Ötlet: "${contentIdea}"\n`);

    try {
      // ═══════════════════════════════════════════════════
      // PHASE 1: ALKOTÁS
      // ═══════════════════════════════════════════════════
      console.log('═══ PHASE 1: ALKOTÁS ═══\n');

      console.log('👨‍🎨 Designer dolgozik...');
      const design = await this.designer.createDesign(contentIdea, platform);
      console.log('   ✅ Design kész\n');

      console.log('✍️  Copywriter dolgozik...');
      const copy = await this.copywriter.writeCopy(contentIdea, platform);
      console.log('   ✅ Szöveg kész\n');

      // ═══════════════════════════════════════════════════
      // PHASE 2: MINŐSÉGELLENŐRZÉS
      // ═══════════════════════════════════════════════════
      console.log('═══ PHASE 2: MINŐSÉGELLENŐRZÉS ═══\n');

      console.log('🔍 Quality Control ellenőrzi...');
      let qcReport = await this.qc.auditContent({ design, copy, platform });
      console.log(`   📊 QC Score: ${qcReport.overallScore}/100`);

      if (qcReport.issues && qcReport.issues.length > 0) {
        console.log(`   📝 Issues: ${qcReport.issues.length} db`);
      }

      if (!qcReport.approved) {
        console.log('   ⚠️  QC nem hagyta jóvá (< 80 pont)\n');
      } else {
        console.log('   ✅ QC jóváhagyta\n');
      }

      // ═══════════════════════════════════════════════════
      // PHASE 3: MANAGER REVIEW
      // ═══════════════════════════════════════════════════
      console.log('═══ PHASE 3: MANAGER REVIEW ═══\n');

      console.log('👔 Manager (Claude) átnézi...');

      // Először gyors döntés
      const quickResult = await this.manager.quickDecision({ qcReport });

      let managerReview;
      let finalContent = { design, copy, platform, qcReport };

      if (quickResult.quickApprove === true) {
        console.log(`   ⚡ Gyors jóváhagyás: ${quickResult.reason}`);
        managerReview = {
          decision: 'approve',
          managerScore: qcReport.overallScore,
          feedback: quickResult.reason,
          strengths: qcReport.strengths || [],
          concerns: []
        };
      } else if (quickResult.quickApprove === false) {
        console.log(`   ⚡ Gyors elutasítás: ${quickResult.reason}`);
        // Automatikus iteráció
        console.log('   🔄 Automatikus javítás indul...\n');

        const revisionResult = await this.manager.coordinateRevision(
          finalContent,
          {
            decision: 'revise',
            revisionNeeded: {
              design: qcReport.improvements?.join(', ') || 'Javítsd a minőséget',
              copy: qcReport.improvements?.join(', ') || 'Javítsd a szöveget'
            }
          }
        );

        if (!revisionResult.success) {
          return {
            success: false,
            reason: revisionResult.reason,
            content: revisionResult.content,
            iterations: revisionResult.iterations,
            lastFeedback: revisionResult.lastFeedback
          };
        }

        finalContent = revisionResult.content;
        managerReview = revisionResult.finalReview;
        console.log(`   ✅ Javítva ${revisionResult.iterations} iteráció után\n`);
      } else {
        // Teljes manager review
        managerReview = await this.manager.finalReview(finalContent);
        console.log(`   📊 Manager Score: ${managerReview.managerScore}/100`);

        if (managerReview.decision === 'revise') {
          console.log('   🔄 Manager javítást kér...\n');
          console.log(`   Feedback: ${managerReview.feedback}\n`);

          // Iterációs ciklus
          const revisionResult = await this.manager.coordinateRevision(
            finalContent,
            managerReview
          );

          if (!revisionResult.success) {
            console.log(`   ❌ Sikertelen ${revisionResult.iterations} iteráció után\n`);
            return {
              success: false,
              reason: revisionResult.reason,
              content: revisionResult.content,
              iterations: revisionResult.iterations,
              lastFeedback: revisionResult.lastFeedback
            };
          }

          finalContent = revisionResult.content;
          managerReview = revisionResult.finalReview;
          console.log(`   ✅ Javítva ${revisionResult.iterations} iteráció után\n`);
        } else {
          console.log('   ✅ Manager jóváhagyta!\n');
        }
      }

      // ═══════════════════════════════════════════════════
      // PHASE 4: VÉGLEGESÍTÉS
      // ═══════════════════════════════════════════════════
      console.log('═══ PHASE 4: VÉGLEGESÍTÉS ═══\n');

      console.log('📸 Kép generálása...');
      const imagePath = await htmlToImage(finalContent.design.html, platform);
      console.log(`   ✅ Kép mentve: ${imagePath}\n`);

      // Final package
      return {
        success: true,
        content: {
          design: finalContent.design,
          copy: finalContent.copy,
          imagePath: imagePath,
          platform: platform
        },
        scores: {
          qc: finalContent.qcReport?.overallScore || qcReport.overallScore,
          manager: managerReview.managerScore
        },
        feedback: {
          qc: finalContent.qcReport || qcReport,
          manager: managerReview
        },
        readyForApproval: true
      };

    } catch (error) {
      console.error('❌ Hiba történt:', error.message);
      return {
        success: false,
        reason: error.message,
        error: error
      };
    }
  }

  /**
   * Poszt közzététele Publer-en keresztül
   *
   * @param {Object} content - A tartalom objektum
   * @param {Date|null} scheduleTime - Ütemezési időpont (null = azonnali)
   * @returns {Object} Publer API válasz
   */
  async publishPost(content, scheduleTime = null) {
    if (!this.publer) {
      throw new Error('Publer API nincs konfigurálva. Állítsd be a PUBLER_API_KEY környezeti változót.');
    }

    const { imagePath, copy, platform } = content;

    // Caption összeállítása hashtagekkel
    const hashtags = (copy.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    const fullCaption = `${copy.caption}\n\n${hashtags}`;

    console.log(`📤 Posztolás: ${platform}...`);

    const result = await this.publer.schedulePost(
      platform,
      imagePath,
      fullCaption,
      scheduleTime
    );

    if (scheduleTime) {
      console.log(`   ✅ Ütemezve: ${scheduleTime.toLocaleString('hu-HU')}`);
    } else {
      console.log('   ✅ Sikeresen posztolva!');
    }

    return result;
  }

  /**
   * Brand kontextus betöltése
   */
  async loadBrandContext() {
    const brandContext = {};

    try {
      const aboutPath = path.join(process.cwd(), 'brand', 'about.md');
      brandContext.about = await fs.readFile(aboutPath, 'utf-8');
      console.log('   📄 about.md betöltve');
    } catch (e) {
      console.log('   ⚠️  about.md nem található');
    }

    try {
      const voicePath = path.join(process.cwd(), 'brand', 'voice-tone.md');
      brandContext.voiceTone = await fs.readFile(voicePath, 'utf-8');
      console.log('   📄 voice-tone.md betöltve');
    } catch (e) {
      console.log('   ⚠️  voice-tone.md nem található');
    }

    try {
      const visualPath = path.join(process.cwd(), 'brand', 'visual-guide.md');
      brandContext.visualGuide = await fs.readFile(visualPath, 'utf-8');
      console.log('   📄 visual-guide.md betöltve');
    } catch (e) {
      console.log('   ⚠️  visual-guide.md nem található');
    }

    return brandContext;
  }

  /**
   * Template képek betöltése
   */
  async loadTemplates() {
    const templates = {
      instagram: [],
      linkedin: []
    };

    for (const platform of ['instagram', 'linkedin']) {
      try {
        const templateDir = path.join(process.cwd(), 'templates', platform);
        const files = await fs.readdir(templateDir);

        const imageFiles = files.filter(f =>
          f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
        );

        templates[platform] = imageFiles.map(f => path.join(templateDir, f));

        if (imageFiles.length > 0) {
          console.log(`   📁 ${platform}: ${imageFiles.length} sablon`);
        }
      } catch (e) {
        // Nincs ilyen mappa - nem baj
      }
    }

    return templates;
  }
}

export default SocialWorkflow;
