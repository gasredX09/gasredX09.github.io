# AGENTS.md

Read `CLAUDE.md` in this directory before working in this repository. It
contains additional project context and instructions. Everything there applies
alongside this file.

Personal site for Aryan Sharan Guda. Plain static HTML, CSS, and JS. No build
step, no dependencies, no framework, no package.json. Edit the files directly.

## This repo is public and auto-deploys

Pushing to `master` publishes to <https://gasredx09.github.io/> within about a
minute. There is no staging. Two consequences:

1. **Never commit personal data.** The CV in `~/phd/` contains a phone number.
   Reference notes about Aryan live in `~/phd/`, deliberately outside this repo.
   Do not copy them in.
2. Verify before pushing, not after. See the checklist below.

## Files

```
index.html          the site: About, Affiliations, Skills
other.html          out-of-field projects; unlinked from nav and noindex
style.css           all styling
script.js           mobile menu + nav active state, nothing else
assets/logos/*.png  affiliation logos, official sources only
```

The Research section was removed while the site is reworked. Its markup is
recoverable from commit `c5441d0` if any of it is wanted verbatim.

## Preview

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

There is nothing to build. Opening `index.html` via `file://` also works,
except that relative asset paths break if the file is copied outside the repo.

## Hard rules

- **No third-party requests.** The page currently makes zero. Google Fonts was
  removed in favour of the system stack. Do not reintroduce CDN fonts, icon
  fonts, or analytics without asking.
- **No em dashes anywhere**, in code, comments, commit messages, or site copy.
  Not the `—` character, not `--`. Use a period, comma, colon, parentheses, or
  split the sentence. Number ranges use a plain hyphen.
- **Never invent facts.** Dates, metrics, and claims come from the CV, the repo
  READMEs, or GitHub API history. If a date is unknown, ask rather than
  estimating. Ranges derived from repo `created_at` / `pushed_at` are
  acceptable if labelled as such.
- **Logos come from the organisation's own site.** Never from kisspng,
  cleanpng, or similar; they bake watermarks and fake transparency
  checkerboards into the pixels. Prefer a published reverse or white variant
  when one exists, since the background is dark.

## Conventions

- **Prose, not bullets.** Project cards use a single `.project-summary`
  paragraph saying what the thing does and how it decides, not a resume bullet
  list. The repo READMEs are the reference for voice.
- **Reverse chronological** within every section. Ongoing work first.
- **Typography follows GitHub**: system font stack, 16px body at 1.5, headings
  at 2em / 1.5em / 1.25em, weight 600.
- **Deliberately plain.** No scroll animations, gradient text, hover lifts, or
  glow shadows. This was a decision, not an oversight. The site is meant to sit
  alongside academic pages such as bjing2016.github.io and gcorso.github.io.
- Images carry explicit `width` and `height` matching the file, plus
  `loading="lazy"` and `decoding="async"`.
- Decorative logos take `alt=""` because the organisation name is already
  adjacent as text.

## Verify before pushing

```bash
node --check script.js

# every external link resolves (LinkedIn returns 999, which is their bot
# block, not a failure)
grep -ohE 'href="https?://[^"]*"' index.html other.html \
  | sed 's/href="//;s/"$//' | sort -u \
  | while read -r u; do
      printf "%s  %s\n" "$(curl -sL -o /dev/null -w '%{http_code}' \
        -A 'Mozilla/5.0' --max-time 20 "$u")" "$u"
    done
```

Also confirm, by script rather than by eye:

- every `<img>`'s declared `width`/`height` matches the actual file
- every in-page `#anchor` resolves to a real `id` (this has broken twice when
  sections were renamed or removed, leaving dead nav links on `other.html`)
- no unused CSS selectors and no unused `<symbol>` icons remain
- tag balance on both pages

**Then look at a real render.** Screenshots have caught bugs that every static
check passed: a see-through mobile dropdown, a nav still listing deleted
sections, a logo cropped in half.

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --virtual-time-budget=4000 --window-size=1280,1000 \
  --screenshot=/tmp/shot.png "file://$PWD/index.html"
```

## Headless Chrome gotchas

These cost real time to rediscover:

- **Viewport clamps to 500px minimum width.** `--window-size=390,844` still
  lays out at 500px and crops the canvas at 390, so content appears cut off and
  offscreen elements look missing. Render mobile at 500px wide.
- **`#fragment` scroll is ignored** in screenshot mode. To capture a section,
  write a temp copy with the earlier sections `display:none`.
- **`file://` cannot load a stylesheet from another directory.** Put temp
  preview copies inside the repo so relative paths resolve, then delete them.
- Injected scripts that drive the page must register on `DOMContentLoaded`
  *after* `script.js`, or the handler is not attached yet.
- **`--disable-javascript` is a no-op.** It silently does nothing and the page
  still runs its scripts, so any "verified without JS" claim made with it is
  worthless. `--blink-settings=scriptEnabled=false` is worse: it produces an
  empty dump. To test the no-JS path, write a temp copy with `<script>` blocks
  stripped out and render that.
- **`requestAnimationFrame` never fires** here, and **`window.scrollTo` is a
  no-op** (`scrollY` stays 0). Anything scroll-driven or rAF-throttled cannot
  be exercised headlessly. Initial paint still works because the code also
  calls its render/update path directly at init. Verify scroll behaviour in a
  real browser; do not conclude from a headless screenshot that it is broken.

## GitHub Pages caching, hit three times

Pages serves every asset with `cache-control: max-age=600` and there is no way
to change that. For ten minutes after a push a browser can hold the old CSS or
JS while getting the new HTML. This has caused, in order:

- the nav brand rendering at ~150px, because new HTML met a stylesheet cached
  before `.brand-mark` existed and an inline SVG with no width or height
  attributes falls back to its intrinsic size;
- a corrected rotation axis looking like a no-op;
- a halved animation speed looking unchanged.

Two rules follow. **Give inline SVG explicit `width` and `height` attributes**,
or better, use text, so a missing rule cannot blow out the layout. And when a
change appears not to have taken effect, **check what the CDN is actually
serving before assuming the code is wrong**:

```bash
curl -s "https://gasredx09.github.io/style.css?cb=$RANDOM" | grep -A3 'the-rule'
curl -sI "https://gasredx09.github.io/style.css" | grep -iE 'age:|last-modified'
```

If the server has the new bytes, it is a stale browser cache and a hard reload
fixes it. Version queries on asset URLs (`script.js?v=7`) would end this for
good, at the cost of remembering to bump them; not currently used.

## Pages builds can fail while reporting "building"

A build sat in `building` for over an hour, then flipped to `errored` with only
"Page build failed" and no detail. The same commit built fine when re-run, so
it was transient on GitHub's side. Re-trigger without an empty commit:

```bash
gh api -X POST repos/gasredX09/gasredX09.github.io/pages/builds
```

Treat anything still `building` after a few minutes as suspect rather than slow.

## CSS gotcha, already hit once

A `backdrop-filter` element nested inside another `backdrop-filter` element
does not composite its own background. The mobile dropdown rendered
see-through over the hero text. It uses a solid background now. Do not
reintroduce a translucent panel inside the navbar.

## Git

- Commit only when asked. Branch first if on `master`.
- End commit messages with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- Message body explains *why*, not just what. Existing history is the model.

## Related

- `~/phd/ARYAN-PROFILE.md` canonical facts: education, experience, every
  project mapped to its repo, known errors in the CV.
- `~/phd/CMU-CAREER-GUIDANCE.md` the CMU rules his CV and applications are
  graded against, including the policy that AI must not draft application
  essays.
- Local directory is still `~/personal-website` while the repo is
  `gasredX09.github.io`. Cosmetic only.
