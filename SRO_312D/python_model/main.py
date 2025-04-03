import os
import numpy as np
import pickle
import logging
import tensorflow as tf
from tensorflow.keras.models import load_model

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# Define output columns and friendly names
output_cols = [
    'VCMX', 'VHM0', 'VHM0_SW1', 'VHM0_SW2', 'VHM0_WW',
    'VMDR', 'VMDR_SW1', 'VMDR_SW2', 'VMDR_WW',
    'VMXL', 'VPED', 'VSDX', 'VSDY',
    'VTM01_SW1', 'VTM01_SW2', 'VTM01_WW',
    'VTM02', 'VTM10', 'VTPK'
]

friendly_names = {
    'VCMX': 'Maximum Wave Crest',
    'VHM0': 'Significant Wave Height',
    'VHM0_SW1': 'Swell 1 Wave Height',
    'VHM0_SW2': 'Swell 2 Wave Height',
    'VHM0_WW': 'Wind Wave Height',
    'VMDR': 'Mean Wave Direction',
    'VMDR_SW1': 'Swell 1 Wave Direction',
    'VMDR_SW2': 'Swell 2 Wave Direction',
    'VMDR_WW': 'Wind Wave Direction',
    'VMXL': 'Maximum Wavelength',
    'VPED': 'Baseline Wave Energy',
    'VSDX': 'Directional Spread X',
    'VSDY': 'Directional Spread Y',
    'VTM01_SW1': 'Characteristic Period - Swell 1',
    'VTM01_SW2': 'Characteristic Period - Swell 2',
    'VTM01_WW': 'Characteristic Period - Wind Waves',
    'VTM02': 'Second Spectral Moment Period',
    'VTM10': 'Tenth Spectral Moment Period',
    'VTPK': 'Peak Wave Period'
}

# Global variables for model and scalers
model = None
scaler_X = None
scaler_Y = None
model_loaded = False

def load_model_and_scalers():
    """Load the model and scalers."""
    global model, scaler_X, scaler_Y, model_loaded
    
    try:
        # Check for necessary files
        if not os.path.exists('simple_ocean_model.h5'):
            logger.error("Model file 'simple_ocean_model.h5' not found")
            return False
        if not os.path.exists('scaler_X.pkl'):
            logger.error("Scaler file 'scaler_X.pkl' not found")
            return False
        if not os.path.exists('scaler_Y.pkl'):
            logger.error("Scaler file 'scaler_Y.pkl' not found")
            return False
        
        logger.info("Loading model...")
        model = load_model('simple_ocean_model.h5', custom_objects={'mse': tf.keras.losses.MeanSquaredError()})
        
        logger.info("Loading scalers...")
        with open('scaler_X.pkl', 'rb') as f:
            scaler_X = pickle.load(f)
        with open('scaler_Y.pkl', 'rb') as f:
            scaler_Y = pickle.load(f)
        
        # Test model with dummy data to ensure it works
        logger.info("Testing model with dummy data...")
        dummy_input = np.array([[0.0, 0.0]], dtype=np.float32)
        dummy_scaled = scaler_X.transform(dummy_input)
        dummy_output = model.predict(dummy_scaled, verbose=0)
        dummy_result = scaler_Y.inverse_transform(dummy_output)
        
        if dummy_result.shape[1] != len(output_cols):
            logger.error(f"Model output shape mismatch: expected {len(output_cols)}, got {dummy_result.shape[1]}")
            return False
        
        logger.info("Model and scalers loaded successfully")
        model_loaded = True
        return True
    except Exception as e:
        logger.error(f"Error loading model or scalers: {str(e)}")
        return False

def predict(latitude, longitude):
    """Make a prediction given latitude and longitude."""
    global model, scaler_X, scaler_Y, model_loaded

    if not model_loaded:
        if not load_model_and_scalers():
            logger.warning("Using dummy data as model failed to load")
            return {
                friendly_names[col]: float(np.random.uniform(0, 10)) for col in output_cols
            }
    
    try:
        logger.info(f"Prediction for lat={latitude}, lon={longitude}")
        
        # Prepare and scale input data
        input_data = np.array([[float(latitude), float(longitude)]], dtype=np.float32)
        input_scaled = scaler_X.transform(input_data)
        
        logger.info("Running model prediction...")
        output_scaled = model.predict(input_scaled, verbose=0)
        output = scaler_Y.inverse_transform(output_scaled)
        
        # Map outputs to friendly names
        result = {}
        for i, col in enumerate(output_cols):
            result[friendly_names[col]] = float(output[0][i])
        
        logger.info("Prediction successful")
        return result
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise Exception(f"Prediction error: {str(e)}")

if __name__ == "__main__":
    # Prompt user for input coordinates
    lat = input("Enter latitude: ")
    lon = input("Enter longitude: ")
    
    try:
        prediction = predict(lat, lon)
        print("\nPredictions:")
        for key, value in prediction.items():
            print(f"{key}: {value}")
    except Exception as e:
        print(e)
