# Déploiement GitHub Pages

L’application **Vue 3** (build Vite dans `dist/`) est publiée à la **racine** du site (`/`), avec **`VITE_BASE=/`** (assets sous `/assets/…`).

## Prérequis GitHub

- **Settings → Pages → Source** : **GitHub Actions**.
- Domaine personnalisé : configurer le CNAME sur la branche `gh-pages` si besoin.

## Workflow

Fichier : **`.github/workflows/deploy.yml`**

À chaque **push** sur `main` : `npm ci`, **`VITE_BASE=/`**, `npm run build`, copie de `dist/` vers `_site/`, publication.

## Build local (production)

```bash
VITE_BASE=/ npm run build        # bash
$env:VITE_BASE='/'; npm run build  # PowerShell
# Vérifier dist/index.html : chemins du type /assets/…
npx vite preview --base /
```

Sur un dépôt **GitHub.io** sans domaine personnalisé (`https://<org>.github.io/<repo>/`), adapter la base :

`VITE_BASE=/<repo>/ npm run build`

## Dépannage (404 sur assets)

Vérifier que **`VITE_BASE`** correspond à l’URL réelle (slash final inclus dans la valeur Vite). Un build fait avec une base incorrecte génère des chemins `href` / `src` qui ne matchent pas l’URL servie.
