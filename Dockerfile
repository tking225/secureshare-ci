# Image de base : Node.js 20 sur Debian slim (version allégée)
FROM node:20-bookworm-slim

# Répertoire de travail dans le conteneur
WORKDIR /app

# Installation des outils de compilation natifs (requis pour better-sqlite3)
# puis nettoyage du cache apt pour réduire la taille de l'image finale
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copie des fichiers de dépendances en premier pour optimiser le cache Docker
COPY package.json package-lock.json* ./

# Installation des dépendances de production uniquement (pas les dev)
RUN npm install --omit=dev && npm cache clean --force

# Copie du code source du serveur Node.js
COPY server ./server

# Copie des fichiers statiques (HTML, CSS, JS, favicon)
COPY public ./public

# Création du dossier de données et attribution des droits à l'utilisateur node
RUN mkdir -p /app/data/uploads && chown -R node:node /app

# Exécution en utilisateur non-root (bonne pratique de sécurité)
USER node

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Port exposé par le conteneur
EXPOSE 3000

# Vérification périodique que l'application répond sur /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

# Commande de démarrage du serveur
CMD ["node", "server/index.js"]