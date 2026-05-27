# Déploiement GitHub Pages (legacy + Vue v2)

## URLs

| Version                    | Branche(s)                              | Chemin sur Pages                                          |
| -------------------------- | --------------------------------------- | --------------------------------------------------------- |
| **Legacy** (JS historique) | `main`                                  | `https://<org>.github.io/Classification_simulateur_2/`    |
| **Vue 3** (migration)      | `experiment/vue-migration-3` uniquement | `https://<org>.github.io/Classification_simulateur_2/v2/` |

Les deux coexistent : un déploiement ne supprime pas l’autre (fusion via la branche `gh-pages`).

## Workflow

Fichier : `.github/workflows/deploy.yml`

- Push sur **`main`** → met à jour la racine (`index.html` + `legacy-archive/`), conserve `v2/` si déjà publié.
- Push sur **`experiment/vue-migration-3`** → build Vite avec `VITE_BASE=/Classification_simulateur_2/v2/`, publie dans `v2/`, conserve le legacy à la racine.

Déclenchement manuel : **Actions → Deploy to GitHub Pages → Run workflow** (choix `legacy`, `vue-v2` ou `auto`).

## Build local (Vue v2)

```bash
npm run build:pages:v2
npx vite preview --base /Classification_simulateur_2/v2/
```

## Prérequis GitHub

- **Settings → Pages → Source** : **GitHub Actions**.
- Premier déploiement conseillé : pousser **`main`** (legacy), puis la branche Vue (pour que `v2/` existe à côté du legacy).
