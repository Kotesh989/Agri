import csv
import random
import os

# Base crop attributes
CROP_PROFILES = {
  'Tomato': { 'base_yield': 12.0, 'base_price': 2500, 'temp_opt': 24, 'rain_opt': 100 },
  'Onion': { 'base_yield': 8.5, 'base_price': 2200, 'temp_opt': 21, 'rain_opt': 80 },
  'Potato': { 'base_yield': 18.0, 'base_price': 1800, 'temp_opt': 18, 'rain_opt': 90 },
  'Chilli': { 'base_yield': 1.8, 'base_price': 14000, 'temp_opt': 26, 'rain_opt': 70 },
  'Coconut': { 'base_yield': 60.0, 'base_price': 30, 'temp_opt': 28, 'rain_opt': 180 }, # Yield in hundreds of nuts, price per hundred
  'Rice': { 'base_yield': 2.4, 'base_price': 2100, 'temp_opt': 25, 'rain_opt': 150 },
  'Wheat': { 'base_yield': 1.6, 'base_price': 2200, 'temp_opt': 15, 'rain_opt': 60 },
  'Maize': { 'base_yield': 3.2, 'base_price': 1950, 'temp_opt': 24, 'rain_opt': 110 }
}

SOILS = ['Black', 'Red', 'Loamy', 'Sandy', 'Clay', 'Alluvial', 'Laterite', 'Sandy Loam']
WATER_SOURCES = ['Borewell', 'Canal', 'Rain-fed', 'River', 'Tank']

STATES = {
  'Karnataka': ['Haveri', 'Bangalore Urban', 'Mysore', 'Mandya', 'Belagavi', 'Dharwad'],
  'Maharashtra': ['Pune', 'Nagpur', 'Thane', 'Nashik'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem']
}

def generate_row():
  state = random.choice(list(STATES.keys()))
  district = random.choice(STATES[state])
  crop = random.choice(list(CROP_PROFILES.keys()))
  soil = random.choice(SOILS)
  water = random.choice(WATER_SOURCES)
  
  month = random.randint(1, 12)
  profile = CROP_PROFILES[crop]
  
  # Climate influence
  temp = random.randint(12, 38)
  rainfall = random.randint(20, 300)
  
  # Compute yield
  yield_val = profile['base_yield']
  # Soil multiplier
  soil_mult = 1.1 if soil in ['Loamy', 'Black', 'Alluvial'] else 0.85 if soil == 'Sandy' else 1.0
  yield_val *= soil_mult
  # Water source multiplier
  water_mult = 1.1 if water in ['Borewell', 'Canal'] else 0.8 if water == 'Rain-fed' and rainfall < 80 else 1.0
  yield_val *= water_mult
  # Temperature deviation penalty
  temp_dev = abs(temp - profile['temp_opt'])
  yield_val *= max(0.4, 1.0 - (temp_dev * 0.03))
  yield_val = round(max(0.1, yield_val * (0.9 + random.random() * 0.2)), 2)
  
  # Compute price
  price_val = profile['base_price']
  # State price factor
  state_mult = 1.15 if state == 'Karnataka' else 0.95
  price_val *= state_mult
  # Sowing month seasonality
  month_mult = 1.12 if month in [10, 11, 12] else 0.92 if month in [5, 6, 7] else 1.0
  price_val *= month_mult
  price_val = int(price_val * (0.85 + random.random() * 0.3))
  
  return [state, district, crop, soil, water, month, temp, rainfall, yield_val, price_val]

def main():
  output_dir = os.path.dirname(os.path.abspath(__file__))
  csv_path = os.path.join(output_dir, 'agricultural_training_data.csv')
  
  print(f"[ML] Generating synthetic dataset: {csv_path}...")
  with open(csv_path, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([
      'state', 'district', 'crop', 'soil_type', 'water_source', 
      'sowing_month', 'avg_temp', 'rainfall', 'yield_per_acre', 'market_price'
    ])
    for _ in range(12000):
      writer.writerow(generate_row())
  
  print("[ML] Dataset generation completed successfully.")

if __name__ == '__main__':
  main()
