# Oracle legacy — exécution locale

Le simulateur **vanilla** (référence parité) vit dans `legacy-archive/`. L’app **Vue 3** se lance séparément (Vite, port **5173**).

## Legacy seul (port 5174)

```bash
npm run legacy
# équivalent : npx --yes serve . -p 5174 --no-port-switching
```

URLs :

- [http://127.0.0.1:5174/index-legacy.html](http://127.0.0.1:5174/index-legacy.html) (redirige vers `legacy-archive/index.html`)
- [http://127.0.0.1:5174/legacy-archive/index.html](http://127.0.0.1:5174/legacy-archive/index.html)

## Vue + legacy (parité dual)

```bash
npm run dual          # Vue 5173 + legacy 5174
npm run dual:parity   # E2E parité (nécessite les deux serveurs)
```

Voir **`tests/README.md`** et **`docs/PARITE_MATRIX.md`** (D6.03 / D6.04).

## Vérifications manuelles (régression oracle)

- [ ] Étapes 1a → 1c : roulettes / saisie directe
- [ ] Étape 2 : modalités, accordéons
- [ ] Étape 3 : résultat SMH, accord Kuhn via `?accord=kuhn`
- [ ] Étape 4 : frise arriérés + export PDF / Word
- [ ] Console : pas d’erreur 404 sur modules sous `legacy-archive/`

## Tests Vitest incluant l’oracle

À la racine du dépôt (dépendances Vue installées) :

```bash
npm run test:run
```

Les suites sous `legacy-archive/tests/**` sont importées par la config Vitest du projet (parité chiffrée : `tests/parity/remuneration-oracle.test.ts`).

_Dernière mise à jour : 2026-05-27._
