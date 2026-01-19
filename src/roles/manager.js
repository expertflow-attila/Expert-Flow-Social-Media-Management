/**
 * Manager Role (Claude)
 * Végső átnézés tiszta szemmel, döntés javításról vagy jóváhagyásról
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

export class Manager {
  constructor(brandContext) {
    this.brandContext = brandContext;
    this.client = new Anthropic();

    // Ezeket a workflow.js fogja beállítani
    this.designer = null;
    this.copywriter = null;
    this.qc = null;
  }

  /**
   * Végső review
   *
   * @param {Object} content - { design, copy, platform, qcReport }
   * @returns {Object} { decision: 'approve'|'revise', feedback, managerScore, ... }
   */
  async finalReview(content) {
    const { design, copy, platform, qcReport } = content;

    const prompt = `Te vagy az ExpertFlow Social Media Manager.
Nézd át ezt a ${platform} posztot TISZTA SZEMMEL, friss nézőpontból.

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

=== QUALITY CONTROL RIPORT ===
Overall Score: ${qcReport.overallScore}/100
Issues: ${(qcReport.issues || []).join('; ')}
Feedback: ${qcReport.feedback || 'N/A'}

---

A TE FELADATOD - FRISS SZEMMEL NÉZD:

1. ELSŐ BENYOMÁS
   - Mi az első dolog, ami eszedbe jut?
   - Megáll rajta a tekinteted?
   - Értelmezed azonnal, miről szól?

2. CÉLKÖZÖNSÉG SZEMÉVEL
   - Egy magyar coach/tanácsadó/mentor hogyan reagálna?
   - Releváns nekik? Érdekes?
   - Megszólítja őket?

3. EXPERT FLOW MÉLTÓSÁG
   - Büszke lennél rá, ha ez menne ki?
   - Tükrözi az Expert Flow értékeit?
   - Professzionális és barátságos egyszerre?

4. VÉGSŐ KÉRDÉS
   - Van bármi, ami zavarná a célközönséget?
   - Van bármi "majdnem jó, de..." érzés?

DÖNTÉSI KRITÉRIUMOK:
- Ha QC 85+ ÉS neked is tetszik → APPROVE
- Ha van BÁRMI zavaró → REVISE
- Ha "majdnem jó, de..." → REVISE
- Légy SZIGORÚ! Csak a legjobb mehet ki!

VÁLASZ FORMÁTUM (CSAK VALID JSON):
{
  "decision": "approve",
  "managerScore": 90,
  "firstImpression": "Az első benyomás a posztról...",
  "feedback": "Részletes indoklás a döntésről...",
  "strengths": [
    "Erősség 1",
    "Erősség 2"
  ],
  "concerns": [
    "Aggály 1 (ha van)",
    "Aggály 2 (ha van)"
  ],
  "revisionNeeded": {
    "design": "Mit változtass a designon (ha revise)...",
    "copy": "Mit változtass a szövegen (ha revise)..."
  }
}`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const review = this.parseJSON(response.content[0].text);

    // Konzisztencia ellenőrzés
    if (review.decision === 'approve' && review.concerns && review.concerns.length > 0) {
      // Ha vannak aggályok, de approve - ellenőrizzük
      const hasSerious = review.concerns.some(c =>
        c.toLowerCase().includes('hiba') ||
        c.toLowerCase().includes('probléma') ||
        c.toLowerCase().includes('rossz')
      );
      if (hasSerious) {
        review.decision = 'revise';
        review.feedback += ' (Automatikus revise az aggályok miatt)';
      }
    }

    return review;
  }

  /**
   * Iterációs ciklus koordinálása
   * Ha revise kell, koordinálja az újragenerálást
   *
   * @param {Object} content - Jelenlegi tartalom
   * @param {Object} managerFeedback - Manager visszajelzése
   * @param {number} maxIterations - Maximum iterációk száma
   * @returns {Object} { success, content, iterations, reason? }
   */
  async coordinateRevision(content, managerFeedback, maxIterations = 3) {
    let iteration = 1;
    let currentContent = { ...content };
    let approved = false;
    let currentFeedback = managerFeedback;

    while (!approved && iteration <= maxIterations) {
      console.log(`   🔄 Iteráció ${iteration}/${maxIterations} - Javítás folyamatban...`);

      // Designer javítás ha kell
      if (currentFeedback.revisionNeeded?.design && this.designer) {
        console.log('      👨‍🎨 Designer javít...');
        currentContent.design = await this.designer.reviseDesign(
          currentContent.design,
          currentFeedback.revisionNeeded.design
        );
      }

      // Copywriter javítás ha kell
      if (currentFeedback.revisionNeeded?.copy && this.copywriter) {
        console.log('      ✍️  Copywriter javít...');
        currentContent.copy = await this.copywriter.reviseCopy(
          currentContent.copy,
          currentFeedback.revisionNeeded.copy
        );
      }

      // QC újraellenőrzés
      if (this.qc) {
        console.log('      🔍 QC újraellenőriz...');
        currentContent.qcReport = await this.qc.auditContent({
          design: currentContent.design,
          copy: currentContent.copy,
          platform: currentContent.platform
        });
        console.log(`      📊 Új QC Score: ${currentContent.qcReport.overallScore}/100`);

        // Ha QC elutasítja, nem is megyünk manager review-ra
        if (!currentContent.qcReport.approved) {
          console.log('      ❌ QC elutasította, további javítás szükséges');
          currentFeedback = {
            decision: 'revise',
            revisionNeeded: {
              design: currentContent.qcReport.improvements?.find(i => i.includes('design')) || '',
              copy: currentContent.qcReport.improvements?.find(i => i.includes('szöveg')) || currentContent.qcReport.improvements?.[0] || ''
            }
          };
          iteration++;
          continue;
        }
      }

      // Manager újraátnézés
      console.log('      👔 Manager újraértékel...');
      const newReview = await this.finalReview(currentContent);
      console.log(`      📊 Manager Score: ${newReview.managerScore}/100`);

      if (newReview.decision === 'approve') {
        approved = true;
        return {
          success: true,
          content: currentContent,
          iterations: iteration,
          finalReview: newReview
        };
      }

      currentFeedback = newReview;
      iteration++;
    }

    // Ha max iteráció után sem jó
    return {
      success: false,
      content: currentContent,
      iterations: iteration - 1,
      reason: 'Maximum iteráció elérve, manuális beavatkozás szükséges',
      lastFeedback: currentFeedback
    };
  }

  /**
   * Gyors döntés egyszerű esetekre
   *
   * @param {Object} content - Tartalom
   * @returns {Object} { quickApprove, reason }
   */
  async quickDecision(content) {
    const { qcReport } = content;

    // Ha QC score nagyon magas (95+), gyorsan approve
    if (qcReport.overallScore >= 95 && qcReport.approved) {
      return {
        quickApprove: true,
        reason: 'QC score kiváló (95+), gyors jóváhagyás'
      };
    }

    // Ha QC score túl alacsony (70-), egyből revise
    if (qcReport.overallScore < 70) {
      return {
        quickApprove: false,
        reason: `QC score túl alacsony (${qcReport.overallScore}), javítás szükséges`
      };
    }

    // Minden más esetben teljes review
    return {
      quickApprove: null,
      reason: 'Teljes manager review szükséges'
    };
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
    console.warn('⚠️  Manager JSON parse sikertelen, fallback használata');
    return {
      decision: 'revise',
      managerScore: 0,
      firstImpression: 'JSON parse hiba',
      feedback: 'Automatikus értékelés sikertelen - manuális ellenőrzés szükséges',
      strengths: [],
      concerns: ['JSON parse hiba'],
      revisionNeeded: {
        design: '',
        copy: 'Ellenőrizd manuálisan'
      }
    };
  }
}

export default Manager;
