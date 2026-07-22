import os
import httpx
import base64
import json
import random
from fastapi import APIRouter, Depends, Form, Response, status
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import User, Diagnosis, Field
from ..credit_engine import update_db_credit_score
from .diagnoses import get_fallback_diagnosis

router = APIRouter(prefix="/webhook", tags=["webhook"])

@router.post("/whatsapp")
async def whatsapp_webhook(
    From: str = Form(...),
    Body: Optional[str] = Form(None),
    MediaUrl0: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    # Strip "whatsapp:" prefix if present from Twilio sender
    sender_phone = From.replace("whatsapp:", "").strip()
    # Normalize phone matching format (e.g. if db has no "+" or has it)
    clean_phone = sender_phone.replace("+", "").strip()

    # Look up the user
    user = db.query(User).filter(
        (User.phone == sender_phone) | 
        (User.phone == clean_phone) | 
        (User.phone.like(f"%{clean_phone[-10:]}"))
    ).first()

    if not user:
        # For demo purposes, if user is not found, fallback to the first farmer in the DB
        user = db.query(User).filter(User.role == "farmer").first()
        if not user:
            sms_response = (
                "AgriSense AI Error:\n"
                "Your phone number is not registered on AgriSense AI. "
                "Please sign up first via the web portal."
            )
            return Response(content=sms_response, media_type="text/plain")

    # Resolve crop type from body text
    body_text = (Body or "").lower()
    crop_type = "Tomato"
    for crop in ["tomato", "wheat", "rice", "cotton", "maize"]:
        if crop in body_text:
            crop_type = crop.capitalize()
            break

    # Get diagnosis details
    diagnosis_output = None
    file_bytes = None
    filename = f"whatsapp_{crop_type.lower()}_leaf.jpg"

    # Attempt to download media if URL is provided
    if MediaUrl0:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(MediaUrl0, timeout=15.0)
                if res.status_code == 200:
                    file_bytes = res.content
        except Exception:
            pass

    # Try calling Gemini vision API if file_bytes was successfully fetched and GEMINI_API_KEY exists
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and file_bytes:
        try:
            img_b64 = base64.b64encode(file_bytes).decode("utf-8")
            prompt = (
                f"You are AgriSense Crop Doctor. Analyze this crop leaf: {crop_type}. "
                f"Identify the disease and respond in this exact JSON schema: "
                f"{{"
                f"  \"disease_name\": \"string\","
                f"  \"disease_name_hi\": \"string\","
                f"  \"severity\": \"low\" | \"medium\" | \"high\","
                f"  \"confidence\": float,"
                f"  \"treatments_organic\": \"string\","
                f"  \"treatments_organic_hi\": \"string\","
                f"  \"treatments_chemical\": \"string\","
                f"  \"treatments_chemical_hi\": \"string\","
                f"  \"cost_estimate\": float,"
                f"  \"urgency_days\": integer,"
                f"  \"notes\": \"string\","
                f"  \"notes_hi\": \"string\""
                f"}}"
            )
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {"inlineData": {"mimeType": "image/jpeg", "data": img_b64}}
                        ]
                    }
                ],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=20.0)
                if response.status_code == 200:
                    raw_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
                    diagnosis_output = json.loads(raw_text.strip())
        except Exception:
            pass

    # Fallback to local rule engine
    if not diagnosis_output:
        diagnosis_output = get_fallback_diagnosis(crop_type, filename)

    # Save to database
    new_diag = Diagnosis(
        user_id=user.id,
        crop_type=crop_type,
        disease_name=diagnosis_output["disease_name"],
        severity=diagnosis_output["severity"],
        confidence=diagnosis_output["confidence"],
        treatments_organic=diagnosis_output["treatments_organic"],
        treatments_chemical=diagnosis_output["treatments_chemical"],
        cost_estimate=diagnosis_output["cost_estimate"],
        urgency_days=diagnosis_output["urgency_days"],
        notes=diagnosis_output["notes"],
        image_url=MediaUrl0 or "/uploads/whatsapp_fallback.jpg"
    )
    db.add(new_diag)
    db.commit()
    db.refresh(new_diag)

    # Update credit score metrics since new data has been logged
    update_db_credit_score(db, user.id)

    # Build plain-text SMS response
    sms_response = (
        f"AgriSense Crop Doctor Diagnosis Report:\n"
        f"----------------------------------------\n"
        f"Hello {user.name},\n"
        f"We processed your image query for crop: {crop_type}\n\n"
        f"Disease identified: {new_diag.disease_name}\n"
        f"Severity: {new_diag.severity.upper()}\n"
        f"Confidence score: {int(new_diag.confidence * 100)}%\n\n"
        f"Recommended Organic Treatment:\n"
        f"- {diagnosis_output.get('treatments_organic')}\n\n"
        f"Recommended Chemical Treatment:\n"
        f"- {diagnosis_output.get('treatments_chemical')}\n\n"
        f"Est. Treatment Cost: INR {new_diag.cost_estimate}\n"
        f"Action Urgency: within {new_diag.urgency_days} days.\n"
        f"----------------------------------------\n"
        f"Your FarmScore has been updated in response to this diagnostic check-in."
    )

    return Response(content=sms_response, media_type="text/plain")
