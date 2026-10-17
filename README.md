# To my Paatu 🤍 — A Birthday Letter

A single-page, no-build birthday letter website. Tap the sealed envelope to open
it, then read the letter with a slow photo slideshow drifting behind the paper
and the song playing quietly in the background.

## Structure

```
index.html          the three scenes: sealed envelope, the letter, the ending
style.css           all styling (responsive, reduced-motion friendly)
script.js           envelope animation, slideshow, music, confetti
assets/
  photos/           26 photographs used by the backdrop slideshow
  stamp.jpg         the photo used as the postage stamp on the envelope
  music/            the background song (loops, no controls)
```

## Notes

- Pure HTML + CSS + a single vanilla JS file — no frameworks, no build step,
  no dependencies.
- All asset paths are relative, so the site works from any static host.
- Background music starts on the first tap of the envelope (browser autoplay
  rules require a user gesture) and then loops for the whole letter.
- The letter text is kept exactly as written, and stays selectable/copyable.

## Run locally

Just open `index.html`, or serve the folder:

```powershell
python -m http.server 8000
```

## Deploy to Vercel

```powershell
npx vercel --prod
```

Or import this repository at https://vercel.com/new — Vercel detects it as a
static site with no configuration needed.
