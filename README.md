# SecureShare CI

**Plateforme de partage sécurisé de fichiers avec expiration automatique, mot de passe optionnel et quota de téléchargements.**

Projet réalisé dans le cadre du mini-projet « De l'application au déploiement dans le cloud ».

---
## Présentation

**SecureShare CI** est une application web de partage temporaire de fichiers. Elle permet à un utilisateur enregistré de déposer un fichier, de définir une durée de vie (de 1 heure à 7 jours) et un mot de passe optionnel, puis d'obtenir un lien à transmettre à un destinataire. Ce dernier télécharge le fichier **sans créer de compte**.

Au bout du délai choisi, le lien cesse de fonctionner et le fichier devient inaccessible, même si l'URL circule encore.

L'application s'adresse aux :

- **Étudiants** qui doivent transmettre un devoir, un rapport ou un projet sans passer par les pièces jointes email limitées et permanentes.
- **Petites organisations** (associations, cabinets, groupes de travail) qui cherchent une alternative simple, auto-hébergée et sans engagement aux services de transfert commerciaux.

Le nom « CI » fait référence à la Côte d'Ivoire, marché cible initial du projet.

---

## Aperçu

### Pages principales


Accueil 
Inscription  
Connexion  
Tableau de bord  
Téléchargement  
CGU 
RGPD 

### Parcours utilisateur

1. L'utilisateur crée un compte (nom, email, mot de passe).
2. Il dépose un fichier depuis son tableau de bord.
3. Il choisit la durée de vie, éventuellement un mot de passe et un quota de téléchargements.
4. Il reçoit un lien unique du type `http://<domaine>/d/abc123xyz456`.
5. Il transmet ce lien par le canal de son choix.
6. Le destinataire ouvre le lien, saisit le mot de passe si nécessaire, télécharge.
7. À l'expiration, le lien ne fonctionne plus.

---

## Fonctionnalités

### Authentification

- Inscription par nom, email et mot de passe
- Connexion sécurisée par cookie de session 
- Déconnexion manuelle
- Vérification automatique de session sur les pages protégées

### Gestion des fichiers

- Dépôt de fichiers jusqu'à **25 Mo**
- Choix de la durée de vie : **1 heure, 6 heures, 24 heures, 3 jours, 7 jours**
- Mot de passe optionnel (haché avec bcrypt)
- Quota de téléchargements optionnel
- Suppression manuelle par le propriétaire
- Barre de progression pendant l'envoi
- Génération d'un lien unique de 12 caractères aléatoires

### Téléchargement public

- Aucun compte requis pour le destinataire
- Vérification automatique de l'expiration et du quota
- Page d'erreur explicite pour les liens expirés ou invalides

### Journal d'audit

- Chaque dépôt, téléchargement et suppression est horodaté
- IP enregistrée pour chaque action

### Pages légales

- Conditions générales d'utilisation
- Politique de protection des données personnelles

---
## Prérequis

- **Node.js 20 ou supérieur** ([nodejs.org](https://nodejs.org))
- **npm** (installé avec Node.js)
- **Docker Desktop** (pour lancer en conteneur)
- **Git** (pour cloner le dépôt)

Vérification rapide :

```bash
node -v    # v20.x ou plus
npm -v
docker -v
git --version