# CLAUDE.md

This file supplements the repository rules in `AGENTS.md`. `AGENTS.md` directs
agents here, so do not reread `AGENTS.md` when following that instruction.

## Notes specific to Claude Code

- The user's global `~/.claude/CLAUDE.md` also applies, in particular the
  no-em-dashes style rule. `AGENTS.md` restates it because other tools do not
  read the global file.
- Project memory lives at
  `~/.claude/projects/-Users-aryansharanreddyguda-personal-website/memory/`.
  `MEMORY.md` there indexes it. Two entries currently exist: a pointer to the
  reference docs in `~/phd/`, and a standing rule not to ghostwrite PhD
  application essays.
- The `gh` CLI is authenticated as `gasredX09` with `repo`, `user`,
  `workflow`, `read:org`, and `gist` scopes, so repo and profile metadata can
  be edited directly. Pinning repositories is not exposed by the API and must
  be done in the GitHub UI.
- `pandoc` and LibreOffice are not installed. Read `.docx` by unzipping
  `word/document.xml`. PDF text extracts fine with `pdftotext -layout`, which
  is far cheaper than rendering pages.
- Pillow and `pypdf` are available for image and PDF work.

## Open work

- Research section is hidden pending a rebuild as a real portfolio rather than
  a reformatted resume.
- Waiting on the user for: a photo, figures from his own projects, and a voice
  sample for the personality pass.
- Three strong repos are on neither the site nor the CV: `pLaTeX`,
  `cafa6-protein-function-prediction`, `protein-backbone-structural-validation`.
- Nor is his contribution to `ramithuh/explainer` (three commits, diagram
  rendering). Details in `~/phd/ARYAN-PROFILE.md`.
- A protein backbone animation is planned for the hero, built from the real PDB
  files in `protein-backbone-structural-validation` rather than stock artwork.
  Keep it to a few KB of CA coordinates on a canvas; do not pull in Mol* or
  3Dmol.js. **Done**: `protein.js` plus `assets/backbones.js`, six structures
  drawn per load with trackball drag and flick-to-coast.

## A "Questions" or "Reading" page, not the research vault

He asked about publishing the notes in `~/research/` under a "My Learnings"
tab. Do not publish those notes. As of 2026-08-18 all 47 are tagged
`agent_drafted`, 46 still carry `needs_review`, 33 are `status: draft`, and
several name Claude Code in their `origin` field. His own vault contract says
only he removes `needs_review`. See the memory entry
`no-publishing-agent-drafted-notes`.

The better version of the same idea, which he liked:

1. **Publish his questions, not the answers.** `~/research/src/questions_log.typ`
   holds ~220 questions he asked, appended verbatim per the vault contract, so
   they are unambiguously his words. Curate 15 to 20 of the sharpest, grouped
   by theme. Distinctive, shows how he thinks, and a question cannot be wrong
   the way a summary can.
2. **A reading list with his own one-line takes.** He has engaged with
   AlphaFold2 and 3, BindCraft, Foldseek, flow matching, Genie3, ESM. One
   sentence each on why it mattered. Curation is his even when the underlying
   note was drafted for him.

Anything from the vault itself only goes up after he has reviewed it, removed
`needs_review`, and rewritten it in his own voice. Three real notes beat
forty-seven imported ones.

## Two parked visual ideas, and the rule they share

Both came from wanting to reuse a figure he liked. The rule in both cases:
**the underlying facts are free, the rendering is not.** Check the licence
before proposing reuse, and expect the answer to be "rebuild it from the
source data", which is better for the site anyway.

### A field timeline with his own work marked on it

From Fig. 1 of `~/research-papers/ai-driven-protein-design.pdf` (Koh et al.,
*Nature Reviews Bioengineering* 2025, doi:10.1038/s44222-025-00349-8).
**That figure is © Springer Nature Limited 2025, no Creative Commons
licence**, so it cannot be reposted. Crossref lists only Springer's
text-and-data-mining terms, which do not cover republication.

The milestones themselves are historical facts and are free to use. The idea
he liked: redraw the AI-era arc in the site's own style, cite the review as a
source, and **plot his own projects on the same axis** (DiMA fine-tuning,
CAFA 6, backbone validation). That turns field context into a statement about
where he sits in it. Their figure has ~40 entries; a good one has 10 to 14, so
cut the database history and keep the AI arc. Horizontal, scroll-driven, same
restraint as the protein grid.

### Space-filling renders instead of line traces

He liked the protein images on beautifulchemistry.net, particularly a
symmetric complex with yellow subunits and red cores, and wanted one to rotate
on hover. **That site carries no licence statement at all** (checked the
structures page, the about page, and /terms and /copyright which both 404), so
default all rights reserved. Those renders are original creative work by Yan
Liang at USTC. Also worth saying plainly: a static image cannot rotate, since
the other side is not in the file.

The coordinates are free though, and the data is already in this repo. His own
`laproteina_001.pdb` carries **1,740 atoms including side chains**, while
`assets/backbones.js` only ships the 200 alpha carbons. Drawing depth-sorted
circles with radial gradients gives the rounded molecular-surface look in the
same canvas 2D renderer, no library, and it rotates for real.

Two routes: space-fill his own generated designs (no licence question, but a
200-residue monomer is a compact blob rather than a symmetric flower), or
render a real PDB entry with genuine symmetry such as a ferritin cage or a
chaperonin. Full virus capsids are out; those run to millions of atoms.
