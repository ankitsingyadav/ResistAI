"""
ResistAI — Model Training Script
Handles both Dataset1 (numeric MIC values) and Dataset2 (S/I/R categories)
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier
from sklearn.metrics import accuracy_score
import joblib

DATASET1_PATH = "dataset1.csv"
DATASET2_PATH = "dataset2.csv"
OUTPUT_MODEL  = "resistance_model.pkl"
FEATURE_COLS  = ["IMIPENEM", "CEFTAZIDIME", "GENTAMICIN"]
TARGET_COLS   = ["AUGMENTIN", "CIPROFLOXACIN"]

BREAKPOINTS = {
    "IMIPENEM":      {"R": 15, "I": 20},
    "CEFTAZIDIME":   {"R": 14, "I": 17},
    "GENTAMICIN":    {"R": 12, "I": 14},
    "AUGMENTIN":     {"R": 13, "I": 17},
    "CIPROFLOXACIN": {"R": 15, "I": 20},
}
SIR_MAP = {"S": 10, "I": 55, "R": 90}

def numeric_to_sir(val, col):
    bp = BREAKPOINTS.get(col, {"R": 14, "I": 17})
    if pd.isna(val): return np.nan
    if val <= bp["R"]: return "R"
    elif val <= bp["I"]: return "I"
    else: return "S"

def clean_sir(val):
    if pd.isna(val): return np.nan
    v = str(val).strip().upper()
    if v in ("R","RESISTANT"): return "R"
    if v in ("I","INTERMEDIATE"): return "I"
    if v in ("S","SUSCEPTIBLE"): return "S"
    return np.nan

# --- Dataset1 (numeric) ---
print("\n📂 Loading Dataset1 (numeric MIC)...")
df1 = pd.read_csv(DATASET1_PATH)
df1.columns = df1.columns.str.strip().str.upper()
all_cols = FEATURE_COLS + TARGET_COLS
df1 = df1[[c for c in all_cols if c in df1.columns]].copy()
for col in df1.columns:
    df1[col] = df1[col].apply(lambda v: numeric_to_sir(v, col))
    df1[col] = df1[col].map(SIR_MAP)
df1 = df1.dropna()
print(f"  ✅ {len(df1)} rows")

# --- Dataset2 (S/I/R) ---
print("📂 Loading Dataset2 (S/I/R categorical)...")
df2_raw = pd.read_csv(DATASET2_PATH)
df2_raw.columns = df2_raw.columns.str.strip()
df2 = df2_raw.rename(columns={"IPM":"IMIPENEM","CTX/CRO":"CEFTAZIDIME","GEN":"GENTAMICIN","AMX/AMP":"AUGMENTIN","CIP":"CIPROFLOXACIN"})
df2 = df2[[c for c in all_cols if c in df2.columns]].copy()
for col in df2.columns:
    df2[col] = df2[col].apply(clean_sir).map(SIR_MAP)
df2 = df2.dropna()
print(f"  ✅ {len(df2)} rows")

# --- Merge ---
df = pd.concat([df1, df2], ignore_index=True)
print(f"\n🔗 Combined: {len(df)} rows total")

# --- Split ---
X = df[FEATURE_COLS]
y = df[TARGET_COLS]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"🔀 Train: {len(X_train)} | Test: {len(X_test)}")

# --- Train ---
print("\n🤖 Training RandomForest (200 trees)...")
model = MultiOutputClassifier(RandomForestClassifier(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1))
model.fit(X_train, y_train)

# --- Evaluate ---
print("\n📊 Accuracy on test set:")
y_pred = model.predict(X_test)
for i, col in enumerate(TARGET_COLS):
    acc = accuracy_score(y_test[col], y_pred[:, i])
    print(f"  {col}: {acc*100:.1f}%")

# --- Save ---
joblib.dump(model, OUTPUT_MODEL)
print(f"\n🎉 Saved → {OUTPUT_MODEL}  |  Run: python app.py")