# Accords d'entreprise

Ce répertoire contient **uniquement les définitions des accords d'entreprise**, séparées du code applicatif (`src/`).

- Chaque fichier exporte un objet accord conforme au schéma défini dans `src/agreements/AgreementInterface.js`.
- Les accords sont enregistrés dans le registre par `src/agreements/AgreementRegistry.js`.
- Pour ajouter un nouvel accord : créer un fichier ici (ex. `MonAccord.js`), puis l’importer et appeler `registerAgreement(MonAccord)` dans `AgreementRegistry.js`.

**Fichiers :**
- `KuhnAgreement.js` — Accord d'entreprise Kuhn (UES KUHN SAS/KUHN MGM SAS), 6 mars 2024.

**Documentation :**
- [Guide technique : ajouter un accord](../docs/AJOUTER_ACCORD.md)
- [Intégrer un accord via texte complet + prompt IA](../docs/INTEGRER_ACCORD_TEXTE_ET_IA.md) — fournir le texte de l'accord et un prompt pour générer le fichier JS avec un assistant IA.
