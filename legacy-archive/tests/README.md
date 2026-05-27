# Tests oracle (archive JS)

Ce dossier contient les tests de l’**ancien** simulateur vanilla sous `legacy-archive/`.

- **Non requis** pour l’application Vue (`src/`).
- Inclus dans `npm run test:run` **uniquement** si `vitest.config.js` liste `legacy-archive/tests/**/*.test.js`.

Documentation active du projet : **`tests/README.md`**, **`README_TECHNIQUE.md`**.

Pour supprimer l’archive : retirer l’include Vitest, adapter `tests/parity/`, puis supprimer le dossier `legacy-archive/`.
