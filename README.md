
<!-- Projet réalisé en groupe par David Allangba, Guei Prince et Favour Ogechi -->
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

## Auteurs

Projet réalisé en groupe de trois :

- **David Allangba** - Développement du serveur et de l'interface, déploiement
- **Guei Prince** - Documentation et tests fonctionnels
- **Favour Ogechi** - Révision de l'interface et de l'expérience utilisateur

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

---

## Installation locale

### 1. Cloner le dépôt

```bash
git clone https://github.com/tking225/secureshare-ci.git
cd secureshare-ci
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer l'environnement

Copier le fichier d'exemple :

```bash
cp .env.example .env
```

Sur Windows PowerShell :

```powershell
Copy-Item .env.example .env
```

Générer un secret pour signer les sessions JWT :

**Linux / macOS / EC2 :**

```bash
openssl rand -hex 48
```

**Windows PowerShell (sans OpenSSL) :**

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Ouvrir `.env` dans un éditeur et remplacer la valeur après `JWT_SECRET=` par la chaîne générée.

### 4. Lancer le serveur

En développement (rechargement automatique) :

```bash
npm run dev
```

En production locale :

```bash
npm start
```

L'application est accessible sur http://localhost:3000.

Pour vérifier que le serveur répond :

```bash
curl http://localhost:3000/health
```

Réponse attendue : `{"ok":true}`

---

## Utilisation avec Docker

### 1. Construire l'image

```bash
docker build -t tking1222/secureshare-ci:v1 .
```

### 2. Lancer avec Docker Compose (développement local)

Créer un fichier `.env` à la racine avec `JWT_SECRET=<ta-chaine-hex>`, puis :

```bash
docker compose up -d
```

L'application est accessible sur http://localhost.

Pour voir les logs :

```bash
docker compose logs -f app
```

Pour arrêter :

```bash
docker compose down
```

### 3. Lancer avec Docker directement

```bash
docker run -d \
  --name secureshare-app \
  --restart unless-stopped \
  -p 80:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e JWT_SECRET=<ta-chaine-hex> \
  -v secureshare_data:/app/data \
  tking1222/secureshare-ci:v1
```

### 4. Vérifier que le conteneur tourne

```bash
docker ps
curl http://localhost/health
```

### 5. Consulter les logs

```bash
docker logs secureshare-app
```

---

## Déploiement sur AWS EC2

> **Contrainte du mini-projet** : l'image ne doit **pas** être construite sur le serveur. Elle est construite localement, publiée sur Docker Hub, puis récupérée sur EC2 par `docker pull`.

### 1. Publier l'image sur Docker Hub

Depuis votre machine, à la racine du projet :

```bash
docker login
docker build -t tking1222/secureshare-ci:v1 .
docker push tking1222/secureshare-ci:v1
```

Vérifier sur https://hub.docker.com/r/tking1222/secureshare-ci

### 2. Créer l'instance EC2

Sur la console AWS :

| Paramètre | Valeur |
|-----------|--------|
| AMI | Ubuntu Server 26.04 LTS |
| Type | `t3.small` (2 vCPU, 2 Go de RAM) |
| Paire de clés | Créer une paire `.pem` et la télécharger |
| Stockage | 8 Go gp3 minimum |
| Security group | Voir ci-dessous |

**Règles entrantes du groupe de sécurité :**

| Type | Protocole | Port | Source |
|------|-----------|------|--------|
| SSH | TCP | 22 | 0.0.0.0/0|
| HTTP | TCP | 80 | 0.0.0.0/0 |
|HTTPS|TCP|443|0.0.0.0/0|

Aucun autre port ne doit être ouvert.

### 3. Se connecter en SSH

```bash
ssh -i chemin/vers/cle.pem ubuntu@35.181.63.240
```

### 4. Installer Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io
sudo usermod -aG docker ubuntu
```

Se déconnecter (`exit`) puis se reconnecter pour activer le groupe `docker`.

Vérification :

```bash
docker ps
```

Cette commande doit fonctionner sans `sudo`.

### 5. Récupérer l'image depuis Docker Hub

```bash
docker pull tking1222/secureshare-ci:v1
```

### 6. Générer un secret pour le serveur

```bash
openssl rand -hex 48
```

Copier la chaîne obtenue.

### 7. Lancer le conteneur

```bash
docker run -d \
  --name secureshare-app \
  --restart unless-stopped \
  -p 80:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e JWT_SECRET=<ta-chaine-hex> \
  -v secureshare_data:/app/data \
  tking1222/secureshare-ci:v1
```

**Détail des options :**

- `-d` : exécution détachée en arrière-plan
- `--name secureshare-app` : nom du conteneur
- `--restart unless-stopped` : redémarrage automatique après un reboot
- `-p 80:3000` : le port 80 du serveur est redirigé vers le port 3000 du conteneur
- `-e NODE_ENV=production` : mode production
- `-e JWT_SECRET=<...>` : secret de signature des sessions
- `-v secureshare_data:/app/data` : volume nommé pour persister la base et les uploads

### 8. Vérifier le déploiement

```bash
docker ps
curl http://localhost/health
```

L'application est accessible sur `http://<ip-publique>`.

---

## Variables d'environnement

| Nom | Description | Valeur par défaut |
|-----|-------------|-------------------|
| `JWT_SECRET` | Secret de signature des sessions. Obligatoire en production. | aucune |
| `PORT` | Port d'écoute du serveur Node.js | `3000` |
| `NODE_ENV` | Environnement d'exécution | `development` |
| `DATA_DIR` | Dossier de la base SQLite | `./data` |
| `UPLOAD_DIR` | Dossier des fichiers déposés | `./data/uploads` |
| `COOKIE_SECURE` | Force le flag `Secure` sur le cookie (HTTPS uniquement) | `false` |
| `HTTPS_ENABLED` | Active HSTS et la mise à niveau HTTPS forcée | `false` |

---

## Endpoints de l'API

### Authentification

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | Non | Créer un compte |
| POST | `/api/auth/login` | Non | Se connecter |
| POST | `/api/auth/logout` | Oui | Se déconnecter |
| GET | `/api/auth/me` | Oui | Récupérer le profil connecté |

### Fichiers

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/files` | Oui | Déposer un fichier |
| GET | `/api/files` | Oui | Lister les fichiers du propriétaire |
| DELETE | `/api/files/:id` | Oui | Supprimer un fichier |
| GET | `/api/files/meta/:id` | Non | Métadonnées publiques d'un lien |
| POST | `/api/files/download/:id` | Non | Télécharger un fichier |

### Système

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/health` | Non | Vérification de santé du serveur |

---

## Structure du projet

```
secureshare-ci/
├── server/
│   ├── index.js              Point d'entrée Express
│   ├── db.js                 Initialisation SQLite
│   ├── middleware/
│   │   └── auth.js           Vérification des sessions
│   └── routes/
│       ├── auth.js           Routes d'authentification
│       └── files.js          Routes de gestion des fichiers
│
├── public/
│   ├── index.html            Page d'accueil
│   ├── register.html         Inscription
│   ├── login.html            Connexion
│   ├── dashboard.html        Tableau de bord
│   ├── download.html         Page publique de téléchargement
│   ├── cgu.html              Conditions générales
│   ├── rgpd.html             Protection des données
│   ├── favicon.svg           Icône du site
│   ├── css/
│   │   └── style.css         Feuille de style unique
│   └── js/
│       ├── auth.js           Inscription et connexion
│       ├── dashboard.js      Upload et liste des fichiers
│       ├── download.js       Téléchargement public
│       └── init.js           Initialisation commune
│
├── deploy/
│   ├── setup-ec2.sh          Installation de Docker sur Ubuntu
│   └── deploy.sh             Redéploiement local
│
├── tests/
│   └── api.test.js           Tests d'intégration de l'API
│
├── Dockerfile                Recette de construction de l'image
├── docker-compose.yml        Configuration pour le lancement local
├── package.json
├── README.md
└── .env.example
```

---

## Tests

Lancer la suite de tests :

```bash
npm test
```

Les tests couvrent :

- La route de santé `/health`
- L'inscription avec vérification du cookie de session
- Le refus des mots de passe trop courts
- Le refus des adresses email invalides
- Le refus des doublons d'email
- Le refus d'upload sans session
- Le cycle complet d'un fichier : dépôt, métadonnées, mot de passe, téléchargement, suppression
- Le refus des liens inexistants

Sortie attendue : **8 tests passés, 0 échec**.

---

## Sécurité

| Mesure | Détail |
|--------|--------|
| Hachage des mots de passe | bcrypt, coût 12 |
| Sessions | JWT signé, cookie `httpOnly`, `sameSite=lax` |
| HTTPS forcé | Option via `COOKIE_SECURE` et `HTTPS_ENABLED` |
| Politique de contenu | CSP restrictive via Helmet |
| Limitation de débit | 300 requêtes par IP toutes les 15 minutes |
| Noms de fichiers | Aléatoires (`nanoid(16)`) sur le disque |
| Extensions | Nettoyées pour éviter les injections de chemin |
| Échappement HTML | Côté client contre les attaques XSS |
| Utilisateur non-root | Dans le conteneur Docker (`USER node`) |
| Journal d'audit | Horodaté pour chaque action sensible |
| Validation des entrées | Format email, longueur du mot de passe, taille des fichiers |

---

## Documentation légale

Deux pages obligatoires, accessibles depuis toutes les pages de l'application :

- **`/cgu.html`** : Conditions générales d'utilisation (objet, contenus interdits, limites techniques, responsabilité, résiliation)
- **`/rgpd.html`** : Politique de protection des données (données collectées, finalités, base légale, durées de conservation, droits, cookies)

---

## Liens

| Ressource | URL |
|-----------|-----|
| Dépôt GitHub | https://github.com/tking225/secureshare-ci |
| Image Docker Hub | https://hub.docker.com/r/tking1222/secureshare-ci |
| Application en ligne | http://35.181.63.240 |

---

## Licence

Projet à usage éducatif. Utilisation, modification et distribution libres pour tout usage non commercial.
