# ResistAI – Antibiotic Resistance Predictor

AI-powered clinical decision support tool for predicting antibiotic resistance patterns.

---

## 🚀 Quick Start

### 1. Set up Python virtual environment

```bash
# In your project folder
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Mac/Linux)
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install flask flask-cors scikit-learn joblib numpy pandas
```

### 3. Make sure these files are in the same folder

```
resistai/
├── app.py
├── index.html
├── styles.css
├── script.js
├── resistance_model.pkl
├── train_model.py
├── dataset2.csv
└── README.md
```

### 4. Run the app

```bash
python app.py
```

Then open: **http://127.0.0.1:5000**

---

## 🔧 Retrain the model

If you want to retrain with updated data:

```bash
python train_model.py
```

This generates a new `resistance_model.pkl`.

---

## ✨ Features

| Feature | Status |
|---|---|
| 12-antibiotic resistance prediction | ✅ |
| Species-aware profiles | ✅ |
| Clinical risk factor modifiers (ICU, stay duration, device, prior hospitalization) | ✅ |
| Animated loading with step-by-step feedback | ✅ |
| Result card with ranked antibiotic list | ✅ |
| Best antibiotic recommendation | ✅ |
| SHAP feature importance explanations | ✅ |
| Resistance dashboard with Chart.js trends | ✅ |
| Prediction history log | ✅ |
| AI chatbot assistant | ✅ |
| Simulation fallback if backend unavailable | ✅ |

---

## 🏥 Disclaimer

ResistAI is a **decision-support tool only**. Always confirm predictions with laboratory culture and sensitivity testing, and consult infectious disease specialists before prescribing.
