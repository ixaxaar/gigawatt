# Writing the wiki

Pages are Markdown files in this folder; `node scripts/build-wiki.mjs` renders them into `site/wiki/*.html` (and rewrites `site/sitemap.xml`).
CI fails if the committed output is stale, so run the script and commit `site/` together with your edit.

- A page starts with `# Title`, then one italic line (the summary), then the body.
- Link pages with relative links: `[Power and cooling](power-and-cooling.md)`.
- Screenshots: reference `img/<name>.png`; the file must exist as `site/wiki/img/<name>.webp`. Capture with the in-app hook:
  `GW_AUTOSTART=operator GW_AUTOPLAY=operator:30 GW_SHOT=/tmp/x.png GW_SHOT_AT=7 godot --path godot`, then
  `magick /tmp/x.png -resize 1600x -quality 80 site/wiki/img/<name>.webp`. Story cards: `GW_CARD=chapter:2` or `GW_CARD=dilemma:0`.
- Describe the game as it is. No history phrasing, and no exact balance numbers (prices, margins, payback): those get retuned.
