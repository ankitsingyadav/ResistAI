# ─────────────────────────────────────────
# ResistAI Backend (Final Version)
# ─────────────────────────────────────────

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

# ─── Health Check (NEW) ─────────────────────────────────────────
@app.route('/health')
def health():
    return jsonify({"status": "ok"})

# ─── Static file serving ────────────────────────────────────────
@app.route('/')
def index():
    return send_file('index.html')

@app.route('/styles.css')
def styles():
    return send_file('styles.css', mimetype='text/css')

@app.route('/script.js')
def script():
    return send_file('script.js', mimetype='application/javascript')

# ─── Prediction endpoint ────────────────────────────────────────
@app.route('/predict', methods=['POST'])
def predict():
    start_time = time.time()
    data = request.json

    imipenem     = float(data.get('imipenem', 10))
    ceftazidime  = float(data.get('ceftazidime', 10))
    gentamicin   = float(data.get('gentamicin', 10))

    species           = data.get('species', 'Unknown')
    ward              = data.get('ward', 'Unknown')
    infection_source  = data.get('infection_source', '')
    target_antibiotic = data.get('target_antibiotic', '')
    prior_antibiotics = data.get('prior_antibiotics', [])
    stay              = data.get('stay', '')
    device            = data.get('device', '')
    prior_hosp        = data.get('prior_hosp', '')

    # ML prediction
    features = [[imipenem, ceftazidime, gentamicin]]

    try:
        prediction_raw = model.predict(features)
        prediction = prediction_raw[0] if hasattr(prediction_raw, '__len__') else [0, 0]
    except:
        prediction = [0, 0]

    result = {
        'augmentin': int(prediction[0]) if len(prediction) > 0 else 0,
        'ciprofloxacin': int(prediction[1]) if len(prediction) > 1 else 0
    }

    prediction_time = time.time() - start_time

    # Store record
    record = {
        'id': f'P-{len(predictions_log) + 1000}',
        'timestamp': datetime.now().isoformat(),
        'species': species,
        'ward': ward,
        'infection_source': infection_source,
        'target_antibiotic': target_antibiotic,
        'prior_antibiotics': prior_antibiotics,
        'stay': stay,
        'device': device,
        'prior_hosp': prior_hosp,
        'inputs': {
            'imipenem': imipenem,
            'ceftazidime': ceftazidime,
            'gentamicin': gentamicin,
        },
        'ml_results': result,
        'prediction_time': prediction_time,
        'full_results': []
    }

    predictions_log.append(record)

    # ✅ Improved Response (UPDATED)
    return jsonify({
        "status": "success",
        "prediction": result,
        "prediction_time": round(prediction_time, 4),
        "record_id": record['id']
    })

# ─── Stats ──────────────────────────────────────────────────────
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
    return jsonify({
        'status': 'logged',
        'record_id': predictions_log[-1]['id'] if predictions_log else None
    })

# ─── Chatbot ────────────────────────────────────────────────────
CHAT_KB = {
    'antibiotic resistance': 'Antibiotic resistance occurs when bacteria evolve to defeat drugs.',
    'how does it work': 'Uses RandomForest ML model trained on clinical data.',
    'how to use': 'Select species → fill details → click predict.',
    'results mean': 'Green = effective, Yellow = uncertain, Red = resistant.',
    'accuracy': 'Model achieves ~80%+ AUC.',
}

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_msg = data.get('message', '').lower().strip()
    response = next((v for k, v in CHAT_KB.items() if k in user_msg),
                    'Ask about resistance, usage, or model.')
    return jsonify({'response': response})


# ─── Helpers ────────────────────────────────────────────────────
def _species_counts():
    counts = {}
    for r in predictions_log:
        s = r.get('species', 'Unknown')
        counts[s] = counts.get(s, 0) + 1
    return counts

# ─── Run App (FIXED PORT) ───────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))   # ✅ FIXED
    print(f'🚀 ResistAI running on port {port}')
    app.run(debug=True, host='0.0.0.0', port=port)