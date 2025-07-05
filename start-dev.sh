#!/bin/bash

echo "🚀 Démarrage du PayBot en mode développement..."

# Fonction pour nettoyer les processus à la fermeture
cleanup() {
    echo -e "\n🛑 Arrêt des services..."
    kill $API_PID $WEBAPP_PID 2>/dev/null
    exit 0
}

# Trap pour nettoyer à la fermeture
trap cleanup SIGINT SIGTERM

# Créer un fichier de paiements vide si nécessaire
if [ ! -f "pending_payments.json" ]; then
    echo "{}" > pending_payments.json
    echo "✅ Fichier pending_payments.json créé"
fi

# Démarrer l'API Python en arrière-plan
echo "🔄 Démarrage de l'API Python (port 5000)..."
cd webapp
python payment-api.py &
API_PID=$!
cd ..

# Attendre que l'API soit prête
echo "⏳ Attente du démarrage de l'API..."
sleep 3

# Vérifier que l'API est démarrée
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ API Python démarrée avec succès"
else
    echo "❌ Échec du démarrage de l'API Python"
    echo "💡 Vérifiez que Flask est installé: pip install flask flask-cors"
    kill $API_PID 2>/dev/null
    exit 1
fi

# Démarrer la webapp React en arrière-plan
echo "🔄 Démarrage de la webapp React (port 5173)..."
cd webapp
npm run dev &
WEBAPP_PID=$!
cd ..

echo "🎉 Services démarrés!"
echo "🌐 Webapp: http://localhost:5173"
echo "🔧 API: http://localhost:5000"
echo ""
echo "Pour démarrer le bot Discord, exécutez dans un autre terminal:"
echo "python main.py"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter les services"

# Attendre indéfiniment
wait
