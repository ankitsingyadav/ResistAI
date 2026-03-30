predictions_log = []
lab_feedback_log = []
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import joblib, time
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)
model = joblib.load("resistance_model.pkl")

@app.route('/')
def index(): return send_file('index.html')
@app.route('/styles.css')
def styles(): return send_file('styles.css', mimetype='text/css')
@app.route('/script.js')
def script(): return send_file('script.js', mimetype='application/javascript')

@app.route("/predict", methods=["POST"])
def predict():
    t0 = time.time()
    data = request.json
    features = [[float(data.get("imipenem",10)), float(data.get("ceftazidime",10)), float(data.get("gentamicin",10))]]
    pred = model.predict(features)[0]
    record = {
        "id": f"P-{len(predictions_log)+1000}",
        "timestamp": datetime.now().isoformat(),
        "species": data.get("species",""),
        "ward": data.get("ward",""),
        "infection_source": data.get("infection_source",""),
        "prior_antibiotics": data.get("prior_antibiotics",[]),
        "stay": data.get("stay",""),
        "device": data.get("device",""),
        "prior_hosp": data.get("prior_hosp",""),
        "patient_id": data.get("patient_id",""),
        "ml_results": {"augmentin": int(pred[0]), "ciprofloxacin": int(pred[1])},
        "prediction_time": round(time.time()-t0, 4),
        "lab_feedback": []
    }
    predictions_log.append(record)
    return jsonify({**record["ml_results"], "prediction_time": record["prediction_time"], "record_id": record["id"]})

@app.route("/history", methods=["GET"])
def history(): return jsonify(predictions_log[::-1])

@app.route("/stats", methods=["GET"])
def stats(): return jsonify({"total": len(predictions_log), "lab_feedback": len(lab_feedback_log)})

@app.route("/log_full_results", methods=["POST"])
def log_full_results():
    data = request.json
    if predictions_log:
        predictions_log[-1].update({k: v for k, v in data.items() if k != "record_id"})
    return jsonify({"status": "logged"})

@app.route("/lab_feedback", methods=["POST"])
def lab_feedback():
    data = request.json
    entry = {**data, "timestamp": datetime.now().isoformat()}
    lab_feedback_log.append(entry)
    rec = next((r for r in predictions_log if r["id"] == data.get("record_id")), None)
    if rec: rec["lab_feedback"].append(entry)
    return jsonify({"status": "logged", "total_feedback": len(lab_feedback_log)})

@app.route("/chat", methods=["POST"])
def chat():
    msg = request.json.get("message","").lower()
    kb = {"resistance": "AMR occurs when bacteria evolve to defeat antibiotics through genetic mutations. ResistAI predicts which antibiotics will still work.","how to use": "Select species, ward, risk factors, prior antibiotics, then click Predict Resistance.","accurate": "~80%+ AUC. The 66% on Augmentin is a 3-feature baseline — production models use 15+ clinical features.","shap": "SHAP values show which clinical factors most influenced the prediction."}
    response = next((v for k,v in kb.items() if k in msg), "Ask me about antibiotic resistance, how to use the predictor, or interpreting your results!")
    return jsonify({"response": response})

if __name__ == "__main__":
    print("🚀 ResistAI running → http://127.0.0.1:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
