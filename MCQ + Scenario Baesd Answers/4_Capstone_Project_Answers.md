# Capstone Project — Anomaly Detection with MLflow Experiment Tracking

**Source:** `4_Capstone Project - 3.docx`  
**Duration:** 10 Days  
**Dataset:** [Kaggle Fraud Detection](https://www.kaggle.com/datasets/kartik2112/fraud-detection) (or any imbalanced binary classification dataset with similar numerical features)

---

## 1. The Challenge — Approach

**Goal:** Build a complete ML experimentation workflow for anomaly/fraud detection with explicit class imbalance handling, full MLflow tracking, and reproducibility.

**Key focus areas:**
- Handle severe class imbalance (≥ 80:20, preferably higher)
- Compare at least four model configurations
- Track every experiment in one MLflow experiment
- Register and promote the best model through MLflow Model Registry
- Prove end-to-end workflow with test-set inference

---

## 2. Technical Requirements — Answers

### A. Dataset & Preprocessing

**Load and inspect class distribution:**

```python
import pandas as pd
import numpy as np

df = pd.read_csv("creditcard.csv")  # or your dataset
print(df["Class"].value_counts(normalize=True))
```

Document the imbalance ratio in the notebook (e.g., 99.8% normal vs 0.2% fraud).

**Stratified train-test split (70/30):**

```python
from sklearn.model_selection import train_test_split

X = df.drop("Class", axis=1)
y = df["Class"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.30, stratify=y, random_state=42
)
```

**Important:** Do not touch `X_test` / `y_test` until final evaluation.

**SMOTE on training set only:**

```python
from imblearn.over_sampling import SMOTE

print("Before SMOTE:", y_train.value_counts())
smote = SMOTE(random_state=42)
X_train_smote, y_train_smote = smote.fit_resample(X_train, y_train)
print("After SMOTE:", pd.Series(y_train_smote).value_counts())
```

Log before/after counts in the notebook and optionally as MLflow metrics or tags.

---

### B. Experimentation — Four Model Configurations

| # | Model | Training Data | Key Hyperparameters |
|---|-------|---------------|---------------------|
| 1 | Logistic Regression (Baseline) | Original imbalanced | `C=1`, `solver='liblinear'` |
| 2 | Random Forest | Original imbalanced | `n_estimators=30`, `max_depth=3` |
| 3 | XGBoost | Original imbalanced | `eval_metric='logloss'` |
| 4 | XGBoost with SMOTE | SMOTE-resampled train | Same XGBoost config as #3 |

**Metric extraction helper:**

```python
from sklearn.metrics import classification_report

def get_metrics(y_true, y_pred):
    report = classification_report(y_true, y_pred, output_dict=True)
    return {
        "accuracy": report["accuracy"],
        "recall_class_0": report["0"]["recall"],
        "recall_class_1": report["1"]["recall"],
        "f1_score_macro": report["macro avg"]["f1-score"],
    }
```

**Why these four?** Logistic Regression is a simple baseline; Random Forest and XGBoost capture non-linear patterns; XGBoost + SMOTE directly tests whether resampling improves minority-class recall.

---

### C. MLflow Experiment Tracking

**Start MLflow UI before running the notebook:**

```bash
mlflow ui --port 5000
```

**Single experiment for all runs:**

```python
import mlflow
import mlflow.sklearn
import mlflow.xgboost

EXPERIMENT_NAME = "anomaly-detection-fraud"
mlflow.set_experiment(EXPERIMENT_NAME)
```

**Example — Logistic Regression run:**

```python
from sklearn.linear_model import LogisticRegression

with mlflow.start_run(run_name="Logistic Regression"):
    model = LogisticRegression(C=1, solver="liblinear", random_state=42)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    metrics = get_metrics(y_test, preds)

    mlflow.log_param("C", 1)
    mlflow.log_param("solver", "liblinear")
    for k, v in metrics.items():
        mlflow.log_metric(k, v)
    mlflow.sklearn.log_model(model, "model")
```

**Example — XGBoost with SMOTE:**

```python
from xgboost import XGBClassifier

with mlflow.start_run(run_name="XGBClassifier With SMOTE"):
    model = XGBClassifier(eval_metric="logloss", random_state=42)
    model.fit(X_train_smote, y_train_smote)
    preds = model.predict(X_test)
    metrics = get_metrics(y_test, preds)

    mlflow.log_param("eval_metric", "logloss")
    mlflow.log_param("used_smote", True)
    for k, v in metrics.items():
        mlflow.log_metric(k, v)
    mlflow.xgboost.log_model(model, "model")
```

**Required run names:**
- `"Logistic Regression"`
- `"Random Forest"`
- `"XGBClassifier"` (or similar for original data)
- `"XGBClassifier With SMOTE"`

---

### D. Model Registry Workflow

**Step 1 — Find best run** (prioritize `recall_class_1` and `f1_score_macro`):

```python
import mlflow
from mlflow.tracking import MlflowClient

runs = mlflow.search_runs(
    experiment_names=[EXPERIMENT_NAME],
    order_by=["metrics.recall_class_1 DESC", "metrics.f1_score_macro DESC"],
)
best_run_id = runs.iloc[0]["run_id"]
print("Best run:", best_run_id)
```

**Step 2 — Register as challenger:**

```python
model_uri = f"runs:/{best_run_id}/model"
registered = mlflow.register_model(model_uri, "anomaly-detector-xgb-smote")
version = registered.version
```

**Step 3 — Assign `@challenger` alias:**

```python
client = MlflowClient()
client.set_registered_model_alias("anomaly-detector-xgb-smote", "challenger", version)
```

**Step 4 — Copy to production registry entry:**

```python
client.copy_model_version(
    src_model_uri=f"models:/anomaly-detector-xgb-smote/{version}",
    dst_name="anomaly-detection-prod",
)
```

**Step 5 — Assign `@champion` on production version:**

```python
prod_versions = client.search_model_versions("name='anomaly-detection-prod'")
prod_version = prod_versions[0].version
client.set_registered_model_alias("anomaly-detection-prod", "champion", prod_version)
```

**Step 6 — Load production model and run inference on test set:**

```python
import mlflow.xgboost  # or mlflow.pyfunc

prod_model = mlflow.xgboost.load_model("models:/anomaly-detection-prod@champion")
# or: mlflow.pyfunc.load_model("models:/anomaly-detection-prod@champion")

final_preds = prod_model.predict(X_test)
final_metrics = get_metrics(y_test, final_preds)
print(final_metrics)
```

---

### E. Reproducibility Checklist

| Requirement | How to satisfy |
|-------------|----------------|
| Single Jupyter notebook | All four experiments + registry workflow in one `.ipynb` |
| MLflow UI on port 5000 | `mlflow ui --port 5000` before running cells |
| Consistent experiment name | `mlflow.set_experiment("anomaly-detection-fraud")` at top |
| Fixed random seeds | `random_state=42` on split, SMOTE, and models |
| Test set untouched | Evaluate only at end of each run; no SMOTE on test |

Add `mlruns/` to `.gitignore` (or use Git LFS for large artifacts).

---

## 3. MLflow UI Snapshots — What to Capture

Save all screenshots as `.png` in `/screenshots`:

| # | Snapshot | What it must show |
|---|----------|-------------------|
| 1 | Experiments List View | Experiment name + all four runs with run names |
| 2 | Runs Comparison View | Side-by-side metrics: accuracy, recall_class_0, recall_class_1, f1_score_macro |
| 3 | Individual Run Detail | Best run — parameters, metrics, model artifact path |
| 4 | Model Registry View | `anomaly-detector-xgb-smote` with `@challenger` alias |
| 5 | Production Model Detail | `anomaly-detection-prod` with `@champion` and linked source run |

---

## 4. Git Workflow

- Public GitHub repository with regular commits (data load → EDA → each model → registry)
- `.gitignore` for `mlruns/`, `__pycache__/`, `.ipynb_checkpoints/`, large data files
- README.md with dataset link (required if using a non-Kaggle dataset)
- Meaningful commit messages: `Add SMOTE preprocessing`, `Log XGBoost SMOTE run to MLflow`, `Register champion model`

---

## 5. Code of Conduct — AI Use

- AI may help with boilerplate (data loading, metric extraction)
- **You must design** MLflow experiment structure, logging, and registry workflow yourself
- Every AI-assisted block must include: `# Assisted by [AI Name]`

---

## 6. Final Submission Checklist

| Item | Location |
|------|----------|
| GitHub Repository URL | Submit this URL only |
| Complete Jupyter Notebook | Repo root or `/notebooks` |
| 5 MLflow UI screenshots | `/screenshots/*.png` |
| Experiment Report (PDF) | Summarize 4 experiments, imbalance observations, metric comparison, production model justification |
| Screencast video | Walk through repo, notebook, MLflow UI (runs, comparison, registry) — stored in repo |

---

## 7. Experiment Report — Suggested Structure

1. **Introduction** — dataset, imbalance ratio, objective
2. **Preprocessing** — stratified split, SMOTE before/after counts
3. **Model comparison table** — all four runs with four metrics
4. **Class imbalance analysis** — which model best detected minority class (recall_class_1)
5. **Production model choice** — justify selection based on recall_class_1 + f1_score_macro
6. **Registry workflow** — challenger → prod copy → champion aliases
7. **Conclusion** — SMOTE impact, limitations, next steps

---

## 8. Repository Structure (Recommended)

```
anomaly-detection-capstone/
├── README.md
├── .gitignore
├── requirements.txt
├── notebooks/
│   └── anomaly_detection_mlflow.ipynb
├── screenshots/
│   ├── 01_experiments_list.png
│   ├── 02_runs_comparison.png
│   ├── 03_best_run_detail.png
│   ├── 04_model_registry_challenger.png
│   └── 05_production_champion.png
├── reports/
│   └── experiment_report.pdf
├── videos/
│   └── walkthrough.mp4
└── data/               # optional; often gitignored with download instructions
```

---

## 9. Choosing the Best Model — Guidance

For **fraud/anomaly detection**, optimize for **recall_class_1** (catch fraud) while keeping **f1_score_macro** reasonable to avoid a model that predicts everything as fraud.

Typical outcome: XGBoost with SMOTE achieves higher recall on the minority class than Logistic Regression on imbalanced data — but document your actual results; the best run depends on your dataset.

**Production justification example:**  
*"XGBClassifier With SMOTE was selected because it achieved the highest recall_class_1 (0.82) and f1_score_macro (0.79), meaning it best balances detecting fraud cases without excessive false positives compared to the baseline."*
