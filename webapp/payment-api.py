from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Permettre les requêtes cross-origin depuis la webapp

def load_pending_payments():
    """Charge les paiements en attente depuis le fichier"""
    try:
        if os.path.exists('../pending_payments.json'):
            with open('../pending_payments.json', 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"❌ Erreur chargement paiements: {e}")
        return {}

def save_pending_payments(payments):
    """Sauvegarde les paiements dans le fichier"""
    try:
        with open('../pending_payments.json', 'w') as f:
            json.dump(payments, f, indent=2, default=str)
        return True
    except Exception as e:
        print(f"❌ Erreur sauvegarde paiements: {e}")
        return False

@app.route('/api/payment/<payment_id>', methods=['GET'])
def get_payment(payment_id):
    """Récupère les détails d'un paiement"""
    payments = load_pending_payments()
    
    if payment_id not in payments:
        return jsonify({'error': 'Paiement non trouvé'}), 404
    
    payment_data = payments[payment_id]
    print(f"✅ Paiement récupéré: {payment_id}")
    return jsonify(payment_data)

@app.route('/api/payment/<payment_id>/confirm', methods=['POST'])
def confirm_payment(payment_id):
    """Confirme un paiement"""
    payments = load_pending_payments()
    
    if payment_id not in payments:
        return jsonify({'error': 'Paiement non trouvé'}), 404
    
    # Mettre à jour le statut
    payments[payment_id]['status'] = 'completed'
    payments[payment_id]['confirmed_at'] = datetime.now().isoformat()
    
    # Ajouter les données de confirmation si fournies
    confirmation_data = request.get_json()
    if confirmation_data:
        payments[payment_id].update(confirmation_data)
    
    # Sauvegarder
    if save_pending_payments(payments):
        print(f"✅ Paiement confirmé: {payment_id}")
        return jsonify({'success': True, 'payment': payments[payment_id]})
    else:
        return jsonify({'error': 'Erreur sauvegarde'}), 500

@app.route('/api/payments', methods=['GET'])
def list_payments():
    """Liste tous les paiements"""
    payments = load_pending_payments()
    return jsonify(payments)

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de santé pour vérifier que l'API fonctionne"""
    return jsonify({'status': 'OK', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    print("🚀 Démarrage du serveur API de paiement...")
    print("📡 API disponible sur http://localhost:5000")
    print("🔍 Endpoints disponibles:")
    print("  - GET /api/payment/<id>")
    print("  - POST /api/payment/<id>/confirm")
    print("  - GET /api/payments")
    print("  - GET /health")
    app.run(debug=True, port=5000, host='0.0.0.0')
