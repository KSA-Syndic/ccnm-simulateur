# Déploiement GitHub Pages

## Cible produit

L'application **Vue 3** (build Vite) est la **référence** : code sous `src/`, entrée `index.html` à la racine du dépôt pour le dev, build dans `dist/`.

L'ancien bundle **vanilla** (`legacy-archive/` + `index-legacy.html`) peut encore être publié à la **racine** Pages le temps d'une bascule.

## URLs (production)

| Version        | URL publique                                         |
| -------------- | ---------------------------------------------------- |
| **Vue 3**      | https://simulateur.cfdt-kuhn.fr/v2/                  |
| **Legacy** (?) | https://simulateur.cfdt-kuhn.fr/ (racine, si publié) |

Le build Vue utilise **`VITE_BASE=/v2/`** (chemins absolus `/v2/assets/…`). Pas de préfixe `/NomDuRepo/` sur le domaine personnalisé.

## Workflow

Fichier : **`.github/workflows/deploy.yml`**

- Push **`experiment/vue-migration-3`** → `npm run build` avec `VITE_BASE=/v2/`, copie dans `v2/` sur la branche `gh-pages`.
- Push **`main`** → peut mettre à jour la racine (legacy) tout en conservant `v2/`.

Déclenchement manuel : **Actions → Deploy to GitHub Pages** (cible `vue-v2` ou `auto`).

## Build local (Vue)

```bash
npm run build:pages:v2
# Vérifier dist/index.html : src="/v2/assets/…"
npx vite preview --base /v2/
```

## Prérequis GitHub

- **Settings → Pages → Source** : **GitHub Actions**.
- Domaine personnalisé : **simulateur.cfdt-kuhn.fr** (CNAME sur la branche `gh-pages`).

## Console : 404 sur CSS/JS ou favicon

### Mauvais préfixe (`/ccnm-simulateur/v2/…`)

Si les requêtes partent vers `https://simulateur.cfdt-kuhn.fr/ccnm-simulateur/v2/assets/…` alors que les fichiers sont sous `https://simulateur.cfdt-kuhn.fr/v2/assets/…`, le build a été fait avec un **`VITE_BASE` incorrect** (ancien réflexe « project site » GitHub).

**Attendu dans `v2/index.html` déployé :**

```html
<script src="/v2/assets/index-….js"></script>
<link href="/v2/assets/index-….css" />
<link rel="icon" href="/v2/favicon.svg" />
```

Republier après merge du workflow avec `VITE_BASE_V2: /v2/`.

### Chemins relatifs `./assets/`

Si l’URL est `…/v2` **sans slash final**, `./assets/` peut pointer hors de `/v2/`. Utiliser une **base absolue** `/v2/` (déjà le cas) et ouvrir `…/v2/`.

### `vendor.js` — `tabs:outgoing.message.ready`

Extension de navigateur — ignorer ou tester sans extensions.

## GitHub.io (sans domaine personnalisé)

Si vous testez sur `https://<org>.github.io/<repo>/v2/`, adapter temporairement :

`VITE_BASE=/<repo>/v2/ npm run build`

Ce n’est **pas** la config du domaine CFDT Kuhn.
