#!/usr/bin/env bash
# Assemble le répertoire publié sur GitHub Pages (legacy racine + Vue dans v2/).
# Usage : LEGACY_SRC=src-legacy ./scripts/prepare-github-pages.sh legacy|vue|both
set -euo pipefail

MODE="${1:?usage: prepare-github-pages.sh legacy|vue|both}"
SITE_DIR="${SITE_DIR:-_site}"
LEGACY_SRC="${LEGACY_SRC:-.}"

mkdir -p "$SITE_DIR"
touch "$SITE_DIR/.nojekyll"

if [ -d "_gh_pages" ] && [ -n "$(ls -A _gh_pages 2>/dev/null)" ]; then
  echo "Fusion du déploiement existant (branche gh-pages)…"
  cp -a _gh_pages/. "$SITE_DIR/"
fi

deploy_legacy() {
  echo "Publication legacy à la racine depuis ${LEGACY_SRC} (préservation de v2/ si présent)…"

  if [ -f "${LEGACY_SRC}/index-legacy.html" ] && [ -d "${LEGACY_SRC}/legacy-archive" ]; then
    echo "  → layout legacy-archive (branche migration)"
    cp -f "${LEGACY_SRC}/index-legacy.html" "$SITE_DIR/index.html"
    rm -rf "$SITE_DIR/legacy-archive"
    cp -a "${LEGACY_SRC}/legacy-archive" "$SITE_DIR/legacy-archive"
  elif [ -f "${LEGACY_SRC}/index.html" ]; then
    echo "  → layout monolithe main (index.html, app.js, src/, accords/)"
    for item in index.html app.js config.js styles.css favicon.svg accords src; do
      if [ -e "${LEGACY_SRC}/${item}" ]; then
        rm -rf "$SITE_DIR/${item}"
        cp -a "${LEGACY_SRC}/${item}" "$SITE_DIR/${item}"
      fi
    done
  else
    echo "Erreur : aucune entrée legacy dans ${LEGACY_SRC} (index-legacy.html ou index.html attendu)." >&2
    exit 1
  fi
}

deploy_vue() {
  if [ ! -d dist ] || [ ! -f dist/index.html ]; then
    echo "Erreur : dist/ absent — lancer npm run build avec VITE_BASE=/v2/ avant ce script." >&2
    exit 1
  fi
  echo "Publication Vue dans v2/ (préservation du legacy à la racine)…"
  rm -rf "$SITE_DIR/v2"
  mkdir -p "$SITE_DIR/v2"
  cp -a dist/. "$SITE_DIR/v2/"
}

case "$MODE" in
  legacy)
    deploy_legacy
    ;;
  vue)
    deploy_vue
    ;;
  both)
    deploy_legacy
    deploy_vue
    ;;
  *)
    echo "Mode inconnu : $MODE" >&2
    exit 1
    ;;
esac

echo "Artefact Pages prêt dans $SITE_DIR"
ls -la "$SITE_DIR"
if [ -d "$SITE_DIR/v2" ]; then
  ls -la "$SITE_DIR/v2" | head -10
fi
