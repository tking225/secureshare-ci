#!/usr/bin/env bash
# À lancer depuis la racine du projet, sur le serveur EC2.
# Usage : bash deploy/deploy.sh

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Le fichier .env est introuvable."
  echo "Générez un secret avec : openssl rand -hex 48"
  echo "Puis copiez .env.example vers .env et renseignez JWT_SECRET."
  exit 1
fi

echo "Arrêt des conteneurs en cours"
docker compose down || true

echo "Reconstruction de l'image"
docker compose build --pull --no-cache

echo "Démarrage"
docker compose up -d

echo "État"
docker compose ps

echo
echo "Vérification de santé :"
sleep 3
curl -fsS http://localhost/health && echo " OK" || echo " Échec. Consultez 'docker compose logs'."