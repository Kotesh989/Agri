import os
import json
import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge

def train_and_export():
  base_dir = os.path.dirname(os.path.abspath(__file__))
  csv_path = os.path.join(base_dir, 'agricultural_training_data.csv')
  output_json = os.path.join(base_dir, '..', 'data', 'crop_prediction_model.json')
  
  if not os.path.exists(csv_path):
    raise FileNotFoundError(f"Training dataset not found: {csv_path}")

  # 1. Load Data
  df = pd.read_csv(csv_path)
  
  # Categorical and numerical columns
  cat_cols = ['state', 'district', 'crop', 'soil_type', 'water_source']
  num_cols = ['sowing_month', 'avg_temp', 'rainfall']
  
  # Encode categorical columns
  # We will manually map category levels to one-hot indices to export cleanly to JSON
  mappings = {}
  encoded_dfs = []
  
  for col in cat_cols:
    levels = sorted(df[col].dropna().unique().tolist())
    mappings[col] = levels
    # Create one-hot columns manually
    for level in levels:
      df[f"{col}_{level}"] = (df[col] == level).astype(float)
      
  # Compile final feature list
  feature_cols = []
  for col in cat_cols:
    feature_cols.extend([f"{col}_{level}" for level in mappings[col]])
  feature_cols.extend(num_cols)
  
  X = df[feature_cols].values
  y_yield = df['yield_per_acre'].values
  y_price = df['market_price'].values
  
  # 2. Train Models
  print("[ML] Training Yield Ridge regression model...")
  model_yield = Ridge(alpha=1.0)
  model_yield.fit(X, y_yield)
  
  print("[ML] Training Price Ridge regression model...")
  model_price = Ridge(alpha=1.0)
  model_price.fit(X, y_price)
  
  # 3. Extract parameters for export
  export_data = {
    'intercepts': {
      'yield': float(model_yield.intercept_),
      'price': float(model_price.intercept_)
    },
    'coefficients': {
      'yield': {},
      'price': {}
    },
    'mappings': mappings
  }
  
  # Map coefficients back to their feature names
  for idx, name in enumerate(feature_cols):
    export_data['coefficients']['yield'][name] = float(model_yield.coef_[idx])
    export_data['coefficients']['price'][name] = float(model_price.coef_[idx])
    
  # Create output dir if not exists
  os.makedirs(os.path.dirname(output_json), exist_ok=True)
  
  # Write to JSON
  with open(output_json, 'w') as f:
    json.dump(export_data, f, indent=2)
    
  print(f"[ML] Exported trained model parameters to: {output_json}")

if __name__ == '__main__':
  train_and_export()
