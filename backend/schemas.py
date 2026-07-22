from pydantic import BaseModel, Field as PyField
from typing import Optional, List
from datetime import datetime

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    role: str  # 'farmer', 'buyer', 'finance_officer'

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    phone: str
    password: str

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
    soil_moisture: float
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float

class SensorReadingCreate(SensorReadingBase):
    field_id: int

class SensorReadingResponse(SensorReadingBase):
    id: int
    field_id: int
    timestamp: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# --- FIELD SCHEMAS ---
class FieldBase(BaseModel):
    name: str
    crop_type: str
    size_acres: float
    latitude: float
    longitude: float

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
    crop_type: str
    disease_name: str
    severity: str
    confidence: float
    treatments_organic: Optional[str] = None
    treatments_chemical: Optional[str] = None
    cost_estimate: float
    urgency_days: int
    notes: Optional[str] = None

class DiagnosisCreate(DiagnosisBase):
    field_id: Optional[int] = None
    image_url: Optional[str] = None

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
    offered_price_per_kg: float
    quantity_kg: float

class OfferCreate(OfferBase):
    listing_id: int

class OfferUpdate(BaseModel):
    status: str  # 'accepted', 'rejected'

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
    crop: str
    quantity_kg: float
    quality_grade: str
    location: str
    price_per_kg: float

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
