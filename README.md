# Leonida Waypoint

An offline-first field guide and progress tracker for the 55-trophy GTA VI PS5 list. It keeps your checklist in this browser, gives every trophy a cited guide, and groups the route to Platinum into a spoiler-aware roadmap.

[![Bounty](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Rank](https://make.fun/badge/gta6-trophy-guide-01/argaromit-lab/project-GTA6-trophy-v2/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Reward](https://make.fun/badge/gta6-trophy-guide-01/argaromit-lab/project-GTA6-trophy-v2/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

## Run offline

Serve the `app/` directory as the site root with any static file server, then open `index.html`. The app uses no remote scripts, fonts, images, APIs, or analytics. Source links are ordinary links and open only when selected.

```sh
node serve.ts
```

Progress stays in local storage on this device. Use **Export** for a portable JSON backup and **Import** to restore one.

## Guide notes

Trophy names, descriptions, and grades follow the PS5 list in `app/data/trophies.json`. Guide claims cite the linked reference next to each entry. The Chapter 1 meditation is marked **possible missable** rather than certain: public launch guides disagree about whether the balcony spot is required. GTA VI details and trophy triggers can change; the app records uncertainty instead of inventing a confirmed route.

The site is a fan-made reference and is not affiliated with Rockstar Games.

## make.fun

Build the entry with the Node 22 program at `main.ts`; it writes the static app, screenshots, and judge dossier to `/output` (or `MAKEFUN_OUTPUT_DIR`).
