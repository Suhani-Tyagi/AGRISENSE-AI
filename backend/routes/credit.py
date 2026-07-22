from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import User, CreditScore, Field, Transaction
from ..auth import get_current_user
from ..credit_engine import calculate_farm_score, update_db_credit_score

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
        "loan_offers": offers
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
