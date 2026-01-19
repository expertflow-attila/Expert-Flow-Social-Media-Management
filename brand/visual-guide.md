# Expert Flow — Vizuális Stílus Útmutató

## Általános Jellemzők

A brand vizuális identitása **minimalista, elegáns és professzionális**. Tiszta vonalak, bőséges whitespace, és erős tipográfiai hierarchia jellemzi.

## Színpaletta

### Elsődleges színek
| Szín | Hex | Használat |
|------|-----|-----------|
| Fehér | `#FFFFFF` | Háttér (fő szín) |
| Fekete | `#000000` | Szöveg, címsorok |
| Sötétszürke | `#1A1A1A` | Alternatív szöveg |

### Másodlagos színek (akcentusok)
| Szín | Hex | Használat |
|------|-----|-----------|
| Világosszürke | `#F5F5F5` | Háttér variáció |
| Középszürke | `#888888` | Alcímek, meta szöveg |

### Stílus
- **Monokróm megközelítés** - fekete-fehér dominál
- Színes akcentusok csak nagyon ritkán, indokolt esetben
- A tisztaság és egyszerűség fontosabb, mint a figyelemfelkeltő színek

## Tipográfia

### Betűtípus
- **Címsor (Headline)**: Serif betűtípus (pl. Playfair Display, Times New Roman, Georgia)
- **Alcím és szöveg**: Sans-serif (pl. Inter, Helvetica, Arial)

### Betűméretek (Instagram 1080x1080)
| Elem | Méret | Stílus |
|------|-------|--------|
| Főcím | 72-96px | Serif, Regular/Bold |
| Alcím | 32-40px | Sans-serif, Regular |
| Meta szöveg | 20-24px | Sans-serif, Regular |
| @handle | 16-20px | Sans-serif, Regular |

### Tipográfiai szabályok
- Címsorok lehetnek **többsorosak** (line-height: 1.1-1.2)
- Pont a címsor végén (stilisztikai elem)
- Balra igazítás alapértelmezett
- Nagy betűköz kerülendő

## Layout és Elrendezés

### Instagram (1080x1080px)
```
┌─────────────────────────────┐
│                             │
│   Főcím                     │
│   több sorban.              │
│                             │
│                             │
│   Alcím vagy                │
│   sub-heading.              │
│                             │
│                             │
│                             │
│   Post by         →         │
│   @expertflow.hu            │
└─────────────────────────────┘
```

### Elrendezési típusok

**1. Klasszikus (Title)**
- Főcím bal felső sarokban
- Alcím középen vagy alul
- Handle és nyíl az alján

**2. Központos**
- Főcím középen
- Szimmetrikus elrendezés

**3. Kettős oszlop**
- Bal oldalon cím
- Jobb oldalon alcím vagy kiegészítés

### Margók és padding
- Külső margó: 60-80px (körben)
- Elemek közötti távolság: 40-60px
- Bőséges whitespace!

## Design Elemek

### Nyíl ikon (→)
- Jobbra mutató nyíl a jobb alsó sarokban
- Carousel/swipe indikátor
- Méret: 24-32px

### Handle megjelenítés
```
Post by
@expertflow.hu
```
- Bal alsó sarok
- Kis betűméret
- Szürke vagy fekete szín

## Sablon Típusok

### 1. Title/Cover sablon
- Erős headline középpontban
- Minimális egyéb elem
- Carousel első slide-jához ideális

### 2. Content slide
- Rövidebb címsor
- Több hely a tartalomnak
- Lista elemek, bullet pointok

### 3. Quote/Idézet
- Nagyméretű idézőjel opcionális
- Központos elrendezés
- Szerző név alul

### 4. CTA (Call-to-Action)
- Egyértelmű felhívás
- Linkelés jelzése
- "Link a bióban" típusú záró slide

## LinkedIn specifikus

A LinkedIn posztok (1200x627px) esetén:
- Ugyanaz a minimalista stílus
- Szélesebb formátum → horizontális elrendezés
- Professzionálisabb hangvétel a szövegben
- Kevesebb vagy semmi emoji a képen

## Amit KERÜLJ

❌ Gradiens háttér
❌ Túl sok szín
❌ Stock fotók a háttérben
❌ Zsúfolt layout
❌ Fancy effektek (árnyékok, tükröződések)
❌ Clickbait stílusú vizuálok
❌ Túl sok betűtípus (max 2)
❌ Emoji a képen (a captionben OK)

## Amit HASZNÁLJ

✅ Tiszta fehér háttér
✅ Erős tipográfia
✅ Bőséges whitespace
✅ Egyértelmű hierarchia
✅ Konzisztens elrendezés
✅ Professzionális, de barátságos megjelenés

## Példa CSS (HTML generáláshoz)

```css
/* Alap stílus */
body {
  background: #FFFFFF;
  color: #000000;
  font-family: 'Inter', system-ui, sans-serif;
  margin: 0;
  padding: 60px;
}

/* Főcím */
h1 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 72px;
  font-weight: 400;
  line-height: 1.1;
  margin: 0 0 40px 0;
}

/* Alcím */
h2 {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 32px;
  font-weight: 400;
  line-height: 1.3;
  margin: 0;
}

/* Meta/Handle */
.meta {
  font-size: 18px;
  color: #000000;
  position: absolute;
  bottom: 60px;
  left: 60px;
}

/* Nyíl */
.arrow {
  font-size: 32px;
  position: absolute;
  bottom: 60px;
  right: 60px;
}
```

## Google Fonts használata HTML-ben

```html
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap');
</style>
```
