# Oracle JS optionnel (`legacy-archive/`)

L'application **officielle** est **Vue 3** (`npm run dev`, port **5173**). Le dossier **`legacy-archive/`** est une **copie figée** de l'ancien simulateur vanilla, conservée pour :

- comparaison visuelle dual-run (Playwright, opt-in) ;
- tests Vitest qui importent encore `legacy-archive/tests/**` ou `tests/parity/remuneration-oracle.test.ts`.

**Vous pouvez supprimer `legacy-archive/`** dès que vous :

1. retirez son inclusion dans `vitest.config.js` ;
2. adaptez ou supprimez `tests/parity/remuneration-oracle.test.ts` ;
3. n'utilisez plus `npm run legacy` / `dual:parity`.

Puis retirer le **déploiement bêta `/v2/`** (workflow dual Pages, `build:pages:v2`, etc.) : checklist **`docs/DEPLOIEMENT_PAGES.md`** → _Bascule finale_.

Aucun fichier sous **`src/`** ne doit importer `legacy-archive/` pour le fonctionnement normal.

## Vue seule (développement courant)

```bash
npm run dev
# http://localhost:5173/
```

## Oracle legacy seul (port 5174) — optionnel

```bash
npm run legacy
```

- [http://127.0.0.1:5174/index-legacy.html](http://127.0.0.1:5174/index-legacy.html)
- [http://127.0.0.1:5174/legacy-archive/index.html](http://127.0.0.1:5174/legacy-archive/index.html)

## Dual Vue + oracle — optionnel

```bash
npm run dual          # Vue 5173 + static legacy 5174
npm run dual:parity   # E2E parité (DUAL_PARITE_E2E=1)
```

Voir **`tests/README.md`** et **`e2e/parite-visuelle*.spec.ts`**.

## Tests Vitest incluant l'oracle

Si `legacy-archive/tests/**` est encore listé dans `vitest.config.js` :

```bash
npm run test:run
```

Sans oracle : retirer la ligne `legacy-archive/tests/**/*.test.js` de la config et s'appuyer sur `tests/**` + `src/**/__tests__`.

## Vérifications manuelles (régression oracle)

- [ ] Wizard 4 étapes, accord Kuhn `?accord=kuhn`
- [ ] Arriérés + PDF
- [ ] Console sans 404 sur modules sous `legacy-archive/`
