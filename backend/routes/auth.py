from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, CreditScore
from ..schemas import UserCreate, UserLogin, Token, UserResponse
from ..auth import hash_password, verify_password, create_access_token, get_current_user
from ..rate_limiter import check_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserResponse, dependencies=[Depends(check_rate_limit)])
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.phone == user_data.phone).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user
    new_user = User(
        name=user_data.name,
        phone=user_data.phone,
        email=user_data.email,
        role=user_data.role,
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Initialize credit score for farmer
    if new_user.role == "farmer":
        credit = CreditScore(
            user_id=new_user.id,
            score=50,
            diagnosis_factor=10,
            market_factor=10,
            completeness_factor=10,
            repayment_factor=10
        )
        db.add(credit)
        db.commit()
        
    return new_user

@router.post("/login", response_model=Token, dependencies=[Depends(check_rate_limit)])
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == login_data.phone).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password"
        )
        
    # Generate token
    access_token = create_access_token(data={"sub": user.phone})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "userId": user.id
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
