import datetime
import random
from sqlalchemy.orm import Session
from .models import Field, SensorReading

# Baseline parameters for crops
CROP_BASELINES = {
    "Tomato": {"moisture": 65.0, "N": 80.0, "P": 40.0, "K": 60.0, "ph": 6.2},
    "Wheat": {"moisture": 45.0, "N": 90.0, "P": 50.0, "K": 40.0, "ph": 6.8},
    "Rice": {"moisture": 85.0, "N": 100.0, "P": 40.0, "K": 50.0, "ph": 6.0},
    "Maize": {"moisture": 55.0, "N": 120.0, "P": 60.0, "K": 80.0, "ph": 6.5},
    "Cotton": {"moisture": 50.0, "N": 70.0, "P": 30.0, "K": 60.0, "ph": 7.0},
    "Default": {"moisture": 50.0, "N": 80.0, "P": 40.0, "K": 60.0, "ph": 6.5}
}

def get_crop_baseline(crop_type: str) -> dict:
    return CROP_BASELINES.get(crop_type, CROP_BASELINES["Default"])

def generate_next_reading(crop_type: str, last_reading: SensorReading = None, last_irrigation: datetime.datetime = None) -> dict:
    baseline = get_crop_baseline(crop_type)
    
    # Baseline defaults
    moisture = baseline["moisture"]
    N = baseline["N"]
    P = baseline["P"]
    K = baseline["K"]
    ph = baseline["ph"]

    if last_reading:
        # Fluctuations (random walk)
        N = max(10.0, min(200.0, last_reading.nitrogen + random.uniform(-2.0, 2.0)))
        P = max(5.0, min(100.0, last_reading.phosphorus + random.uniform(-1.0, 1.0)))
        K = max(10.0, min(150.0, last_reading.potassium + random.uniform(-2.0, 2.0)))
        ph = max(4.5, min(8.5, last_reading.ph + random.uniform(-0.05, 0.05)))
        
        # Soil moisture decay (soil dries up over time)
        # If irrigated recently, spike moisture
        if last_irrigation:
            hours_since_irrigation = (datetime.datetime.utcnow() - last_irrigation).total_seconds() / 3600.0
            if hours_since_irrigation < 6:
                # Recently irrigated, high moisture
                moisture = max(80.0, min(95.0, 90.0 - hours_since_irrigation * 1.5))
            else:
                # Natural drying
                moisture = max(20.0, last_reading.soil_moisture - random.uniform(0.1, 0.5))
        else:
            moisture = max(20.0, last_reading.soil_moisture - random.uniform(0.1, 0.5))
    else:
        # First reading, add some minor noise
        moisture += random.uniform(-5.0, 5.0)
        N += random.uniform(-10.0, 10.0)
        P += random.uniform(-5.0, 5.0)
        K += random.uniform(-10.0, 10.0)
        ph += random.uniform(-0.2, 0.2)

    return {
        "soil_moisture": round(moisture, 2),
        "nitrogen": round(N, 2),
        "phosphorus": round(P, 2),
        "potassium": round(K, 2),
        "ph": round(ph, 2)
    }

def simulate_step(db: Session):
    """
    Run a simulation step for all fields, appending a new SensorReading.
    Called on a background scheduler or periodically.
    """
    fields = db.query(Field).all()
    for field in fields:
        # Get latest reading
        last_reading = db.query(SensorReading).filter(
            SensorReading.field_id == field.id
        ).order_by(SensorReading.timestamp.desc()).first()
        
        # Generate next reading
        data = generate_next_reading(field.crop_type, last_reading, field.last_irrigation)
        
        # Insert
        new_reading = SensorReading(
            field_id=field.id,
            soil_moisture=data["soil_moisture"],
            nitrogen=data["nitrogen"],
            phosphorus=data["phosphorus"],
            potassium=data["potassium"],
            ph=data["ph"],
            timestamp=datetime.datetime.utcnow()
        )
        db.add(new_reading)
    db.commit()

def generate_history_for_field(db: Session, field: Field, days: int = 90):
    """
    Generates historical sensor reading data for seed script.
    """
    start_time = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    
    current_reading_data = None
    readings = []
    
    # We will simulate twice-daily readings (every 12 hours)
    total_steps = days * 2
    time_step = datetime.timedelta(hours=12)
    
    # Track simulated irrigation dates
    simulated_irrigation = start_time
    
    for step in range(total_steps):
        step_time = start_time + (step * time_step)
        
        # Periodically simulate irrigation every 5-8 days
        if step > 0 and step % random.randint(10, 16) == 0:
            simulated_irrigation = step_time
            
        # Mock last reading object
        mock_last = None
        if current_reading_data:
            class MockReading:
                def __init__(self, d):
                    self.soil_moisture = d["soil_moisture"]
                    self.nitrogen = d["nitrogen"]
                    self.phosphorus = d["phosphorus"]
                    self.potassium = d["potassium"]
                    self.ph = d["ph"]
            mock_last = MockReading(current_reading_data)
            
        # Generate next data
        # Calculate time difference for decay
        hours_since_irrigation = (step_time - simulated_irrigation).total_seconds() / 3600.0
        
        baseline = get_crop_baseline(field.crop_type)
        if mock_last:
            n_val = max(10.0, min(200.0, mock_last.nitrogen + random.uniform(-3.0, 3.0)))
            p_val = max(5.0, min(100.0, mock_last.phosphorus + random.uniform(-1.5, 1.5)))
            k_val = max(10.0, min(150.0, mock_last.potassium + random.uniform(-3.0, 3.0)))
            ph_val = max(4.5, min(8.5, mock_last.ph + random.uniform(-0.08, 0.08)))
            
            if hours_since_irrigation < 12:
                moisture_val = max(80.0, min(95.0, 90.0 - hours_since_irrigation * 1.5))
            else:
                moisture_val = max(20.0, mock_last.soil_moisture - random.uniform(2.0, 6.0))
        else:
            moisture_val = baseline["moisture"] + random.uniform(-5.0, 5.0)
            n_val = baseline["N"] + random.uniform(-10.0, 10.0)
            p_val = baseline["P"] + random.uniform(-5.0, 5.0)
            k_val = baseline["K"] + random.uniform(-10.0, 10.0)
            ph_val = baseline["ph"] + random.uniform(-0.2, 0.2)
            
        current_reading_data = {
            "soil_moisture": round(moisture_val, 2),
            "nitrogen": round(n_val, 2),
            "phosphorus": round(p_val, 2),
            "potassium": round(k_val, 2),
            "ph": round(ph_val, 2)
        }
        
        reading = SensorReading(
            field_id=field.id,
            soil_moisture=current_reading_data["soil_moisture"],
            nitrogen=current_reading_data["nitrogen"],
            phosphorus=current_reading_data["phosphorus"],
            potassium=current_reading_data["potassium"],
            ph=current_reading_data["ph"],
            timestamp=step_time
        )
        db.add(reading)
        
    field.last_irrigation = simulated_irrigation
    db.commit()
