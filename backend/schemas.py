from pydantic import BaseModel, Field as PyField, field_validator
from typing import Optional, List
from datetime import datetime
import re

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    name: str = PyField(..., min_length=2, max_length=50, description="Name must be between 2 and 50 characters")
    phone: str = PyField(..., min_length=10, max_length=15, description="Phone must be between 10 and 15 digits")
    email: Optional[str] = PyField(None, max_length=100, description="Email cannot exceed 100 characters")
    role: str = PyField(..., max_length=20)  # 'farmer', 'buyer', 'finance_officer'

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Match standard phone format (10 to 15 digits, optional leading +, spaces, or dashes)
        if not re.match(r"^\+?[\d\s-]{10,15}$", v):
            raise ValueError("Phone number must contain between 10 and 15 digits.")
        return v

class UserCreate(UserBase):
    password: str = PyField(..., min_length=6, max_length=100, description="Password must be between 6 and 100 characters")

class UserLogin(BaseModel):
    phone: str = PyField(..., min_length=10, max_length=15)
    password: str = PyField(..., min_length=6, max_length=100)

    @field_validator('phone')
    @classmethod
    def validate_phone_login(cls, v: str) -> str:
        if not re.match(r"^\+?[\d\s-]{10,15}$", v):
            raise ValueError("Phone number must contain between 10 and 15 digits.")
        return v

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    userId: int

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# --- SENSOR SCHEMAS ---
class SensorReadingBase(BaseModel):
    soil_moisture: float = PyField(..., ge=0.0, le=100.0, description="Soil moisture must be between 0 and 100%")
    nitrogen: float = PyField(..., ge=0.0, description="Nitrogen value cannot be negative")
    phosphorus: float = PyField(..., ge=0.0, description="Phosphorus value cannot be negative")
    potassium: float = PyField(..., ge=0.0, description="Potassium value cannot be negative")
    ph: float = PyField(..., ge=0.0, le=14.0, description="pH must be between 0.0 and 14.0")

class SensorReadingCreate(SensorReadingBase):
    field_id: int = PyField(..., gt=0)

class SensorReadingResponse(SensorReadingBase):
    id: int
    field_id: int
    timestamp: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# --- FIELD SCHEMAS ---
class FieldBase(BaseModel):
    name: str = PyField(..., min_length=2, max_length=50, description="Field name must be between 2 and 50 characters")
    crop_type: str = PyField(..., min_length=2, max_length=30, description="Crop type must be between 2 and 30 characters")
    size_acres: float = PyField(..., gt=0.0, description="Field size in acres must be greater than zero")
    latitude: float = PyField(..., ge=-90.0, le=90.0, description="Latitude must be between -90 and 90")
    longitude: float = PyField(..., ge=-180.0, le=180.0, description="Longitude must be between -180 and 180")

class FieldCreate(FieldBase):
    pass

class FieldResponse(FieldBase):
    id: int
    user_id: int
    last_irrigation: Optional[datetime] = None
    created_at: datetime
    sensor_readings: List[SensorReadingResponse] = []

    class Config:
        orm_mode = True
        from_attributes = True

# --- DIAGNOSIS SCHEMAS ---
class DiagnosisBase(BaseModel):
    crop_type: str = PyField(..., min_length=2, max_length=30)
    disease_name: str = PyField(..., min_length=2, max_length=100)
    severity: str = PyField(..., max_length=20)
    confidence: float = PyField(..., ge=0.0, le=1.0)
    treatments_organic: Optional[str] = PyField(None, max_length=1000)
    treatments_chemical: Optional[str] = PyField(None, max_length=1000)
    cost_estimate: float = PyField(..., ge=0.0, description="Cost estimate cannot be negative")
    urgency_days: int = PyField(..., ge=0, description="Urgency days cannot be negative")
    notes: Optional[str] = PyField(None, max_length=1000)

class DiagnosisCreate(DiagnosisBase):
    field_id: Optional[int] = PyField(None, gt=0)
    image_url: Optional[str] = PyField(None, max_length=255)

class DiagnosisResponse(DiagnosisBase):
    id: int
    user_id: int
    field_id: Optional[int] = None
    image_url: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# --- OFFER SCHEMAS ---
class OfferBase(BaseModel):
    offered_price_per_kg: float = PyField(..., gt=0.0, description="Offered price must be positive")
    quantity_kg: float = PyField(..., gt=0.0, description="Quantity must be positive")

class OfferCreate(OfferBase):
    listing_id: int = PyField(..., gt=0)

class OfferUpdate(BaseModel):
    status: str = PyField(..., max_length=20)  # 'accepted', 'rejected'

    @field_validator('status')
    @classmethod
    def validate_offer_status(cls, v: str) -> str:
        if v.lower() not in ['accepted', 'rejected']:
            raise ValueError("Status must be either 'accepted' or 'rejected'")
        return v.lower()

class OfferResponse(OfferBase):
    id: int
    listing_id: int
    buyer_id: int
    status: str
    created_at: datetime
    buyer_name: Optional[str] = None

    class Config:
        orm_mode = True
        from_attributes = True

# --- MARKET LISTING SCHEMAS ---
class MarketListingBase(BaseModel):
    crop: str = PyField(..., min_length=2, max_length=30, description="Crop name must be between 2 and 30 characters")
    quantity_kg: float = PyField(..., gt=0.0, description="Quantity listed must be positive")
    quality_grade: str = PyField(..., max_length=5, description="Grade cannot exceed 5 characters")
    location: str = PyField(..., min_length=2, max_length=100, description="Location must be between 2 and 100 characters")
    price_per_kg: float = PyField(..., gt=0.0, description="Price must be positive")

class MarketListingCreate(MarketListingBase):
    pass

class MarketListingResponse(MarketListingBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    seller_name: Optional[str] = None
    seller_phone: Optional[str] = None
    offers: List[OfferResponse] = []

    class Config:
        orm_mode = True
        from_attributes = True

# --- TRANSACTION SCHEMAS ---
class TransactionResponse(BaseModel):
    id: int
    listing_id: int
    buyer_id: int
    seller_id: int
    final_price: float
    quantity_kg: float
    repayment_simulated_status: str
    created_at: datetime
    crop: Optional[str] = None
    buyer_name: Optional[str] = None
    seller_name: Optional[str] = None

    class Config:
        orm_mode = True
        from_attributes = True

# --- CREDIT SCORE SCHEMAS ---
class CreditScoreResponse(BaseModel):
    id: int
    user_id: int
    score: int
    diagnosis_factor: int
    market_factor: int
    completeness_factor: int
    repayment_factor: int
    updated_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# --- FORUM SCHEMAS ---
class ForumAnswerCreate(BaseModel):
    answer_text: str = PyField(..., min_length=2, max_length=1000, description="Answer must be between 2 and 1000 characters")

class ForumAnswerResponse(BaseModel):
    id: int
    question_id: int
    user_id: int
    user_name: str
    user_role: str
    answer_text: str
    is_extension_officer: int
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class ForumQuestionCreate(BaseModel):
    crop_type: str = PyField(..., min_length=2, max_length=30, description="Crop name must be between 2 and 30 characters")
    region: str = PyField(..., min_length=2, max_length=50, description="Region must be between 2 and 50 characters")
    question_text: str = PyField(..., min_length=5, max_length=1000, description="Question must be between 5 and 1000 characters")

class ForumQuestionResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_role: str
    crop_type: str
    region: str
    question_text: str
    created_at: datetime
    answers: List[ForumAnswerResponse] = []

    class Config:
        orm_mode = True
        from_attributes = True

# --- PRICE ALERT SCHEMAS ---
class PriceAlertCreate(BaseModel):
    crop: str = PyField(..., min_length=2, max_length=30, description="Crop name must be between 2 and 30 characters")
    target_price: float = PyField(..., gt=0.0, description="Target price must be positive")
    alert_type: str = PyField(..., description="Alert type must be 'above' or 'below'")

class PriceAlertResponse(BaseModel):
    id: int
    user_id: int
    crop: str
    target_price: float
    alert_type: str
    is_active: int
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True
