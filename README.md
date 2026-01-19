# Expert Flow Social Media Assistant

AI-alapú social media asszisztens Instagram és LinkedIn posztok készítéséhez magyar nyelven.

## Funkciók

- 🎨 **Designer** - Vizuális design készítése a brand sablonok alapján
- ✍️ **Copywriter** - Magyar nyelvű caption írása a brand hangnemében
- 🔍 **Quality Control** - Automatikus minőségellenőrzés
- 👔 **Manager** - Végső átnézés és iteratív javítás

## Gyors Start

### 1. Telepítés

```bash
cd expertflow-social
npm install
```

### 2. Konfiguráció

Másold le a `.env.example` fájlt `.env` néven és töltsd ki:

```bash
cp .env.example .env
```

**Szükséges:**
- `ANTHROPIC_API_KEY` - Claude API kulcs

**Opcionális (posztoláshoz):**
- `BUFFER_ACCESS_TOKEN` - Buffer API token
- `INSTAGRAM_PROFILE_ID` - Instagram profil ID
- `LINKEDIN_PROFILE_ID` - LinkedIn profil ID

### 3. Brand információk

Töltsd ki a `brand/` mappában lévő fájlokat:
- `about.md` - Vállalkozás bemutatkozás ✅
- `voice-tone.md` - Hangnem és stílus ✅
- `visual-guide.md` - Vizuális útmutató ✅

### 4. Sablonok (opcionális)

Helyezz el sablon képeket (PNG/JPG):
- `templates/instagram/` - Instagram sablonok (1080x1080px)
- `templates/linkedin/` - LinkedIn sablonok (1200x627px)

### 5. Indítás

```bash
npm start
```

## Használat

1. **Téma megadása** - Írd le a poszt ötletét magyarul
2. **Platform választás** - Instagram, LinkedIn vagy mindkettő
3. **Generálás** - A csapat elkészíti a tartalmat
4. **Előnézet** - Megnézed a képet és a szöveget
5. **Döntés** - Jóváhagyás, ütemezés vagy elutasítás

## Workflow

```
💡 Ötlet
    ↓
👨‍🎨 Designer (design készítés)
    ↓
✍️ Copywriter (szöveg írás)
    ↓
🔍 Quality Control (ellenőrzés)
    ↓
👔 Manager (végső döntés)
    ↓
[Ha javítás kell → vissza a megfelelő role-hoz]
    ↓
✅ Jóváhagyás → Posztolás/Ütemezés
```

## Mappastruktúra

```
expertflow-social/
├── brand/                  # Brand információk
│   ├── about.md           # Vállalkozás leírás
│   ├── voice-tone.md      # Hangnem és stílus
│   └── visual-guide.md    # Vizuális útmutató
│
├── templates/              # Design sablonok
│   ├── instagram/         # 1080x1080px PNG képek
│   └── linkedin/          # 1200x627px PNG képek
│
├── output/                 # Generált tartalmak
│
├── src/
│   ├── roles/
│   │   ├── designer.js    # Design készítő
│   │   ├── copywriter.js  # Szövegíró
│   │   ├── quality-control.js  # Minőségellenőrző
│   │   └── manager.js     # Manager
│   │
│   ├── utils/
│   │   └── html-to-image.js  # HTML → PNG konverter
│   │
│   ├── workflow.js        # Fő workflow
│   ├── buffer-api.js      # Buffer integráció
│   └── cli.js             # CLI interface
│
├── package.json
├── .env.example
└── .gitignore
```

## Pontszámok

A rendszer két szinten értékeli a tartalmat:

### QC Score (Quality Control)
- **Brand Alignment** (30 pont) - Brand illeszkedés
- **Minőség** (30 pont) - Design és szöveg minőség
- **Platform Optimalizáció** (20 pont) - Platform-specifikus szabályok
- **Magyar nyelv** (20 pont) - Nyelvhelyesség

**Minimum: 80 pont a jóváhagyáshoz**

### Manager Score
- Friss szemmel történő átnézés
- Célközönség szempontjából értékelés
- Végső döntés: approve vagy revise

## Iteráció

Ha a tartalom nem üti meg a küszöböt:
1. Manager megadja a javítási útmutatást
2. Designer és/vagy Copywriter javít
3. QC újra ellenőriz
4. Manager újra átnézi
5. Maximum 3 iteráció

## Buffer Integráció

A Buffer API-n keresztül közvetlenül posztolhatsz vagy ütemezhetsz:

1. Regisztrálj a [Buffer](https://buffer.com)-re
2. Hozd létre az API tokent
3. Kösd össze az Instagram/LinkedIn fiókjaidat
4. Add meg a profile ID-kat a `.env` fájlban

## Tippek

- **Részletes ötlet** = Jobb eredmény. Ne csak "AI poszt", hanem "Hogyan segít az AI a szakértőknek időt spórolni"
- **Sablonok** - Minél több sablon, annál konzisztensebb a design
- **Brand fájlok** - Részletes brand info = pontosabb tartalom

## Hibakeresés

### "ANTHROPIC_API_KEY hiányzik"
Ellenőrizd a `.env` fájlt és hogy van-e benne az API kulcs.

### "Puppeteer hiba"
Telepítsd a Chromium-ot: `npx puppeteer browsers install chrome`

### "Buffer API hiba"
Ellenőrizd a token érvényességét és a profile ID-kat.

## Licensz

MIT

---

**Expert Flow** - AI-alapú rendszerek magyar szakértő vállalkozóknak
