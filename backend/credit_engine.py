from sqlalchemy.orm import Session
from .models import User, Field, Diagnosis, MarketListing, Transaction, CreditScore

def calculate_farm_score(db: Session, user_id: int) -> dict:
    # 1. Field completeness factor (Max 20)
    fields = db.query(Field).filter(Field.user_id == user_id).all()
    completeness_pts = min(20, len(fields) * 10)
    
    # 2. Diagnosis / Crop health tracking factor (Max 25)
    diagnoses = db.query(Diagnosis).filter(Diagnosis.user_id == user_id).all()
    diagnosis_pts = min(25, len(diagnoses) * 5)
    
    # 3. Marketplace activity factor (Max 25)
    listings = db.query(MarketListing).filter(MarketListing.user_id == user_id).all()
    has_listings = 5 if len(listings) > 0 else 0
    
    # Count transactions where user is seller
    transactions = db.query(Transaction).filter(Transaction.seller_id == user_id).all()
    transaction_pts = min(15, len(transactions) * 5)
    
    # Offers received or made
    offers_made_or_recv = 5 if len(listings) > 0 else 0 # Simple mock check
    
    market_pts = has_listings + transaction_pts + offers_made_or_recv
    market_pts = min(25, market_pts)
    
    # 4. Repayment factor (Max 30)
    # Simulating credit repayment based on transaction histories
    repayment_pts = 15 # baseline
    repaid_count = 0
    defaulted_count = 0
    ongoing_count = 0
    
    for tx in transactions:
        if tx.repayment_simulated_status == "repaid":
            repayment_pts += 5
            repaid_count += 1
        elif tx.repayment_simulated_status == "defaulted":
            repayment_pts -= 10
            defaulted_count += 1
        elif tx.repayment_simulated_status == "ongoing":
            repayment_pts += 2
            ongoing_count += 1
            
    repayment_pts = max(0, min(30, repayment_pts))
    
    total_score = completeness_pts + diagnosis_pts + market_pts + repayment_pts
    
    # Recommendations based on score gaps
    tips = []
    if len(fields) < 2:
        tips.append("Register all your active farming fields to increase completeness score (+10 pts per field).")
    if len(diagnoses) < 3:
        tips.append("Use AI Crop Doctor regularly to track leaf health. Aim for at least 3 diagnoses per season (+5 pts each).")
    if len(listings) == 0:
        tips.append("List your upcoming harvests on the marketplace to show active market engagement (+5 pts).")
    if len(transactions) < 2:
        tips.append("Complete more sales through the Fair-Price Marketplace to establish a transaction history (+5 pts each).")
    if defaulted_count > 0:
        tips.append("Repay outstanding micro-credits on time to recover defaulted score points.")
    if total_score >= 80:
        tips.append("Excellent! Maintain your activity to qualify for low-interest micro-finance rates.")
        
    return {
        "score": total_score,
        "completeness_factor": completeness_pts,
        "diagnosis_factor": diagnosis_pts,
        "market_factor": market_pts,
        "repayment_factor": repayment_pts,
        "breakdown": {
            "completeness": f"{completeness_pts}/20 (Fields registered: {len(fields)})",
            "diagnosis": f"{diagnosis_pts}/25 (Crop health checks: {len(diagnoses)})",
            "marketplace": f"{market_pts}/25 (Listings/Sales: {len(listings)} listings, {len(transactions)} completed sales)",
            "repayment": f"{repayment_pts}/30 (Repaid: {repaid_count}, Defaulted: {defaulted_count}, Ongoing: {ongoing_count})"
        },
        "tips": tips
    }

def update_db_credit_score(db: Session, user_id: int) -> CreditScore:
    score_data = calculate_farm_score(db, user_id)
    
    db_score = db.query(CreditScore).filter(CreditScore.user_id == user_id).first()
    if not db_score:
        db_score = CreditScore(user_id=user_id)
        db.add(db_score)
        
    db_score.score = score_data["score"]
    db_score.completeness_factor = score_data["completeness_factor"]
    db_score.diagnosis_factor = score_data["diagnosis_factor"]
    db_score.market_factor = score_data["market_factor"]
    db_score.repayment_factor = score_data["repayment_factor"]
    
    db.commit()
    db.refresh(db_score)
    return db_score
