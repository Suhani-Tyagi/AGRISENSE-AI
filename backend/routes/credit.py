from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import User, CreditScore, Field, Transaction, Diagnosis, SensorReading
from ..auth import get_current_user
from ..credit_engine import calculate_farm_score, update_db_credit_score
import datetime

router = APIRouter(prefix="/credit", tags=["credit"])

def get_loan_offers(score: int) -> List[dict]:
    if score >= 80:
        return [
            {
                "id": "loan_platinum_crop",
                "name": "Kisan Platinum Crop Loan",
                "name_hi": "किसान प्लेटिनम फसल ऋण",
                "amount": 75000.0,
                "interest_rate": "8.5% p.a.",
                "duration": "12 months",
                "duration_hi": "12 महीने",
                "provider": "NABARD Rural Bank",
                "purpose": "Capital investments, tractor lease, high-yield seeds",
                "purpose_hi": "पूंजीगत निवेश, ट्रैक्टर पट्टा, उच्च उपज वाले बीज",
                "status": "Pre-Approved"
            },
            {
                "id": "loan_platinum_solar",
                "name": "Solar Pump Subsidized Credit",
                "name_hi": "सौर पंप रियायती क्रेडिट",
                "amount": 120000.0,
                "interest_rate": "6.0% p.a.",
                "duration": "24 months",
                "duration_hi": "24 महीने",
                "provider": "AgriDev Finance",
                "purpose": "Solar micro-irrigation systems setup",
                "purpose_hi": "सौर सूक्ष्म सिंचाई प्रणाली सेटअप",
                "status": "Pre-Approved"
            }
        ]
    elif score >= 60:
        return [
            {
                "id": "loan_gold_crop",
                "name": "Kisan Gold Crop Loan",
                "name_hi": "किसान गोल्ड फसल ऋण",
                "amount": 40000.0,
                "interest_rate": "10.0% p.a.",
                "duration": "6 months",
                "duration_hi": "6 महीने",
                "provider": "NABARD Rural Bank",
                "purpose": "Fertilizers, labor wages, pesticide inputs",
                "purpose_hi": "उर्वरक, श्रम मजदूरी, कीटनाशक इनपुट",
                "status": "Pre-Approved"
            },
            {
                "id": "loan_gold_drip",
                "name": "Drip Irrigation Credit Line",
                "name_hi": "ड्रिप सिंचाई क्रेडिट लाइन",
                "amount": 50000.0,
                "interest_rate": "11.5% p.a.",
                "duration": "12 months",
                "duration_hi": "12 महीने",
                "provider": "AgriDev Finance",
                "purpose": "Purchase of micro-irrigation drip pipeline kits",
                "purpose_hi": "सूक्ष्म सिंचाई ड्रिप पाइपलाइन किट की खरीद",
                "status": "Approved"
            }
        ]
    elif score >= 40:
        return [
            {
                "id": "loan_silver_seed",
                "name": "Kisan Silver Seed Voucher",
                "name_hi": "किसान सिल्वर बीज वाउचर",
                "amount": 15000.0,
                "interest_rate": "12.5% p.a.",
                "duration": "3 months",
                "duration_hi": "3 महीने",
                "provider": "Janata Co-Op Bank",
                "purpose": "Seasonal hybrid seed procurement",
                "purpose_hi": "मौसमी संकर बीज खरीद",
                "status": "Approved"
            }
        ]
    else:
        return [
            {
                "id": "loan_bronze_stabilization",
                "name": "Soil Improvement Credit Voucher",
                "name_hi": "मिट्टी सुधार क्रेडिट वाउचर",
                "amount": 5000.0,
                "interest_rate": "14.0% p.a.",
                "duration": "2 months",
                "duration_hi": "2 महीने",
                "provider": "Janata Co-Op Bank",
                "purpose": "Purchase of soil gypsum, compost, and bio-nutrients",
                "purpose_hi": "मिट्टी जिप्सम, खाद और जैव पोषक तत्वों की खरीद",
                "status": "Requires Co-Signer"
            }
        ]

@router.get("/score")
def get_user_score(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "farmer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only farmers have alt-data FarmScore metrics"
        )
        
    # Recalculate score dynamically to ensure it is accurate
    db_score = update_db_credit_score(db, current_user.id)
    score_details = calculate_farm_score(db, current_user.id)
    
    # 1. Calculate active telemetry logging streak
    fields = db.query(Field).filter(Field.user_id == current_user.id).all()
    field_ids = [f.id for f in fields]
    
    streak = 0
    if field_ids:
        readings = db.query(SensorReading).filter(SensorReading.field_id.in_(field_ids)).order_by(SensorReading.timestamp.desc()).all()
        readings_days = sorted(list(set(r.timestamp.date() for r in readings)), reverse=True)
        
        if readings_days:
            today = datetime.date.today()
            yesterday = today - datetime.timedelta(days=1)
            
            if readings_days[0] in [today, yesterday]:
                streak = 1
                current_date = readings_days[0]
                for day in readings_days[1:]:
                    if day == current_date - datetime.timedelta(days=1):
                        streak += 1
                        current_date = day
                    elif day == current_date:
                        continue
                    else:
                        break

    # 2. Resolve badge rewards
    badges = []
    if len(fields) >= 1:
        badges.append({
            "id": "badge_pioneer",
            "name": "Bhoomi Putra (Pioneer)",
            "name_hi": "भूमि पुत्र",
            "icon": "🌱",
            "desc": "Registered 1 or more farmlands with active telemetry.",
            "desc_hi": "सक्रिय टेलीमेट्री के साथ 1 या अधिक कृषि भूमि पंजीकृत की।"
        })
        
    diagnoses = db.query(Diagnosis).filter(Diagnosis.user_id == current_user.id).all()
    if len(diagnoses) >= 2:
        badges.append({
            "id": "badge_sprout",
            "name": "Dr. Sprout (Pest Doctor)",
            "name_hi": "पौध चिकित्सक",
            "icon": "🩺",
            "desc": "Conducted 2 or more Crop Doctor leaf scans.",
            "desc_hi": "2 या अधिक फसल चिकित्सक पत्ती स्कैन का आयोजन किया।"
        })
        
    transactions = db.query(Transaction).filter(Transaction.seller_id == current_user.id).all()
    if len(transactions) >= 1:
        badges.append({
            "id": "badge_trade",
            "name": "Trade Guru (Market Leader)",
            "name_hi": "व्यापार गुरु",
            "icon": "🏆",
            "desc": "Successfully completed a crop sale in fair marketplace.",
            "desc_hi": "उचित बाजार में सफलतापूर्वक एक फसल की बिक्री पूरी की।"
        })
        
    if db_score.score >= 75:
        badges.append({
            "id": "badge_credit",
            "name": "Credit Champion (High Score)",
            "name_hi": "ऋण विजेता",
            "icon": "⭐",
            "desc": "Earned a premium FarmScore rating above 75.",
            "desc_hi": "75 से ऊपर एक प्रीमियम फार्मस्कोर रेटिंग अर्जित की।"
        })

    # Add loan offers
    offers = get_loan_offers(db_score.score)
    
    return {
        "userId": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "score": db_score.score,
        "breakdown": score_details["breakdown"],
        "factors": {
            "completeness": db_score.completeness_factor,
            "diagnosis": db_score.diagnosis_factor,
            "marketplace": db_score.market_factor,
            "repayment": db_score.repayment_factor
        },
        "tips": score_details["tips"],
        "loan_offers": offers,
        "streak_days": streak,
        "badges": badges
    }

@router.get("/farmers")
def search_farmers_credit(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "finance_officer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized micro-finance officers only"
        )
        
    farmers = db.query(User).filter(User.role == "farmer").all()
    results = []
    
    for f in farmers:
        # Check if score exists
        db_score = db.query(CreditScore).filter(CreditScore.user_id == f.id).first()
        if not db_score:
            db_score = update_db_credit_score(db, f.id)
            
        fields = db.query(Field).filter(Field.user_id == f.id).all()
        transactions = db.query(Transaction).filter(Transaction.seller_id == f.id).all()
        
        # Risk assessment rating
        risk_rating = "Low" if db_score.score >= 75 else "Medium" if db_score.score >= 50 else "High"
        
        results.append({
            "id": f.id,
            "name": f.name,
            "phone": f.phone,
            "email": f.email,
            "score": db_score.score,
            "risk_rating": risk_rating,
            "fields_count": len(fields),
            "land_acres": sum(fl.size_acres for fl in fields),
            "transactions_count": len(transactions),
            "completed_sales_value": sum(tx.final_price * tx.quantity_kg for tx in transactions),
            "tips": calculate_farm_score(db, f.id)["tips"]
        })
        
    return results

@router.get("/analytics")
def get_portfolio_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "finance_officer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized micro-finance officers only"
        )
        
    # 1. Regional average FarmScores
    farmers = db.query(User).filter(User.role == "farmer").all()
    regions_scores = {
        "North Zone (Punjab/Haryana)": [],
        "West Zone (Rajasthan)": [],
        "Central Zone (Madhya Pradesh)": [],
        "South Zone": []
    }
    
    for f in farmers:
        db_score = db.query(CreditScore).filter(CreditScore.user_id == f.id).first()
        score_val = db_score.score if db_score else 50
        
        # Check first field of farmer to locate region
        first_field = db.query(Field).filter(Field.user_id == f.id).first()
        if first_field:
            lat, lng = first_field.latitude, first_field.longitude
            if 28.0 <= lat <= 32.0 and 74.0 <= lng <= 78.0:
                regions_scores["North Zone (Punjab/Haryana)"].append(score_val)
            elif 25.0 <= lat <= 28.0 and 72.0 <= lng <= 78.0:
                regions_scores["West Zone (Rajasthan)"].append(score_val)
            elif 20.0 <= lat <= 25.0 and 75.0 <= lng <= 82.0:
                regions_scores["Central Zone (Madhya Pradesh)"].append(score_val)
            else:
                regions_scores["South Zone"].append(score_val)
        else:
            regions_scores["West Zone (Rajasthan)"].append(score_val) # Default fallback

    regional_averages = []
    for r, scores in regions_scores.items():
        avg = sum(scores) / len(scores) if scores else 60.0
        regional_averages.append({
            "region": r,
            "average_score": round(avg, 1),
            "farmer_count": len(scores)
        })

    # 2. Most common crop diseases this season
    diagnoses = db.query(Diagnosis).all()
    disease_counts = {}
    for d in diagnoses:
        name = d.disease_name.split("(")[0].strip() # Clean name
        disease_counts[name] = disease_counts.get(name, 0) + 1
        
    common_diseases = []
    for name, cnt in sorted(disease_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        common_diseases.append({
            "disease": name,
            "cases": cnt
        })
    # If empty, add mock defaults
    if not common_diseases:
        common_diseases = [
            {"disease": "Tomato Late Blight", "cases": 8},
            {"disease": "Wheat Leaf Rust", "cases": 5},
            {"disease": "Rice Blast", "cases": 4}
        ]

    # 3. Marketplace transaction volume (by crop)
    transactions = db.query(Transaction).all()
    crop_volumes = {}
    for t in transactions:
        crop = t.listing.crop if (t.listing and t.listing.crop) else "Tomato"
        val = t.final_price * t.quantity_kg
        crop_volumes[crop] = crop_volumes.get(crop, 0.0) + val
        
    transaction_by_crop = []
    for crop, vol in crop_volumes.items():
        transaction_by_crop.append({
            "crop": crop,
            "volume_inr": round(vol, 2)
        })
    if not transaction_by_crop:
        transaction_by_crop = [
            {"crop": "Tomato", "volume_inr": 25000.0},
            {"crop": "Wheat", "volume_inr": 18000.0},
            {"crop": "Rice", "volume_inr": 35000.0}
        ]

    return {
        "regional_averages": regional_averages,
        "common_diseases": common_diseases,
        "transaction_by_crop": transaction_by_crop
    }
