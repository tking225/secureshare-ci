# Image de base : Node.js 20 sur Debian slim (version allegee)
FROM node:20-bookworm-slim

# Repertoire de travail dans le conteneur
WORKDIR /app

# Installation des outils de compilation natifs (requis pour better-sqlite3)
# puis nettoyage du cache apt pour reduire la taille de l'image finale
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copie des fichiers de dependances en premier pour optimiser le cache Docker
COPY package.json package-lock.json* ./

# Installation des dependances de production uniquement (pas les dev)
RUN npm install --omit=dev && npm cache clean --force

# Copie du code source du serveur Node.js
COPY server ./server

# Copie des fichiers statiques (HTML, CSS, JS, favicon)
COPY public ./public

# Creation du dossier de donnees et attribution des droits a l'utilisateur node
RUN mkdir -p /app/data/uploads && chown -R node:node /app

# Execution en utilisateur non-root (bonne pratique de securite)
USER node

# Variables d'environnement par defaut
ENV NODE_ENV=production
ENV PORT=3000

# Port expose par le conteneur
EXPOSE 3000

# Verification periodique que l'application repond sur /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

# Commande de demarrage du serveur
CMD ["node", "server/index.js"]