#!/usr/bin/env node

/**
 * ExpertFlow Social Media Assistant - Interactive CLI
 */

import 'dotenv/config';
import inquirer from 'inquirer';
import chalk from 'chalk';
import open from 'open';
import { SocialWorkflow } from './workflow.js';
import path from 'path';
import fs from 'fs/promises';

// Banner
function showBanner() {
  console.clear();
  console.log(chalk.blue.bold(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     ${chalk.white('Expert Flow Social Media Assistant')}              ║
║     ${chalk.gray('Instagram & LinkedIn posztok készítése')}           ║
║                                                       ║
║     ${chalk.cyan('Powered by Claude AI')}                             ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`));
}

// Fő menü
async function mainMenu() {
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: chalk.cyan('Mit szeretnél csinálni?'),
    choices: [
      { name: '📝 Új poszt készítése', value: 'create' },
      { name: '📁 Korábbi posztok megtekintése', value: 'history' },
      { name: '⚙️  Beállítások ellenőrzése', value: 'settings' },
      new inquirer.Separator(),
      { name: '❌ Kilépés', value: 'exit' }
    ]
  }]);

  return action;
}

// Poszt készítése
async function createPost(workflow) {
  console.log('\n');

  // 1. Poszt ötlet bekérése
  const { contentIdea } = await inquirer.prompt([{
    type: 'input',
    name: 'contentIdea',
    message: chalk.cyan('💡 Mi legyen a poszt témája?'),
    validate: input => {
      if (input.length < 10) {
        return 'Kérlek, adj meg legalább 10 karaktert!';
      }
      return true;
    }
  }]);

  // 2. Platform választás
  const { platform } = await inquirer.prompt([{
    type: 'list',
    name: 'platform',
    message: chalk.cyan('📱 Melyik platformra?'),
    choices: [
      { name: '📸 Instagram (1080x1080)', value: 'instagram' },
      { name: '💼 LinkedIn (1200x627)', value: 'linkedin' },
      { name: '🔄 Mindkettő', value: 'both' }
    ]
  }]);

  // 3. Generálás
  const platforms = platform === 'both' ? ['instagram', 'linkedin'] : [platform];
  const results = [];

  for (const plt of platforms) {
    console.log(chalk.yellow(`\n⏳ ${plt.toUpperCase()} poszt készítése...\n`));
    console.log(chalk.gray('─'.repeat(50)));

    const result = await workflow.createPost(contentIdea, plt);

    if (result.success) {
      results.push({ platform: plt, ...result });
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.green.bold(`\n✅ ${plt.toUpperCase()} poszt elkészült!`));
      console.log(chalk.gray(`   QC Score: ${result.scores.qc}/100`));
      console.log(chalk.gray(`   Manager Score: ${result.scores.manager}/100\n`));
    } else {
      console.log(chalk.red(`\n❌ ${plt.toUpperCase()} poszt sikertelen`));
      console.log(chalk.gray(`   Hiba: ${result.reason}\n`));
    }
  }

  // 4. Előnézet és jóváhagyás
  for (const result of results) {
    await reviewPost(result, workflow);
  }

  return results;
}

// Poszt átnézése és jóváhagyása
async function reviewPost(result, workflow) {
  console.log(chalk.cyan.bold(`\n═══ ${result.platform.toUpperCase()} POSZT ELŐNÉZET ═══\n`));

  // Caption megjelenítése
  console.log(chalk.white('📝 Caption:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(result.content.copy.caption);
  console.log(chalk.gray('─'.repeat(50)));

  // Hashtags
  if (result.content.copy.hashtags && result.content.copy.hashtags.length > 0) {
    console.log(chalk.white('\n#️⃣  Hashtags:'));
    console.log(chalk.blue(result.content.copy.hashtags.map(h => `#${h}`).join(' ')));
  }

  // Hook és CTA
  if (result.content.copy.hook) {
    console.log(chalk.white('\n🎣 Hook (első sor):'));
    console.log(chalk.yellow(result.content.copy.hook));
  }

  if (result.content.copy.cta) {
    console.log(chalk.white('\n📢 CTA:'));
    console.log(chalk.green(result.content.copy.cta));
  }

  // Scores
  console.log(chalk.white('\n📊 Pontszámok:'));
  console.log(`   QC: ${getScoreEmoji(result.scores.qc)} ${result.scores.qc}/100`);
  console.log(`   Manager: ${getScoreEmoji(result.scores.manager)} ${result.scores.manager}/100`);

  // Kép megtekintése
  const { viewImage } = await inquirer.prompt([{
    type: 'confirm',
    name: 'viewImage',
    message: chalk.cyan('🖼️  Megnézed a generált képet?'),
    default: true
  }]);

  if (viewImage) {
    try {
      await open(result.content.imagePath);
      console.log(chalk.gray(`   Kép megnyitva: ${result.content.imagePath}`));
      // Várunk, hogy a user megnézze
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      console.log(chalk.yellow(`   ⚠️  Nem sikerült megnyitni: ${result.content.imagePath}`));
    }
  }

  // Döntés
  const { decision } = await inquirer.prompt([{
    type: 'list',
    name: 'decision',
    message: chalk.cyan.bold('\n🤔 Mit szeretnél tenni?'),
    choices: [
      { name: '✅ Jóváhagyom - MOST posztold!', value: 'publish_now' },
      { name: '📅 Jóváhagyom - de ütemezd később', value: 'schedule' },
      { name: '💾 Csak mentés (nem posztolom)', value: 'save' },
      { name: '❌ Elutasítom', value: 'reject' }
    ]
  }]);

  switch (decision) {
    case 'publish_now':
      await handlePublish(result, workflow, null);
      break;

    case 'schedule':
      await handleSchedule(result, workflow);
      break;

    case 'save':
      console.log(chalk.green(`\n💾 Poszt mentve: ${result.content.imagePath}`));
      console.log(chalk.gray('   A caption a konzolban látható fent.\n'));
      break;

    case 'reject':
      console.log(chalk.red(`\n❌ ${result.platform.toUpperCase()} poszt elutasítva\n`));
      break;
  }
}

// Közzététel kezelése
async function handlePublish(result, workflow, scheduleTime) {
  try {
    console.log(chalk.yellow('\n📤 Posztolás folyamatban...'));
    await workflow.publishPost(result.content, scheduleTime);
    console.log(chalk.green.bold(`\n🎉 ${result.platform.toUpperCase()} - Sikeresen posztolva!\n`));
  } catch (error) {
    console.log(chalk.red(`\n❌ Hiba a posztolás során: ${error.message}`));
    console.log(chalk.yellow('   Tipp: Ellenőrizd a Buffer API beállításokat a .env fájlban\n'));
  }
}

// Ütemezés kezelése
async function handleSchedule(result, workflow) {
  const { scheduleTime } = await inquirer.prompt([{
    type: 'input',
    name: 'scheduleTime',
    message: chalk.cyan('📅 Mikor posztoljam? (YYYY-MM-DD HH:MM formátumban)'),
    default: getDefaultScheduleTime(),
    validate: input => {
      const date = new Date(input.replace(' ', 'T'));
      if (isNaN(date.getTime())) {
        return 'Hibás dátum formátum! Használd: YYYY-MM-DD HH:MM';
      }
      if (date <= new Date()) {
        return 'A dátumnak a jövőben kell lennie!';
      }
      return true;
    }
  }]);

  const date = new Date(scheduleTime.replace(' ', 'T'));
  await handlePublish(result, workflow, date);
}

// Beállítások ellenőrzése
async function checkSettings() {
  console.log(chalk.cyan.bold('\n⚙️  BEÁLLÍTÁSOK ELLENŐRZÉSE\n'));

  // API kulcsok
  console.log(chalk.white('🔑 API Kulcsok:'));
  checkEnvVar('ANTHROPIC_API_KEY', 'Claude API');
  checkEnvVar('BUFFER_ACCESS_TOKEN', 'Buffer API');

  // Buffer profile-ok
  console.log(chalk.white('\n📱 Buffer Profile-ok:'));
  checkEnvVar('INSTAGRAM_PROFILE_ID', 'Instagram');
  checkEnvVar('LINKEDIN_PROFILE_ID', 'LinkedIn');

  // Brand fájlok
  console.log(chalk.white('\n📄 Brand fájlok:'));
  await checkBrandFile('about.md');
  await checkBrandFile('voice-tone.md');
  await checkBrandFile('visual-guide.md');

  // Sablonok
  console.log(chalk.white('\n🖼️  Sablonok:'));
  await checkTemplates('instagram');
  await checkTemplates('linkedin');

  console.log('');

  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: chalk.gray('Nyomj Enter-t a folytatáshoz...')
  }]);
}

// Environment variable ellenőrzése
function checkEnvVar(name, label) {
  const value = process.env[name];
  if (value) {
    console.log(chalk.green(`   ✅ ${label}: Beállítva`));
  } else {
    console.log(chalk.red(`   ❌ ${label}: HIÁNYZIK (${name})`));
  }
}

// Brand fájl ellenőrzése
async function checkBrandFile(filename) {
  try {
    const filePath = path.join(process.cwd(), 'brand', filename);
    const stat = await fs.stat(filePath);
    console.log(chalk.green(`   ✅ ${filename}: OK (${stat.size} byte)`));
  } catch (e) {
    console.log(chalk.yellow(`   ⚠️  ${filename}: Nem található (alapértelmezett lesz használva)`));
  }
}

// Sablonok ellenőrzése
async function checkTemplates(platform) {
  try {
    const templateDir = path.join(process.cwd(), 'templates', platform);
    const files = await fs.readdir(templateDir);
    const images = files.filter(f => f.match(/\.(png|jpg|jpeg)$/i));
    if (images.length > 0) {
      console.log(chalk.green(`   ✅ ${platform}: ${images.length} sablon`));
    } else {
      console.log(chalk.yellow(`   ⚠️  ${platform}: Nincs sablon (alapértelmezett stílus)`));
    }
  } catch (e) {
    console.log(chalk.yellow(`   ⚠️  ${platform}: Mappa nem található`));
  }
}

// Korábbi posztok
async function viewHistory() {
  console.log(chalk.cyan.bold('\n📁 KORÁBBI POSZTOK\n'));

  try {
    const outputDir = path.join(process.cwd(), 'output');
    const files = await fs.readdir(outputDir);
    const images = files.filter(f => f.match(/\.(png|jpg|jpeg|html)$/i));

    if (images.length === 0) {
      console.log(chalk.gray('   Még nincs mentett poszt.\n'));
    } else {
      console.log(chalk.white(`   ${images.length} fájl található:\n`));
      for (const file of images.slice(-10)) { // Utolsó 10
        const stat = await fs.stat(path.join(outputDir, file));
        const date = new Date(stat.mtime).toLocaleString('hu-HU');
        console.log(chalk.gray(`   • ${file} (${date})`));
      }
      console.log('');
    }
  } catch (e) {
    console.log(chalk.gray('   Output mappa nem található.\n'));
  }

  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: chalk.gray('Nyomj Enter-t a folytatáshoz...')
  }]);
}

// Helper: Score emoji
function getScoreEmoji(score) {
  if (score >= 90) return '🌟';
  if (score >= 80) return '✅';
  if (score >= 70) return '⚠️';
  return '❌';
}

// Helper: Alapértelmezett ütemezési idő (holnap reggel 9)
function getDefaultScheduleTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.toISOString().slice(0, 16).replace('T', ' ');
}

// Main
async function main() {
  showBanner();

  // Workflow inicializálása
  const workflow = new SocialWorkflow();

  let running = true;

  while (running) {
    const action = await mainMenu();

    switch (action) {
      case 'create':
        await createPost(workflow);
        break;

      case 'history':
        await viewHistory();
        break;

      case 'settings':
        await checkSettings();
        break;

      case 'exit':
        running = false;
        console.log(chalk.green.bold('\n👋 Viszlát! Sikeres posztolást!\n'));
        break;
    }
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Váratlan hiba:'), error.message);
  process.exit(1);
});

// Run
main().catch(console.error);
