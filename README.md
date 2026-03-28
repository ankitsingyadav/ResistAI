# 🚀 ResistAI – Predict Antibiotic Resistance in Seconds

> Stop guessing. Start predicting.

---

## 🧠 Overview

**ResistAI** is an AI-powered clinical decision support system that predicts **antibiotic resistance** in real-time using machine learning.

Antimicrobial resistance (AMR) is a global health crisis, causing treatment delays and increasing mortality due to slow lab results.

ResistAI bridges this gap by providing **instant predictions (<2s)** based on patient, bacterial, and clinical data.

---

## ⚡ Key Features

* 🧬 **Species-aware prediction** (E. coli, S. aureus, etc.)
* 💊 **Target antibiotic resistance prediction**
* 📊 **Probability-based output (risk scoring)**
* 🧠 **Explainable AI (XAI)** – shows why prediction was made
* 📈 **Antibiotic ranking system** (best → worst)
* 🏥 **Clinical context inputs**:

  * Patient age
  * Hospital ward (ICU / OPD)
  * Infection source
  * Prior antibiotic exposure
* ⚡ **Real-time prediction (<2 seconds)**

---

## 🎯 Problem Statement

* ⏳ Traditional lab testing takes **48–72 hours**
* ❌ Wrong antibiotic choice → treatment failure
* ⚠️ Rising global AMR threat

👉 **Solution:** AI-driven early prediction to assist doctors in decision-making

---

## 🧠 How It Works

```mermaid
graph TD
A[User Input] --> B[Feature Processing]
B --> C[ML Model]
C --> D[Prediction Output]
D --> E[Explainability + Ranking]
```

---

## 📊 Example Output

```text
Bacteria: E. coli
Antibiotic: Ciprofloxacin

Resistance: HIGH 🔴
Probability: 82%

Reason:
- Prior antibiotic exposure
- ICU admission
- Urinary infection
```

---

## 🏗️ Tech Stack

### 🔹 Frontend

* React.js / Next.js
* Tailwind CSS
* Framer Motion

### 🔹 Backend

* FastAPI (Python)

### 🔹 Machine Learning

* Scikit-learn
* Random Forest / Logistic Regression
* SHAP (Explainability)

---

## 📂 Project Structure

```bash
ResistAI/
│
├── backend/                     # FastAPI backend
│   ├── app.py                  # Main API file
│   ├── train_model.py          # Model training script
│   ├── test_predict.py         # Model testing script
│   ├── resistance_model.pkl    # Trained ML model
│   ├── dataset1.csv            # Training dataset
│   ├── dataset2.csv            # Additional dataset
│   └── __pycache__/            # Python cache files
│
├── frontend/                   # Frontend UI
│   ├── index.html              # Main UI page
│   ├── styles.css              # Styling
│   ├── script.js               # Frontend logic
│   └── package-lock.json       # Dependencies lock file
│
├── .venv/                      # Virtual environment (ignored)
├── LICENSE                     # License file
├── README.md                   # Project documentation
```


---

## 🧪 Model Details

The model is trained on clinical-like features such as:

* Bacterial species
* Patient demographics
* Infection type
* Antibiotic exposure history

---

## 📸 Screenshots

### 🏠 Home Page
![home](https://github.com/ankitsingyadav/ResistAI/blob/main/screenshots/dashboard.png?raw=true)

### 📊 Dashboard
![Dashboard](https://github.com/ankitsingyadav/ResistAI/blob/main/screenshots/dashboard.png?raw=true)
---

## ⚠️ Disclaimer

This project is for **educational and research purposes only**
Not intended for real clinical use

---

## 💡 Future Improvements

* 🔬 Real hospital dataset integration
* 📱 Mobile app version
* 🤖 Deep learning models
* 🧠 LLM-based assistant
* 🔗 EHR integration

---

## 🤝 Contributing

Contributions are welcome!
Feel free to fork and submit pull requests.

---

## 👨‍💻 Author

**Ankit singh Yadav**
**Github-ankitsingyadav**

---

## ⭐ Show Your Support

If you like this project:

👉 Star ⭐ the repo
👉 Share it
👉 Use it in your portfolio

---
