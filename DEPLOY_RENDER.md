# Déploiement gratuit sur Render

## 1) Préparer GitHub (une seule fois)

Dans `C:\Users\COMPUTER CARE\Documents\Projet2` :

```bash
git init
git add .
git commit -m "Deploy ready for Render"
git branch -M main
git remote add origin <URL_DE_VOTRE_REPO_GITHUB>
git push -u origin main
```

## 2) Déployer sur Render

1. Ouvrir [https://render.com](https://render.com)
2. `New +` -> `Blueprint`
3. Sélectionner le repo GitHub contenant ce projet
4. Render détecte `render.yaml` automatiquement
5. Renseigner la variable d'environnement :
   - `OPENWEATHER_API_KEY` = votre clé OpenWeatherMap
6. Lancer le déploiement

## 3) Vérifier

- Ouvrir l'URL Render générée
- Tester le chat et la météo par ville

## Notes

- Le plan gratuit peut se mettre en veille (réveil lent au premier chargement).
- Ne jamais versionner `.env` (déjà ignoré via `.gitignore`).
