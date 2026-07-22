from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import User, MarketListing, Offer, Transaction
from ..schemas import MarketListingCreate, MarketListingResponse, OfferCreate, OfferResponse, OfferUpdate
from ..auth import get_current_user
from ..credit_engine import update_db_credit_score
import random

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

# Mock regional mandi database with historical trends
MOCK_MANDI_PRICES = {
    "Wheat": {
        "A": {"min": 24.0, "max": 27.0, "trend": "+2.4% (Strong Export Demand)", "avg_history": [23.5, 23.9, 24.2, 24.8, 25.5]},
        "B": {"min": 21.0, "max": 23.5, "trend": "+1.1% (Steady)", "avg_history": [21.0, 21.3, 21.5, 22.0, 22.2]},
        "C": {"min": 17.5, "max": 20.0, "trend": "-0.5% (Sufficient Stocks)", "avg_history": [19.0, 18.8, 18.9, 18.5, 18.4]}
    },
    "Rice": {
        "A": {"min": 30.0, "max": 35.0, "trend": "+3.1% (Festival Season Demand)", "avg_history": [29.0, 30.2, 31.0, 31.8, 32.5]},
        "B": {"min": 25.5, "max": 29.0, "trend": "0.0% (Stable)", "avg_history": [27.0, 27.2, 27.0, 27.1, 27.2]},
        "C": {"min": 21.0, "max": 24.5, "trend": "-1.5% (New Arrivals)", "avg_history": [23.0, 22.8, 22.5, 22.1, 22.0]}
    },
    "Tomato": {
        "A": {"min": 32.0, "max": 38.0, "trend": "-8.5% (Harvest Glut - Oversupply)", "avg_history": [45.0, 42.0, 39.0, 37.0, 34.0]},
        "B": {"min": 24.0, "max": 30.0, "trend": "-12.0% (Price Crash)", "avg_history": [35.0, 32.0, 29.0, 27.0, 26.0]},
        "C": {"min": 14.0, "max": 20.0, "trend": "-15.0% (Very Weak Demand)", "avg_history": [22.0, 20.0, 18.0, 16.0, 15.0]}
    },
    "Maize": {
        "A": {"min": 20.0, "max": 23.0, "trend": "+1.5% (Poultry Feed Requirements)", "avg_history": [19.8, 20.1, 20.5, 21.0, 21.2]},
        "B": {"min": 17.0, "max": 19.5, "trend": "+0.8% (Stable)", "avg_history": [17.5, 17.8, 18.0, 18.1, 18.3]},
        "C": {"min": 14.0, "max": 16.5, "trend": "0.0% (Muted)", "avg_history": [15.0, 15.1, 15.0, 15.0, 15.0]}
    },
    "Cotton": {
        "A": {"min": 75.0, "max": 84.0, "trend": "+5.2% (Textile Mill Inquiries)", "avg_history": [72.0, 74.5, 76.0, 78.5, 80.0]},
        "B": {"min": 64.0, "max": 72.0, "trend": "+4.0% (Strong Market)", "avg_history": [62.0, 63.8, 65.0, 67.0, 68.5]},
        "C": {"min": 54.0, "max": 62.0, "trend": "+2.5% (Moderate)", "avg_history": [52.0, 53.5, 55.0, 56.5, 57.8]}
    }
}

@router.get("/price-recommendation")
def get_price_recommendation(crop: str, grade: str):
    crop_fixed = crop.capitalize()
    grade_fixed = grade.upper()
    
    if crop_fixed not in MOCK_MANDI_PRICES or grade_fixed not in ["A", "B", "C"]:
        # Fallback dynamic generator
        min_p = 20.0
        max_p = 30.0
        trend = "Stable"
        history = [22.0, 23.0, 24.0, 25.0, 24.5]
    else:
        mandi_data = MOCK_MANDI_PRICES[crop_fixed][grade_fixed]
        min_p = mandi_data["min"]
        max_p = mandi_data["max"]
        trend = mandi_data["trend"]
        history = mandi_data["avg_history"]
        
    avg_price = round((min_p + max_p) / 2, 2)
    return {
        "crop": crop_fixed,
        "quality_grade": grade_fixed,
        "recommended_min_price": min_p,
        "recommended_max_price": max_p,
        "average_mandi_price": avg_price,
        "market_trend": trend,
        "price_history_5weeks": history,
        "explain_plain": f"Based on recent regional market sales, high-quality {crop_fixed} (Grade {grade_fixed}) is trading between {min_p} and {max_p} INR per kg. The price trend is {trend}. We suggest pricing around {avg_price} INR/kg to sell quickly."
    }

@router.get("/", response_model=List[MarketListingResponse])
def get_listings(
    crop: Optional[str] = Query(None),
    grade: Optional[str] = Query(None),
    status_filter: Optional[str] = Query("active"),
    db: Session = Depends(get_db)
):
    query = db.query(MarketListing)
    
    if status_filter:
        query = query.filter(MarketListing.status == status_filter)
    if crop:
        query = query.filter(MarketListing.crop.ilike(f"%{crop}%"))
    if grade:
        query = query.filter(MarketListing.quality_grade == grade.upper())
        
    listings = query.order_by(MarketListing.created_at.desc()).all()
    
    # Map relation entities into helper properties
    for l in listings:
        seller = db.query(User).filter(User.id == l.user_id).first()
        l.seller_name = seller.name if seller else "Unknown Farmer"
        l.seller_phone = seller.phone if seller else ""
        
        # Populate offers
        offers = db.query(Offer).filter(Offer.listing_id == l.id).all()
        for o in offers:
            buyer = db.query(User).filter(User.id == o.buyer_id).first()
            o.buyer_name = buyer.name if buyer else "Traders"
        l.offers = offers
        
    return listings

@router.post("/", response_model=MarketListingResponse)
def create_listing(
    listing_data: MarketListingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "farmer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only farmers can list produce for sale"
        )
        
    new_listing = MarketListing(
        user_id=current_user.id,
        crop=listing_data.crop,
        quantity_kg=listing_data.quantity_kg,
        quality_grade=listing_data.quality_grade.upper(),
        location=listing_data.location,
        price_per_kg=listing_data.price_per_kg,
        status="active"
    )
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)
    
    # Update credit score since farmer posted a listing
    update_db_credit_score(db, current_user.id)
    
    new_listing.seller_name = current_user.name
    new_listing.seller_phone = current_user.phone
    new_listing.offers = []
    
    return new_listing

@router.post("/{listing_id}/offers", response_model=OfferResponse)
def create_offer(
    listing_id: int,
    offer_data: OfferCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "buyer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only registered buyers can place offers"
        )
        
    listing = db.query(MarketListing).filter(MarketListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Market listing not found")
        
    if listing.status != "active":
        raise HTTPException(status_code=400, detail="This listing is no longer active")
        
    new_offer = Offer(
        listing_id=listing_id,
        buyer_id=current_user.id,
        offered_price_per_kg=offer_data.offered_price_per_kg,
        quantity_kg=offer_data.quantity_kg,
        status="pending"
    )
    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)
    
    new_offer.buyer_name = current_user.name
    return new_offer

@router.put("/offers/{offer_id}")
def update_offer_status(
    offer_id: int,
    status_update: OfferUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    listing = db.query(MarketListing).filter(MarketListing.id == offer.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing associated with this offer not found")
        
    # Check authorization (only the seller of the listing can accept/reject bids)
    if listing.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the listing creator can accept or reject offers"
        )
        
    if offer.status != "pending":
        raise HTTPException(status_code=400, detail=f"Offer is already marked as {offer.status}")
        
    new_status = status_update.status.lower()
    if new_status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status update. Must be accepted or rejected")
        
    offer.status = new_status
    db.commit()
    
    if new_status == "accepted":
        # Mark listing as sold
        listing.status = "sold"
        
        # Reject all other pending offers on this listing
        db.query(Offer).filter(
            Offer.listing_id == listing.id,
            Offer.id != offer.id,
            Offer.status == "pending"
        ).update({"status": "rejected"})
        
        # Simulate credit repayment flow: Create a transaction log
        # For the demo, we simulate credit repayment: 80% chance it gets successfully repaid in micro-lending simulation, 20% defaulted
        simulated_repayment = "repaid" if random.random() < 0.8 else "defaulted"
        
        new_transaction = Transaction(
            listing_id=listing.id,
            buyer_id=offer.buyer_id,
            seller_id=listing.user_id,
            final_price=offer.offered_price_per_kg,
            quantity_kg=offer.quantity_kg,
            repayment_simulated_status=simulated_repayment
        )
        db.add(new_transaction)
        db.commit()
        
        # Recalculate seller's FarmScore since they completed a transaction!
        update_db_credit_score(db, listing.user_id)
        
    return {"message": f"Offer has been {new_status} successfully", "status": new_status}
