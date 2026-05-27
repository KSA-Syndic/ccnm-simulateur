# GATE — Passe 2 (uniformisation sémantique)

Conditions **avant** d’appliquer massivement `docs/LACUNES_UI_CIBLES.md` et les changements de libellés/jargon :

1. **`docs/PARITE_MATRIX.md`** : toutes les lignes **D1–D6** en statut `completed` (sauf lignes explicitement `deferred` avec justification).
2. **Vitest** : `npm run test:run` — 100 % vert (legacy + domain + `tests/**`).
3. **E2E** :
   - CI **`.github/workflows/ci.yml`** : `npm run e2e` sur chaque PR / push `main` (Playwright + `webServer` Vite, `CI=true`) ;
   - optionnel : job **`dual-parity`** (label PR `dual-parity` ou _workflow_dispatch_) → `DUAL_PARITE_E2E=1 npm run e2e:parite-dual` avec legacy **5174** + Vue **5173** ; en local : `npm run dual` puis **`npm run dual:parity`** ;
   - en local : `npx playwright test` (équivalent `npm run e2e`).
4. **Revue humaine** : validation métier sur échantillon de scénarios (PDF, arriérés, accord Kuhn).

Tant que la gate n’est pas validée :

- Ne pas supprimer **`legacy-archive/`** (oracle Vitest + dual-run) sans stratégie de remplacement ;
- Ne pas traiter les items L1–L5 comme obligatoires sur le PDF / toutes les surfaces.
