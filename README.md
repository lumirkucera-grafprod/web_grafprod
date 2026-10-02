# GRAFIKAPRODUKCE — portfolio site

Statický jednostránkový web podle PDF mockupu (`web_grafikaprodukce`).

## Otevření

```bash
cd c:\web_grafprod
python -m http.server 8765
# http://localhost:8765/
```

(Layout je embedded v `assets/layout.embedded.js` — funguje i přes `file://`. Lokální server je volitelný.)

## Nasazení na Vercel

Statický web — žádný build. Kořen projektu = `index.html`.

### CLI (rychle)

```bash
npm i -g vercel
cd c:\web_grafprod
vercel
```

Pro produkci: `vercel --prod`.

V dashboardu: Framework Preset **Other**, Build Command prázdný, Output Directory `.` (nebo prázdné).

### Git + automatický deploy

1. Inicializuj repo a pushni na GitHub/GitLab.
2. Na [vercel.com/new](https://vercel.com/new) importuj projekt.
3. Preset **Other**, bez buildu — Vercel nasadí kořen jako static.

`vercel.json` nastavuje `cleanUrls` a cache hlavičky pro galerii (dlouhodobě) a CSS/JS/JSON.

## Struktura

- `index.html` — stránka (sticky left chrome, scroll jen v `.main`)
- `styles.css` — černá / zlatá `#C5B396`, Montserrat
- `app.js` — kategorie + o nás / kontakt + masonry z layout (embedded / fetch)
- `assets/logo.png` — logo
- `assets/layout.embedded.js` — `window.GP_LAYOUT` + `window.GP_MANIFEST` (file:// safe)
- `assets/layout.json` — **změřené** bboxy fotek z PDF (x,y,w,h relativně ke gallery sloupci; reference + http override)
- `assets/gallery/{commercial,residential,branding,mirror}/` — cropnuté fotky

## Galerie — measured masonry

PDF page 1–4 = 4 kategorie. Každá fotka má v Illustratoru přesný placement;
layout **není** jednoduché equal-height řádky, ale staggered masonry.

`layout.json` obsahuje pro každou kategorii `galleryW/H`, gutterX/Y a `items[]`
s relativními souřadnicemi. CSS absolutně pozicuje figury v `%` rodiče
(`aspect-ratio` = galleryW/galleryH), takže páry/mezery sedí row-by-row s PDF.

Počty (z aktuálního PDF): commercial 29 · residential 15 · branding 18 · mirror 8.

## Ovládání

- Kategorie vlevo přepínají galerii
- `o nás` / `kontakt` — text + formulář (page 5/6)
- Šipky vpravo scrollují `.main`
- Logo vrací na galerii
