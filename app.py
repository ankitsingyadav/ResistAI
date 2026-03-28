predictions_log = []
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import joblib
import numpy as np
from datetime import datetime
import os
import time

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Load trained model
model = joblib.load("resistance_model.pkl")

# ─── Static file serving ────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/styles.css')
def styles():
    return send_file('styles.css', mimetype='text/css')

@app.route('/script.js')
def script():
    return send_file('script.js', mimetype='application/javascript')

# ─── Prediction endpoint ────────────────────────────────────────────────────────

@app.route('/predict', methods=['POST'])
def predict():
    start_time = time.time()
    data = request.json

    imipenem     = float(data.get('imipenem', 10))
    ceftazidime  = float(data.get('ceftazidime', 10))
    gentamicin   = float(data.get('gentamicin', 10))

    species          = data.get('species', 'Unknown')
    ward             = data.get('ward', 'Unknown')
    infection_source = data.get('infection_source', '')
    target_antibiotic= data.get('target_antibiotic', '')
    prior_antibiotics= data.get('prior_antibiotics', [])
    stay             = data.get('stay', '')          # short / medium / long
    device           = data.get('device', '')        # catheter / ventilator / central_line
    prior_hosp       = data.get('prior_hosp', '')   # recent / distant

    # ML prediction
    features = [[imipenem, ceftazidime, gentamicin]]
    prediction_raw = model.predict(features)
    prediction = prediction_raw[0] if hasattr(prediction_raw, '__len__') and len(prediction_raw) > 0 else [0, 0]

    result = {
        'augmentin':    int(prediction[0]) if len(prediction) > 0 else 0,
        'ciprofloxacin':int(prediction[1]) if len(prediction) > 1 else 0
    }

    prediction_time = time.time() - start_time

    # Build record
    record = {
        'id':                f'P-{len(predictions_log) + 1000}',
        'timestamp':         datetime.now().isoformat(),
        'species':           species,
        'ward':              ward,
        'infection_source':  infection_source,
        'target_antibiotic': target_antibiotic,
        'prior_antibiotics': prior_antibiotics,
        'stay':              stay,
        'device':            device,
        'prior_hosp':        prior_hosp,
        'inputs': {
            'imipenem':    imipenem,
            'ceftazidime': ceftazidime,
            'gentamicin':  gentamicin,
        },
        'ml_results':       result,
        'prediction_time':  prediction_time,
        'full_results':     []
    }
    predictions_log.append(record)

    return jsonify({
        'augmentin':       result['augmentin'],
        'ciprofloxacin':   result['ciprofloxacin'],
        'prediction_time': round(prediction_time, 4),
        'record_id':       record['id']
    })

# ─── Stats ───────────────────────────────────────────────────────────────────────

@app.route('/stats', methods=['GET'])
def stats():
    return jsonify({
        'total': len(predictions_log),
        'species_counts': _species_counts(),
    })

@app.route('/history', methods=['GET'])
def history():
    return jsonify(predictions_log[::-1])

@app.route('/log_full_results', methods=['POST'])
def log_full_results():
    data = request.json
    full_results = data.get('full_results', [])
    if predictions_log:
        predictions_log[-1]['full_results'] = full_results
    return jsonify({'status': 'logged', 'record_id': predictions_log[-1]['id'] if predictions_log else None})

# ─── Chat (rule-based) ───────────────────────────────────────────────────────────

CHAT_KB = {
    'antibiotic resistance': 'Antibiotic resistance occurs when bacteria evolve to defeat the drugs designed to kill them. It happens through genetic mutations, often accelerated by antibiotic misuse. ResistAI helps predict which antibiotics will still work.',
    'how does it work': 'ResistAI uses a RandomForest ML model trained on clinical microbiology data. Enter species, ward, infection source, and prior antibiotic exposure, and it predicts resistance probabilities for 12 antibiotics.',
    'how to use': '1. Select bacterial species\n2. Fill in ward, infection source, and risk factors\n3. Select prior antibiotics used\n4. Click Predict Resistance\nResults include a ranked antibiotic list with SHAP explanations.',
    'results mean': 'Green (<40%) = Likely effective · Yellow (40-65%) = Uncertain · Red (>65%) = Likely resistant. The SHAP tab explains which factors influenced the prediction.',
    'how accurate': 'The model achieves ~80%+ AUC on test data. It\'s a decision-support tool — always confirm with laboratory culture and sensitivity testing.',
    'shap': 'SHAP (SHapley Additive exPlanations) values show which clinical factors most contributed to the resistance prediction.',
    'species': 'Supported: E. coli, S. aureus, K. pneumoniae, P. aeruginosa, A. baumannii, E. faecalis.',
    'amr': 'AMR (Antimicrobial Resistance) is when microorganisms no longer respond to medicines. It kills ~700,000 people per year globally and threatens to reach 10 million by 2050.',
    'help': 'Ask me about: antibiotic resistance, how to use the predictor, what results mean, how accurate the model is, or SHAP explanations.',
}

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_msg = data.get('message', '').lower().strip()
    response = next((v for k, v in CHAT_KB.items() if k in user_msg), 
                    'I can help with questions about ResistAI and antibiotic resistance. Try asking: "What is antibiotic resistance?" or "How do I use the predictor?"')
    return jsonify({'response': response})

# ─── Helpers ─────────────────────────────────────────────────────────────────────

def _species_counts():
    counts = {}
    for r in predictions_log:
        s = r.get('species', 'Unknown')
        counts[s] = counts.get(s, 0) + 1
    return counts

if __name__ == '__main__':
    print('🚀 ResistAI running at http://127.0.0.1:5000')
    app.run(debug=True, host='0.0.0.0', port=5000)
