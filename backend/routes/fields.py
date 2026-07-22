from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import User, Field, SensorReading
from ..schemas import FieldCreate, FieldResponse, SensorReadingResponse
from ..auth import get_current_user
from ..credit_engine import update_db_credit_score
from ..simulator import get_crop_baseline
import datetime

router = APIRouter(prefix="/fields", tags=["fields"])

@router.get("/", response_model=List[FieldResponse])
def get_fields(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "farmer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only farmers can access field records"
        )
    fields = db.query(Field).filter(Field.user_id == current_user.id).all()
    # Sort sensor readings for each field by timestamp ascending for charting
    for field in fields:
        field.sensor_readings = sorted(field.sensor_readings, key=lambda x: x.timestamp)
    return fields

@router.post("/", response_model=FieldResponse)
def create_field(field_data: FieldCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "farmer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only farmers can create fields"
        )
    
    # Create field
    new_field = Field(
        user_id=current_user.id,
        name=field_data.name,
        crop_type=field_data.crop_type,
        size_acres=field_data.size_acres,
        latitude=field_data.latitude,
        longitude=field_data.longitude,
        last_irrigation=datetime.datetime.utcnow() - datetime.timedelta(days=1)
    )
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    
    # Create initial sensor reading based on crop baseline
    baseline = get_crop_baseline(new_field.crop_type)
    initial_reading = SensorReading(
        field_id=new_field.id,
        soil_moisture=baseline["moisture"],
        nitrogen=baseline["N"],
        phosphorus=baseline["P"],
        potassium=baseline["K"],
        ph=baseline["ph"],
        timestamp=datetime.datetime.utcnow()
    )
    db.add(initial_reading)
    db.commit()
    db.refresh(new_field)
    
    # Recalculate credit score for farmer
    update_db_credit_score(db, current_user.id)
    
    new_field.sensor_readings = [initial_reading]
    return new_field

@router.get("/{field_id}", response_model=FieldResponse)
def get_field(field_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    # Check authorization (MFO and owner farmer can read, or buyers can't)
    if current_user.role == "farmer" and field.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this field")
        
    field.sensor_readings = sorted(field.sensor_readings, key=lambda x: x.timestamp)
    return field

@router.post("/{field_id}/irrigate")
def irrigate_field(field_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field or field.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Field not found or not owned by current user")
        
    field.last_irrigation = datetime.datetime.utcnow()
    
    # Immediately simulate a new sensor reading reflecting irrigation spike
    last_reading = db.query(SensorReading).filter(
        SensorReading.field_id == field.id
    ).order_by(SensorReading.timestamp.desc()).first()
    
    nitrogen = last_reading.nitrogen if last_reading else 80.0
    phosphorus = last_reading.phosphorus if last_reading else 40.0
    potassium = last_reading.potassium if last_reading else 60.0
    ph = last_reading.ph if last_reading else 6.5
    
    irrigated_reading = SensorReading(
        field_id=field.id,
        soil_moisture=90.0,  # Irrigation spikes moisture
        nitrogen=nitrogen,
        phosphorus=phosphorus,
        potassium=potassium,
        ph=ph,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(irrigated_reading)
    db.commit()
    
    return {"message": "Field irrigation recorded successfully", "moisture": 90.0}

@router.post("/{field_id}/connect-sensor")
def connect_sensor(field_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field or field.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Field not found or not owned by current user")
        
    # In a real environment, this would save broker settings or trigger an MQTT client.
    # For MVP, we return a success response that switches client-side UI states.
    return {
        "status": "connected",
        "message": f"Successfully connected field '{field.name}' to AgriSense IoT Broker (mqtt://iot.agrisense.net:1883). Real-time telemetry is now active.",
        "broker_client_id": f"agrisense_node_{field_id}",
        "channel": f"agrisense/fields/{field_id}/telemetry"
    }

@router.get("/{field_id}/recommendations")
def get_recommendations(field_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    last_reading = db.query(SensorReading).filter(
        SensorReading.field_id == field.id
    ).order_by(SensorReading.timestamp.desc()).first()
    
    if not last_reading:
        raise HTTPException(status_code=400, detail="No sensor readings available for this field")
        
    # Baseline for crop
    baseline = get_crop_baseline(field.crop_type)
    
    # 1. Irrigation recommendation
    moisture = last_reading.soil_moisture
    needs_irrigation = moisture < (baseline["moisture"] - 10)
    
    water_amount_liters = 0
    irrigation_advice = ""
    if needs_irrigation:
        # Simple formula: 1 acre needs roughly 800 liters to increase moisture by 1%
        moisture_gap = baseline["moisture"] - moisture
        water_amount_liters = int(field.size_acres * moisture_gap * 800)
        irrigation_advice = f"Soil moisture is critical at {moisture}%. Irrigate immediately with approximately {water_amount_liters} liters."
    else:
        irrigation_advice = f"Soil moisture is healthy at {moisture}%. No irrigation required today."
        
    # 2. Fertilizer NPK recommendation
    fertilizers = []
    if last_reading.nitrogen < (baseline["N"] - 15):
        def_amount = int((baseline["N"] - last_reading.nitrogen) * 1.5 * field.size_acres)
        fertilizers.append({
            "nutrient": "Nitrogen (N)",
            "status": "Deficient",
            "current_value": last_reading.nitrogen,
            "target_value": baseline["N"],
            "advice": f"Apply {def_amount} kg of Urea or nitrogen-rich compost to restore leaf vitality."
        })
    else:
        fertilizers.append({
            "nutrient": "Nitrogen (N)",
            "status": "Optimal",
            "current_value": last_reading.nitrogen,
            "target_value": baseline["N"],
            "advice": "Nitrogen levels are healthy. No urea addition needed."
        })
        
    if last_reading.phosphorus < (baseline["P"] - 10):
        def_amount = int((baseline["P"] - last_reading.phosphorus) * 2.0 * field.size_acres)
        fertilizers.append({
            "nutrient": "Phosphorus (P)",
            "status": "Deficient",
            "current_value": last_reading.phosphorus,
            "target_value": baseline["P"],
            "advice": f"Apply {def_amount} kg of Diammonium Phosphate (DAP) for root development."
        })
    else:
        fertilizers.append({
            "nutrient": "Phosphorus (P)",
            "status": "Optimal",
            "current_value": last_reading.phosphorus,
            "target_value": baseline["P"],
            "advice": "Phosphorus levels are healthy. No DAP needed."
        })
        
    if last_reading.potassium < (baseline["K"] - 15):
        def_amount = int((baseline["K"] - last_reading.potassium) * 1.2 * field.size_acres)
        fertilizers.append({
            "nutrient": "Potassium (K)",
            "status": "Deficient",
            "current_value": last_reading.potassium,
            "target_value": baseline["K"],
            "advice": f"Apply {def_amount} kg of Muriate of Potash (MOP) to boost disease resistance."
        })
    else:
        fertilizers.append({
            "nutrient": "Potassium (K)",
            "status": "Optimal",
            "current_value": last_reading.potassium,
            "target_value": baseline["K"],
            "advice": "Potassium levels are healthy."
        })
        
    # 3. Soil pH analysis
    ph = last_reading.ph
    ph_advice = ""
    if ph < 5.5:
        ph_advice = f"Soil is highly acidic (pH {ph}). Apply agricultural lime (calcium carbonate) at 500 kg/acre to neutralize acidity."
    elif ph > 7.8:
        ph_advice = f"Soil is alkaline (pH {ph}). Apply gypsum or sulfur compounds at 300 kg/acre to reduce pH."
    else:
        ph_advice = f"Soil pH of {ph} is optimal for {field.crop_type}. No amendments needed."

    return {
        "needs_irrigation": needs_irrigation,
        "water_amount_liters": water_amount_liters,
        "irrigation_advice": irrigation_advice,
        "fertilizer_status": fertilizers,
        "ph_advice": ph_advice,
        "last_reading": {
            "soil_moisture": last_reading.soil_moisture,
            "N": last_reading.nitrogen,
            "P": last_reading.phosphorus,
            "K": last_reading.potassium,
            "ph": last_reading.ph,
            "timestamp": last_reading.timestamp
        }
    }
