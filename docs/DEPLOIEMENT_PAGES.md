# Déploiement GitHub Pages

> **Configuration temporaire (bêta)** : coexistence legacy à la **racine** + Vue sous **`/v2/`**, double checkout (`main` + `experiment/vue-migration-3`), script `prepare-github-pages.sh` multi-layout. Ce n’est **pas** l’architecture cible. Lors de la suppression du legacy, suivre la section **[Bascule finale](#bascule-finale--retirer-legacy-et-déploiement-v2-beta)** pour ne laisser aucune trace de ce déploiement d’essai.

## Cible produit

L'application **Vue 3** (build Vite) est la **référence** : code sous `src/`, entrée `index.html` à la racine du dépôt pour le dev, build dans `dist/`.

L'ancien bundle **vanilla** (`legacy-archive/` + `index-legacy.html`, ou monolithe `main`) peut encore être publié à la **racine** Pages le temps d'une bascule.

## URLs (production)

| Version        | URL publique                                         |
| -------------- | ---------------------------------------------------- |
| **Vue 3**      | https://simulateur.cfdt-kuhn.fr/v2/                  |
| **Legacy** (?) | https://simulateur.cfdt-kuhn.fr/ (racine, si publié) |

Le build Vue utilise **`VITE_BASE=/v2/`** (chemins absolus `/v2/assets/…`). Pas de préfixe `/NomDuRepo/` sur le domaine personnalisé.

## Workflow

Fichier : **`.github/workflows/deploy.yml`**

### Déployer legacy **et** Vue en même temps (recommandé)

Chaque **push** sur `main` ou `experiment/vue-migration-3` lance un déploiement **`both`** :

| Partie | Branche source               | URL                                 |
| ------ | ---------------------------- | ----------------------------------- |
| Legacy | `main`                       | https://simulateur.cfdt-kuhn.fr/    |
| Vue 3  | `experiment/vue-migration-3` | https://simulateur.cfdt-kuhn.fr/v2/ |

Sur **`main`**, le legacy est le monolithe (`index.html`, `app.js`, `src/`, `accords/`). Sur la branche migration : `index-legacy.html` + `legacy-archive/`. `prepare-github-pages.sh` choisit le layout automatiquement.

Un seul artefact Pages est publié : **plus d’écrasement** de `/v2/` quand vous poussez `main`, ni de la racine quand vous poussez la branche Vue.

Manuel : **Actions → Deploy to GitHub Pages** → cible **`both`** (défaut).

### Modes partiels (déconseillés)

- **`legacy`** ou **`vue-v2`** seuls : tentent de fusionner l’ancien contenu via la branche `gh-pages` (souvent vide avec `deploy-pages`) → risque de supprimer l’autre moitié du site. Réserver à un dépannage ciblé.

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

---

## Bascule finale — retirer legacy et déploiement `/v2/` (bêta)

À exécuter **une fois** le legacy retiré du dépôt et l’application Vue validée pour devenir la **seule** version en production à `https://simulateur.cfdt-kuhn.fr/` (racine). Objectif : supprimer tout ce qui a été ajouté uniquement pour publier une bêta parallèle sous `/v2/`.

### Prérequis

- [ ] Dossier **`legacy-archive/`** supprimé (voir checklist **`docs/LEGACY_RUN.md`**).
- [ ] Fichiers racine legacy retirés : **`index-legacy.html`**, ancien **`index.html` / `app.js` / `accords/`** monolithe si encore présents.
- [ ] Tests et gate passe 2 verts **sans** oracle legacy (`docs/GATE_PASSE2.md`).
- [ ] Communication utilisateurs : l’URL officielle redevient la **racine** (plus `/v2/`).

### 1. GitHub Actions — déploiement

| Action                                                                                                                                                                                                                                       | Fichier / élément              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Remplacer le workflow dual par un déploiement **mono-branche** (`main` uniquement) : un `checkout`, `npm ci`, `npm run build` avec **`VITE_BASE=/`**, artefact = contenu de **`dist/`** à la racine de `_site` (plus de sous-dossier `v2/`). | `.github/workflows/deploy.yml` |
| Supprimer : `LEGACY_REF`, `VUE_REF`, `VITE_BASE_V2`, modes `both` / `legacy` / `vue-v2`, double checkout `src-legacy` / `src-vue`, étape « Fetch gh-pages » pour fusion partielle, push sur `experiment/vue-migration-3`.                    | idem                           |
| Aligner le build de smoke CI sur la racine : **`VITE_BASE: /`** (au lieu de `/v2/`).                                                                                                                                                         | `.github/workflows/ci.yml`     |
| Supprimer le job ou les steps **dual-parity** / serveur legacy 5174 s’ils ne servent plus.                                                                                                                                                   | `.github/workflows/ci.yml`     |

**Cible du workflow simplifié (référence)** :

```yaml
# Exemple minimal — à adapter au dépôt au moment de la bascule
env:
  VITE_BASE: /
# … checkout main → npm ci → npm run build → cp -a dist/. _site/
```

### 2. Scripts et outillage Pages

| Action                                                                                                                                                                                                           | Fichier / élément                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Supprimer **`scripts/prepare-github-pages.sh`** ou le réduire à : `mkdir _site`, `cp -a dist/. _site/`, `.nojekyll` (sans `deploy_legacy`, sans merge `_gh_pages`, sans détection monolithe / `legacy-archive`). | `scripts/prepare-github-pages.sh` |
| Supprimer le script npm **`build:pages:v2`**.                                                                                                                                                                    | `package.json`                    |
| Conserver un seul script Pages, ex. **`build:pages`** → `VITE_BASE=/ npm run build` (renommer `build:pages:root` si besoin).                                                                                     | `package.json`                    |
| Supprimer **`legacy`**, **`dual`**, **`dual:parity`**, **`e2e:parite-dual`** si plus d’oracle local.                                                                                                             | `package.json`                    |

### 3. Build Vite

| Action                                                                                  | Fichier / élément           |
| --------------------------------------------------------------------------------------- | --------------------------- |
| Production / Pages : **`VITE_BASE=/`** (base absolue avec slash final, ex. `/`).        | `vite.config.ts`, workflows |
| Retirer les commentaires et la logique documentant **`/v2/`** comme cible Pages.        | `vite.config.ts`            |
| Vérifier **`dist/index.html`** après build : `src="/assets/…"`, **pas** `/v2/assets/…`. | —                           |

### 4. Documentation

| Action                                                                               | Fichier                                                                                   |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Réécrire ce fichier pour une **URL unique** (racine), sans tableaux legacy + `/v2/`. | `docs/DEPLOIEMENT_PAGES.md`                                                               |
| Retirer les mentions « Vue sous `/v2/` » et dual deploy.                             | `docs/MIGRATION_COMPLETE.md`, `docs/PARITE_MATRIX.md`, `docs/CURSOR_ARTIFACT_REGISTRY.md` |
| Archiver ou supprimer **`docs/LEGACY_RUN.md`** si le dossier oracle n’existe plus.   | `docs/LEGACY_RUN.md`                                                                      |

### 5. Publication Pages et URLs

| Action                                                                                                                                                                                                | Détail                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Déployer Vue à la **racine** du site (`_site/index.html` = `dist/index.html`).                                                                                                                        | Un seul artefact, plus de copie vers `_site/v2/`. |
| **Une release de transition** (recommandé) : page `v2/index.html` avec redirection vers `/` pour les favoris et liens diffusés pendant la bêta ; retirer le dossier **`v2/`** au déploiement suivant. | Meta refresh ou règle côté hébergeur              |
| Contrôle post-déploiement : `https://simulateur.cfdt-kuhn.fr/` charge CSS/JS ; **`/v2/`** ne doit plus être l’URL officielle (idéalement 301/302 vers `/`).                                           | Navigateur + curl                                 |

### 6. Tests E2E / parité (optionnel selon périmètre)

| Action                                                                            | Fichier / élément                                                                               |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Supprimer ou archiver les specs **dual** legacy ↔ Vue si le legacy n’existe plus. | `e2e/parite-visuelle.spec.ts`, `e2e/parite-visuelle-pixels.spec.ts`, `e2e/legacy-parity-nav.ts` |
| Retirer les variables **`PW_LEGACY_BASE`** / job CI associé.                      | CI, docs tests                                                                                  |

### 7. Vérification « zéro trace bêta »

Recherche dans le dépôt (doit retourner **vide** ou uniquement l’historique git / cette section jusqu’à réécriture finale) :

```bash
rg '/v2/' --glob '!docs/DEPLOIEMENT_PAGES.md' --glob '!.git/**'
rg 'build:pages:v2|vue-v2|VITE_BASE_V2|LEGACY_REF|prepare-github-pages|mode=both' .
```

Après bascule, le dépôt ne doit plus décrire ni automatiser un déploiement **beta sous `/v2/`** en parallèle du legacy.
