#!/usr/bin/env bash
# Assemble le répertoire publié sur GitHub Pages (app Vue à la racine).
# Prérequis : `VITE_BASE=/ npm run build` (ou `npm run build:pages`), lancé depuis la racine du dépôt.
set -euo pipefail

SITE_DIR="${SITE_DIR:-_site}"

if [ ! -d dist ] || [ ! -f dist/index.html ]; then
  echo "Erreur : dist/ absent — lancer npm run build:pages (ou VITE_BASE=/ npm run build) depuis la racine du dépôt." >&2
  exit 1
fi

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"
touch "$SITE_DIR/.nojekyll"
cp -a dist/. "$SITE_DIR/"

echo "Artefact Pages prêt dans $SITE_DIR"
ls -la "$SITE_DIR" | head -20
