import datetime
import random
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend.models import User, Field, SensorReading, Diagnosis, MarketListing, Offer, Transaction, CreditScore
from backend.auth import hash_password
from backend.simulator import generate_history_for_field
from backend.credit_engine import update_db_credit_score

def seed_db():
    print("Initializing database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing data to avoid duplicates
    print("Clearing old data...")
    db.query(CreditScore).delete()
    db.query(Transaction).delete()
    db.query(Offer).delete()
    db.query(MarketListing).delete()
    db.query(Diagnosis).delete()
    db.query(SensorReading).delete()
    db.query(Field).delete()
    db.query(User).delete()
    db.commit()

    print("Creating users...")
    hashed_pwd = hash_password("password123")
    
    # 15 Farmers
    farmers_data = [
        {"name": "Ramesh Kumar", "phone": "9876543210", "email": "ramesh@agrisense.com"},
        {"name": "Suresh Singh", "phone": "9876543211", "email": "suresh@agrisense.com"},
        {"name": "Rajesh Sharma", "phone": "9876543212", "email": "rajesh@agrisense.com"},
        {"name": "Anita Devi", "phone": "9876543213", "email": "anita@agrisense.com"},
        {"name": "Sunita Bai", "phone": "9876543214", "email": "sunita@agrisense.com"},
        {"name": "Ram Prasad", "phone": "9876543215", "email": "ramprasad@agrisense.com"},
        {"name": "Vijay Yadav", "phone": "9876543216", "email": "vijay@agrisense.com"},
        {"name": "Hari Om", "phone": "9876543217", "email": "hariom@agrisense.com"},
        {"name": "Devendra Nath", "phone": "9876543218", "email": "devendra@agrisense.com"},
        {"name": "Manoj Patil", "phone": "9876543219", "email": "manoj@agrisense.com"},
        {"name": "Savita Shinde", "phone": "9876543220", "email": "savita@agrisense.com"},
        {"name": "Baldev Singh", "phone": "9876543221", "email": "baldev@agrisense.com"},
        {"name": "Gurpreet Singh", "phone": "9876543222", "email": "gurpreet@agrisense.com"},
        {"name": "Arjun Mahto", "phone": "9876543223", "email": "arjun@agrisense.com"},
        {"name": "Mohan Lal", "phone": "9876543224", "email": "mohanlal@agrisense.com"},
    ]
    
    farmers = []
    for f in farmers_data:
        user = User(
            name=f["name"],
            phone=f["phone"],
            email=f["email"],
            role="farmer",
            password_hash=hashed_pwd
        )
        db.add(user)
        farmers.append(user)
        
    # 2 Buyers
    buyers_data = [
        {"name": "AgriCorp Traders", "phone": "8876543210", "email": "traders@agricorp.com"},
        {"name": "Organic India Co", "phone": "8876543211", "email": "procure@organicindia.com"}
    ]
    buyers = []
    for b in buyers_data:
        user = User(
            name=b["name"],
            phone=b["phone"],
            email=b["email"],
            role="buyer",
            password_hash=hashed_pwd
        )
        db.add(user)
        buyers.append(user)
        
    # 2 Finance Officers
    officers_data = [
        {"name": "Vikram Mehta", "phone": "7876543210", "email": "vikram@microcredit.bank"},
        {"name": "Priya Shah", "phone": "7876543211", "email": "priya@microcredit.bank"}
    ]
    for o in officers_data:
        user = User(
            name=o["name"],
            phone=o["phone"],
            email=o["email"],
            role="finance_officer",
            password_hash=hashed_pwd
        )
        db.add(user)
        
    db.commit()
    
    # Reload from db
    farmers = db.query(User).filter(User.role == "farmer").all()
    buyers = db.query(User).filter(User.role == "buyer").all()
    
    print("Creating fields & simulating 90 days sensor history...")
    crops = ["Tomato", "Wheat", "Rice", "Maize", "Cotton"]
    locations = [
        {"lat": 26.9124, "lng": 75.7873, "name": "Jaipur Outskirts"},
        {"lat": 30.9010, "lng": 75.8573, "name": "Ludhiana Farm"},
        {"lat": 31.6340, "lng": 74.8723, "name": "Amritsar Belt"},
        {"lat": 21.1458, "lng": 79.0882, "name": "Nagpur Black Soil"},
        {"lat": 16.7050, "lng": 74.2433, "name": "Kolhapur Field"},
        {"lat": 25.3176, "lng": 82.9739, "name": "Varanasi Plains"},
        {"lat": 26.1209, "lng": 85.3647, "name": "Muzaffarpur Orchard"},
        {"lat": 23.2599, "lng": 77.4126, "name": "Bhopal Sector 4"},
        {"lat": 22.7196, "lng": 75.8577, "name": "Indore AgriZone"},
        {"lat": 26.8467, "lng": 80.9462, "name": "Lucknow East"}
    ]

    fields = []
    for i, farmer in enumerate(farmers):
        # Farmers 0-9 get 2 fields, others get 1 field
        num_fields = 2 if i < 10 else 1
        for f_idx in range(num_fields):
            loc = locations[(i + f_idx) % len(locations)]
            crop = crops[(i * 3 + f_idx * 7) % len(crops)]
            
            # Offset slightly to prevent exact overlaps
            lat_offset = loc["lat"] + random.uniform(-0.02, 0.02)
            lng_offset = loc["lng"] + random.uniform(-0.02, 0.02)
            
            field = Field(
                user_id=farmer.id,
                name=f"{crop} Patch {f_idx + 1}",
                crop_type=crop,
                size_acres=round(random.uniform(1.5, 6.0), 1),
                latitude=round(lat_offset, 4),
                longitude=round(lng_offset, 4),
                last_irrigation=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(1, 4))
            )
            db.add(field)
            db.commit() # commit to get ID
            
            # Generate 90 days history for this field
            generate_history_for_field(db, field, days=90)
            fields.append(field)

    print("Creating sample diagnoses...")
    # Add a diagnosis for Ramesh Kumar (farmer[0])
    ramesh_field = db.query(Field).filter(Field.user_id == farmers[0].id).first()
    diag1 = Diagnosis(
        user_id=farmers[0].id,
        field_id=ramesh_field.id,
        crop_type=ramesh_field.crop_type,
        disease_name="Tomato Late Blight",
        severity="high",
        confidence=0.89,
        treatments_organic="Apply copper-based fungicides or baking soda spray. Remove infected leaves immediately and destroy them.",
        treatments_chemical="Apply Mancozeb or Chlorothalonil fungicide spray according to package instructions.",
        cost_estimate=2500.0,
        urgency_days=3,
        notes="High humidity conditions in the field are causing fast spread. Ensure proper leaf aeration.",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=10)
    )
    db.add(diag1)

    # Add a diagnosis for Anita Devi (farmer[3])
    anita_field = db.query(Field).filter(Field.user_id == farmers[3].id).first()
    diag2 = Diagnosis(
        user_id=farmers[3].id,
        field_id=anita_field.id,
        crop_type=anita_field.crop_type,
        disease_name="Wheat Leaf Rust",
        severity="medium",
        confidence=0.78,
        treatments_organic="Spray neem oil or sulfur solutions. Sow rust-resistant wheat varieties in the next cycle.",
        treatments_chemical="Apply Triazole-based fungicide (like Propiconazole) spray.",
        cost_estimate=1200.0,
        urgency_days=7,
        notes="First spotted on lower leaves. Spread is moderate due to dry winds.",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=5)
    )
    db.add(diag2)

    # Add a diagnosis for Rajesh Sharma (farmer[2])
    rajesh_field = db.query(Field).filter(Field.user_id == farmers[2].id).first()
    diag3 = Diagnosis(
        user_id=farmers[2].id,
        field_id=rajesh_field.id,
        crop_type=rajesh_field.crop_type,
        disease_name="Rice Blast",
        severity="high",
        confidence=0.92,
        treatments_organic="Avoid excessive nitrogen fertilization. Apply bio-control agents like Pseudomonas fluorescens.",
        treatments_chemical="Spray Tricyclazole or Carbendazim compound.",
        cost_estimate=3200.0,
        urgency_days=2,
        notes="Large lesion spots on collars. Leaf collapse beginning.",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
    )
    db.add(diag3)

    db.commit()

    print("Creating marketplace listings & biddings...")
    # Farmer 0 (Ramesh) active listing
    listing1 = MarketListing(
        user_id=farmers[0].id,
        crop="Tomato",
        quantity_kg=250.0,
        quality_grade="A",
        location="Jaipur Mandi",
        price_per_kg=35.0,
        status="active"
    )
    db.add(listing1)

    # Farmer 3 (Anita) active listing
    listing2 = MarketListing(
        user_id=farmers[3].id,
        crop="Wheat",
        quantity_kg=1200.0,
        quality_grade="B",
        location="Ludhiana Mandi",
        price_per_kg=24.0,
        status="active"
    )
    db.add(listing2)

    # Farmer 12 (Gurpreet) active listing
    listing3 = MarketListing(
        user_id=farmers[12].id,
        crop="Wheat",
        quantity_kg=2000.0,
        quality_grade="A",
        location="Amritsar Mandi",
        price_per_kg=26.0,
        status="active"
    )
    db.add(listing3)

    # Farmer 4 (Sunita) active listing
    listing4 = MarketListing(
        user_id=farmers[4].id,
        crop="Cotton",
        quantity_kg=800.0,
        quality_grade="A",
        location="Nagpur Mandi",
        price_per_kg=78.0,
        status="active"
    )
    db.add(listing4)
    db.commit()

    # Create offers
    # Offer on Ramesh's listing
    off1 = Offer(
        listing_id=listing1.id,
        buyer_id=buyers[0].id,
        offered_price_per_kg=32.0,
        quantity_kg=250.0,
        status="pending"
    )
    db.add(off1)

    # Offer on Anita's listing
    off2 = Offer(
        listing_id=listing2.id,
        buyer_id=buyers[1].id,
        offered_price_per_kg=23.5,
        quantity_kg=1200.0,
        status="pending"
    )
    db.add(off2)
    
    # Offer on Gurpreet's listing (accepted)
    off3 = Offer(
        listing_id=listing3.id,
        buyer_id=buyers[0].id,
        offered_price_per_kg=25.5,
        quantity_kg=2000.0,
        status="accepted"
    )
    db.add(off3)
    db.commit()

    print("Creating historical completed transactions & credit repayment simulations...")
    # Completed listings
    listing_suresh = MarketListing(
        user_id=farmers[1].id, # Suresh
        crop="Rice",
        quantity_kg=1500.0,
        quality_grade="A",
        location="Lucknow Mandi",
        price_per_kg=28.0,
        status="sold"
    )
    db.add(listing_suresh)
    
    listing_ram = MarketListing(
        user_id=farmers[5].id, # Ram Prasad
        crop="Maize",
        quantity_kg=1000.0,
        quality_grade="B",
        location="Bhopal Mandi",
        price_per_kg=18.0,
        status="sold"
    )
    db.add(listing_ram)

    listing_vijay = MarketListing(
        user_id=farmers[6].id, # Vijay Yadav
        crop="Tomato",
        quantity_kg=500.0,
        quality_grade="B",
        location="Jaipur Mandi",
        price_per_kg=22.0,
        status="sold"
    )
    db.add(listing_vijay)

    db.commit()

    # Create Transactions
    # Suresh: successfully repaid credit
    tx1 = Transaction(
        listing_id=listing_suresh.id,
        buyer_id=buyers[0].id,
        seller_id=farmers[1].id,
        final_price=27.5,
        quantity_kg=1500.0,
        repayment_simulated_status="repaid"
    )
    db.add(tx1)

    # Ram Prasad: successfully repaid credit
    tx2 = Transaction(
        listing_id=listing_ram.id,
        buyer_id=buyers[1].id,
        seller_id=farmers[5].id,
        final_price=17.5,
        quantity_kg=1000.0,
        repayment_simulated_status="repaid"
    )
    db.add(tx2)

    # Vijay Yadav: defaulted on simulated credit
    tx3 = Transaction(
        listing_id=listing_vijay.id,
        buyer_id=buyers[0].id,
        seller_id=farmers[6].id,
        final_price=21.0,
        quantity_kg=500.0,
        repayment_simulated_status="defaulted"
    )
    db.add(tx3)
    db.commit()

    print("Computing baseline credit scores for all farmers...")
    for farmer in farmers:
        update_db_credit_score(db, farmer.id)

    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_db()
