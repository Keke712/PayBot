#!/bin/bash

echo "🚀 Démarrage du PayBot Stack..."

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour nettoyer les processus à la fermeture
cleanup() {
    echo -e "\n${YELLOW}🛑 Arrêt des services...${NC}"
    kill $API_PID $WEBAPP_PID $BOT_PID 2>/dev/null
    exit 0
}

# Trap pour nettoyer à la fermeture
trap cleanup SIGINT SIGTERM

# Vérifier que les dépendances sont installées
echo -e "${YELLOW}📦 Vérification des dépendances...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 n'est pas installé${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm n'est pas installé${NC}"
    exit 1
fi

# Installer les dépendances Python si nécessaire
if [ ! -f "requirements_installed.flag" ]; then
    echo -e "${YELLOW}📦 Installation des dépendances Python...${NC}"
    pip install -r requirements.txt
    touch requirements_installed.flag
fi

# Installer les dépendances npm si nécessaire
if [ ! -d "webapp/node_modules" ]; then
    echo -e "${YELLOW}📦 Installation des dépendances npm...${NC}"
    cd webapp && npm install && cd ..
fi

# Créer un fichier de paiements vide si nécessaire
if [ ! -f "pending_payments.json" ]; then
    echo "{}" > pending_payments.json
    echo -e "${GREEN}✅ Fichier pending_payments.json créé${NC}"
fi

# Vérifier le fichier de config
if [ ! -f "config.json" ]; then
    echo -e "${RED}❌ Fichier config.json manquant!${NC}"
    echo "Créez le fichier config.json avec vos tokens:"
    echo '{'
    echo '  "discord_token": "VOTRE_TOKEN_DISCORD",'
    echo '  "privy_app_id": "VOTRE_PRIVY_APP_ID",'
    echo '  "privy_app_secret": "VOTRE_PRIVY_APP_SECRET"'
    echo '}'
    exit 1
fi

echo -e "${GREEN}✅ Toutes les dépendances sont prêtes${NC}"

# Démarrer l'API Python
echo -e "${YELLOW}🔄 Démarrage de l'API Python (port 5000)...${NC}"
cd webapp
python payment-api.py &
API_PID=$!
cd ..

# Attendre que l'API soit prête
sleep 3

# Vérifier que l'API est démarrée
if curl -s http://localhost:5000/health > /dev/null; then
    echo -e "${GREEN}✅ API Python démarrée avec succès${NC}"
else
    echo -e "${RED}❌ Échec du démarrage de l'API Python${NC}"
    kill $API_PID 2>/dev/null
    exit 1
fi

# Démarrer la webapp React
echo -e "${YELLOW}🔄 Démarrage de la webapp React (port 5173)...${NC}"
cd webapp
npm run dev &
WEBAPP_PID=$!
cd ..

# Attendre que la webapp soit prête
sleep 5

# Démarrer le bot Discord
echo -e "${YELLOW}🔄 Démarrage du bot Discord...${NC}"
python main.py &
BOT_PID=$!

echo -e "${GREEN}🎉 Tous les services sont démarrés!${NC}"
echo -e "${GREEN}📱 Bot Discord: Actif${NC}"
echo -e "${GREEN}🌐 Webapp: http://localhost:5173${NC}"
echo -e "${GREEN}🔧 API: http://localhost:5000${NC}"
echo ""
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter tous les services${NC}"

# Attendre indéfiniment
wait
