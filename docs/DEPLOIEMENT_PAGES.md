# Déploiement GitHub Pages

## Cible produit

L'application **Vue 3** (build Vite) est la **référence** : code sous `src/`, entrée `index.html` à la racine du dépôt pour le dev, build dans `dist/`.

L'ancien bundle **vanilla** (`legacy-archive/` + `index-legacy.html`) peut encore être publié à la **racine** Pages le temps d'une bascule ; il n'est **pas** requis pour développer ni maintenir Vue.

## URLs (configuration actuelle)

| Version                   | Branche(s) typique(s)                                  | Chemin Pages                                              |
| ------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| **Vue 3** (cible)         | `experiment/vue-migration-3` (puis `main` après merge) | `https://<org>.github.io/Classification_simulateur_2/v2/` |
| **Ancien JS** (optionnel) | `main`                                                 | `https://<org>.github.io/Classification_simulateur_2/`    |

Les déploiements peuvent coexister sur la branche `gh-pages` (fusion par le workflow).

## Workflow

Fichier : **`.github/workflows/deploy.yml`**

- Push **`experiment/vue-migration-3`** → build `VITE_BASE=/Classification_simulateur_2/v2/`, publie dans `v2/`.
- Push **`main`** → peut mettre à jour la racine (`index-legacy.html` + `legacy-archive/`) tout en conservant `v2/` si déjà publié.

Déclenchement manuel : **Actions → Deploy to GitHub Pages** (`legacy`, `vue-v2` ou `auto`).

**Après bascule complète** : un seul mode « vue » sur `main` à la racine (sans sous-chemin `/v2/`) — adapter `VITE_BASE` et le workflow en conséquence.

## Build local (Vue)

```bash
npm run build
# ou préfixe Pages :
npm run build:pages:v2
npx vite preview --base /Classification_simulateur_2/v2/
```

## Prérequis GitHub

- **Settings → Pages → Source** : **GitHub Actions**.
