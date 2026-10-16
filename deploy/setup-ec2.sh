#!/usr/bin/env bash
# À exécuter une seule fois sur une instance EC2 Ubuntu 22.04 ou 24.04.
# Usage : ssh ubuntu@<ip> 'bash -s' < deploy/setup-ec2.sh

set -euo pipefail

echo "Mise à jour du système"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "Installation des prérequis"
sudo apt-get install -y ca-certificates curl gnupg git ufw

echo "Dépôt Docker officiel"
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

ARCH=$(dpkg --print-architecture)
CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker "$USER" || true

echo "Configuration du pare-feu"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "Terminé. Déconnectez-vous puis reconnectez-vous pour activer le groupe docker."