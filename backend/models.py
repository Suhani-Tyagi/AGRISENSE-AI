import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    role = Column(String, nullable=False)  # 'farmer', 'buyer', 'finance_officer'
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    fields = relationship("Field", back_populates="owner")
    diagnoses = relationship("Diagnosis", back_populates="user")
    listings = relationship("MarketListing", back_populates="seller")
    offers = relationship("Offer", back_populates="buyer")
    credit_score = relationship("CreditScore", back_populates="user", uselist=False)

class Field(Base):
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    crop_type = Column(String, nullable=False)
    size_acres = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    last_irrigation = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="fields")
    sensor_readings = relationship("SensorReading", back_populates="field", cascade="all, delete-orphan")

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    soil_moisture = Column(Float, nullable=False)  # percentage (e.g. 0-100)
    nitrogen = Column(Float, nullable=False)       # ppm or kg/ha
    phosphorus = Column(Float, nullable=False)     # ppm or kg/ha
    potassium = Column(Float, nullable=False)      # ppm or kg/ha
    ph = Column(Float, nullable=False)             # 0-14
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    # Relationships
    field = relationship("Field", back_populates="sensor_readings")

class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=True)
    image_url = Column(String, nullable=True)
    crop_type = Column(String, nullable=False)
    disease_name = Column(String, nullable=False)
    severity = Column(String, nullable=False)        # 'low', 'medium', 'high'
    confidence = Column(Float, nullable=False)       # percentage (e.g., 0.0 - 1.0)
    treatments_organic = Column(Text, nullable=True)  # JSON-like or comma separated or markdown
    treatments_chemical = Column(Text, nullable=True)
    cost_estimate = Column(Float, nullable=False)     # Estimated cost in local currency / USD
    urgency_days = Column(Integer, nullable=False)    # Days to act
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="diagnoses")
    field = relationship("Field")

class MarketListing(Base):
    __tablename__ = "market_listings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    crop = Column(String, nullable=False)
    quantity_kg = Column(Float, nullable=False)
    quality_grade = Column(String, nullable=False)    # 'A', 'B', 'C'
    location = Column(String, nullable=False)
    price_per_kg = Column(Float, nullable=False)
    status = Column(String, default="active")          # 'active', 'sold', 'cancelled'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    seller = relationship("User", back_populates="listings")
    offers = relationship("Offer", back_populates="listing", cascade="all, delete-orphan")

class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("market_listings.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    offered_price_per_kg = Column(Float, nullable=False)
    quantity_kg = Column(Float, nullable=False)
    status = Column(String, default="pending")          # 'pending', 'accepted', 'rejected'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    listing = relationship("MarketListing", back_populates="offers")
    buyer = relationship("User", back_populates="offers")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("market_listings.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    final_price = Column(Float, nullable=False)
    quantity_kg = Column(Float, nullable=False)
    repayment_simulated_status = Column(String, default="repaid")  # 'repaid', 'defaulted', 'ongoing'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    listing = relationship("MarketListing")
    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])

class CreditScore(Base):
    __tablename__ = "credit_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    score = Column(Integer, default=50)              # 0 to 100
    diagnosis_factor = Column(Integer, default=10)    # points contributed
    market_factor = Column(Integer, default=10)       # points contributed
    completeness_factor = Column(Integer, default=10) # points contributed
    repayment_factor = Column(Integer, default=10)    # points contributed
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="credit_score")

class ForumQuestion(Base):
    __tablename__ = "forum_questions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    crop_type = Column(String, nullable=False)
    region = Column(String, nullable=False)
    question_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User")
    answers = relationship("ForumAnswer", back_populates="question", cascade="all, delete-orphan")

class ForumAnswer(Base):
    __tablename__ = "forum_answers"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("forum_questions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    answer_text = Column(Text, nullable=False)
    is_extension_officer = Column(Integer, default=0) # 0 for false, 1 for true
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User")
    question = relationship("ForumQuestion", back_populates="answers")

class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    crop = Column(String, nullable=False)
    target_price = Column(Float, nullable=False)
    alert_type = Column(String, nullable=False) # "above" or "below"
    is_active = Column(Integer, default=1)      # 1 for active, 0 for inactive
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User")
