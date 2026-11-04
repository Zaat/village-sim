#!/usr/bin/env bash
# Creates one GitHub Release per version from docs/releases/*.md (needs gh, run from repo root).
# Tags point at the commit in tools/release-commits.txt; edit it if a tag should move.
set -e
R=Zaat/village-claudia
sha=$(grep "^v0.2 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.2 --repo $R --target "$sha" --title "v0.2 — First playable village" --notes-file docs/releases/v0.2.md
sha=$(grep "^v0.3 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.3 --repo $R --target "$sha" --title "v0.3 — Lives, opinions and a council" --notes-file docs/releases/v0.3.md
sha=$(grep "^v0.4 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.4 --repo $R --target "$sha" --title "v0.4 — Saving" --notes-file docs/releases/v0.4.md
sha=$(grep "^v0.5 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.5 --repo $R --target "$sha" --title "v0.5 — Technology, boats and camps" --notes-file docs/releases/v0.5.md
sha=$(grep "^v0.6 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.6 --repo $R --target "$sha" --title "v0.6 — Trade, money and taxes" --notes-file docs/releases/v0.6.md
sha=$(grep "^v0.7 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.7 --repo $R --target "$sha" --title "v0.7 — Great projects" --notes-file docs/releases/v0.7.md
sha=$(grep "^v0.8 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.8 --repo $R --target "$sha" --title "v0.8 — Factions and history" --notes-file docs/releases/v0.8.md
sha=$(grep "^v0.9 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.9 --repo $R --target "$sha" --title "v0.9 — Time travel and more projects" --notes-file docs/releases/v0.9.md
sha=$(grep "^v0.9.1 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.9.1 --repo $R --target "$sha" --title "v0.9.1 — Gathering places" --notes-file docs/releases/v0.9.1.md
sha=$(grep "^v0.10 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.10 --repo $R --target "$sha" --title "v0.10 — The wider sea" --notes-file docs/releases/v0.10.md
sha=$(grep "^v0.11 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.11 --repo $R --target "$sha" --title "v0.11 — Diplomacy and trade with neighbours" --notes-file docs/releases/v0.11.md
sha=$(grep "^v0.12 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.12 --repo $R --target "$sha" --title "v0.12 — Building stats" --notes-file docs/releases/v0.12.md
sha=$(grep "^v0.13 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.13 --repo $R --target "$sha" --title "v0.13 — Tabbed side panel" --notes-file docs/releases/v0.13.md
sha=$(grep "^v0.14 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.14 --repo $R --target "$sha" --title "v0.14 — Divergent societies" --notes-file docs/releases/v0.14.md
sha=$(grep "^v0.15 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.15 --repo $R --target "$sha" --title "v0.15 — Divided villages" --notes-file docs/releases/v0.15.md
sha=$(grep "^v0.16 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.16 --repo $R --target "$sha" --title "v0.16 — Inspector overhaul" --notes-file docs/releases/v0.16.md
sha=$(grep "^v0.17 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.17 --repo $R --target "$sha" --title "v0.17 — A living world" --notes-file docs/releases/v0.17.md
sha=$(grep "^v0.18 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.18 --repo $R --target "$sha" --title "v0.18 — Movement and population" --notes-file docs/releases/v0.18.md
sha=$(grep "^v0.19 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.19 --repo $R --target "$sha" --title "v0.19 — Map types" --notes-file docs/releases/v0.19.md
sha=$(grep "^v0.20 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.20 --repo $R --target "$sha" --title "v0.20 — Maritime and river commerce" --notes-file docs/releases/v0.20.md
sha=$(grep "^v0.21 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.21 --repo $R --target "$sha" --title "v0.21 — Settlements and expansion" --notes-file docs/releases/v0.21.md
sha=$(grep "^v0.22 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.22 --repo $R --target "$sha" --title "v0.22 — Lives and society depth" --notes-file docs/releases/v0.22.md
sha=$(grep "^v0.23 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.23 --repo $R --target "$sha" --title "v0.23 — Statistics and insight" --notes-file docs/releases/v0.23.md
sha=$(grep "^v0.24 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.24 --repo $R --target "$sha" --title "v0.24 — Technology and ages" --notes-file docs/releases/v0.24.md
sha=$(grep "^v0.24.1 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.24.1 --repo $R --target "$sha" --title "v0.24.1 — Concerns" --notes-file docs/releases/v0.24.1.md
sha=$(grep "^v0.24.2a " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.24.2a --repo $R --target "$sha" --title "v0.24.2a — Concern tracker" --notes-file docs/releases/v0.24.2a.md
sha=$(grep "^v0.25 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.25 --repo $R --target "$sha" --title "v0.25 — Livelihoods" --notes-file docs/releases/v0.25.md
sha=$(grep "^v0.26 " tools/release-commits.txt | cut -d" " -f2)
gh release create v0.26 --repo $R --target "$sha" --title "v0.26 — Growth and housing" --notes-file docs/releases/v0.26.md
