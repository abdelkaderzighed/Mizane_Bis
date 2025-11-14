# Legacy App Variants

`App.legacy.tsx` et `App_clean.legacy.tsx` conservent les expérimentations précédentes de l'interface principale.

Le bootstrap (`src/main.tsx`) utilise `App_refactored.tsx`. Les variantes sont conservées uniquement à titre de référence fonctionnelle (traductions, logiques markdow). Elles ne sont plus compilées dans le bundle.

Si une fonctionnalité doit être récupérée :
1. Copiez le bloc concerné depuis `legacy/`.
2. Intégrez-le dans un composant modulaire du dossier `src/components`.
3. Vérifiez avec `npm run build`.
