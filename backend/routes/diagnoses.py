import os
import base64
import json
import random
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx

from ..database import get_db
from ..models import User, Diagnosis, Field
from ..schemas import DiagnosisResponse
from ..auth import get_current_user
from ..credit_engine import update_db_credit_score

router = APIRouter(prefix="/diagnoses", tags=["diagnoses"])

# Mock diagnoses database for fallback
MOCK_DIAGNOSES = {
    "Tomato": [
        {
            "disease_name": "Tomato Late Blight",
            "disease_name_hi": "टमाटर का लेट ब्लाइट",
            "severity": "high",
            "confidence": 0.94,
            "treatments_organic": "Apply copper-based fungicides. Remove and destroy infected leaves. Keep foliage dry by irrigating at the root level.",
            "treatments_organic_hi": "तांबा आधारित कवकनाशी का उपयोग करें। संक्रमित पत्तियों को हटाकर नष्ट कर दें। पौधे की जड़ में पानी देकर पत्तियों को सूखा रखें।",
            "treatments_chemical": "Apply Mancozeb or Chlorothalonil fungicide spray weekly.",
            "treatments_chemical_hi": "साप्ताहिक रूप से मैनकोजेब या क्लोरोथालोनिल कवकनाशी स्प्रे का उपयोग करें।",
            "cost_estimate": 1500.0,
            "urgency_days": 3,
            "notes": "Late blight spreads rapidly in cool, wet weather. Prompt action is necessary to prevent total yield loss.",
            "notes_hi": "लेट ब्लाइट ठंडे और गीले मौसम में तेजी से फैलता है। फसल के पूर्ण नुकसान को रोकने के लिए त्वरित कार्रवाई आवश्यक है।"
        },
        {
            "disease_name": "Tomato Leaf Mold",
            "disease_name_hi": "टमाटर की पत्ती का मोल्ड",
            "severity": "medium",
            "confidence": 0.88,
            "treatments_organic": "Improve ventilation in the greenhouse/field. Keep plants spaced properly to reduce humidity.",
            "treatments_organic_hi": "खेत/ग्रीनहाउस में वेंटिलेशन में सुधार करें। आर्द्रता को कम करने के लिए पौधों के बीच उचित दूरी बनाए रखें।",
            "treatments_chemical": "Spray Difenoconazole or Chlorothalonil on early symptoms.",
            "treatments_chemical_hi": "प्रारंभिक लक्षणों पर डिफेनोकोनाज़ोल या क्लोरोथालोनिल का छिड़काव करें।",
            "cost_estimate": 800.0,
            "urgency_days": 7,
            "notes": "Caused by high relative humidity. Ensure row orientation supports dry foliage.",
            "notes_hi": "यह उच्च सापेक्ष आर्द्रता के कारण होता है। सुनिश्चित करें कि हवा के बहाव से पत्तियां सूखी रहें।"
        }
    ],
    "Wheat": [
        {
            "disease_name": "Wheat Leaf Rust",
            "disease_name_hi": "गेहूं का पत्ता जंग (रस्ट)",
            "severity": "medium",
            "confidence": 0.91,
            "treatments_organic": "Dust with sulfur powder early in the morning. Use rust-resistant cultivars in the future.",
            "treatments_organic_hi": "सुबह जल्दी सल्फर पाउडर का छिड़काव करें। भविष्य में जंग-प्रतिरोधी किस्मों का उपयोग करें।",
            "treatments_chemical": "Spray Tebuconazole or Propiconazole fungicide immediately.",
            "treatments_chemical_hi": "तुरंत टेबुकोनाज़ोल या प्रोपिकोनाज़ोल कवकनाशी का छिड़काव करें।",
            "cost_estimate": 1200.0,
            "urgency_days": 6,
            "notes": "Rust spores travel via wind. Monitor neighboring fields for early signs.",
            "notes_hi": "जंग के बीजाणु हवा के माध्यम से यात्रा करते हैं। शुरुआती संकेतों के लिए पड़ोसी खेतों की निगरानी करें।"
        }
    ],
    "Rice": [
        {
            "disease_name": "Rice Blast",
            "disease_name_hi": "धान का झोंका रोग (ब्लास्ट)",
            "severity": "high",
            "confidence": 0.93,
            "treatments_organic": "Avoid over-fertilizing with nitrogen. Spray silica-rich solution to strengthen leaf walls.",
            "treatments_organic_hi": "नाइट्रोजन उर्वरक का अत्यधिक उपयोग न करें। पत्ती की दीवारों को मजबूत करने के लिए सिलिका युक्त घोल का छिड़काव करें।",
            "treatments_chemical": "Spray Tricyclazole fungicide at the first appearance of leaf lesions.",
            "treatments_chemical_hi": "पत्ती पर घाव दिखने पर तुरंत ट्राइसाइक्लाजोल कवकनाशी का छिड़काव करें।",
            "cost_estimate": 2200.0,
            "urgency_days": 2,
            "notes": "Rice blast is highly destructive. Favorable conditions include warm temperatures and wet leaves.",
            "notes_hi": "राइस ब्लास्ट अत्यधिक विनाशकारी है। अनुकूल परिस्थितियों में गर्म तापमान और गीली पत्तियां शामिल हैं।"
        }
    ],
    "Cotton": [
        {
            "disease_name": "Bacterial Blight of Cotton",
            "disease_name_hi": "कपास का जीवाणु झुलसा रोग",
            "severity": "high",
            "confidence": 0.85,
            "treatments_organic": "Destroy crop residues after harvest. Spray copper hydroxide.",
            "treatments_organic_hi": "कटाई के बाद फसल के अवशेषों को नष्ट कर दें। कॉपर हाइड्रोक्साइड का छिड़काव करें।",
            "treatments_chemical": "Spray Streptomycin sulfate mixed with copper oxychloride.",
            "treatments_chemical_hi": "कॉपर ऑक्सीक्लोराइड के साथ मिश्रित स्ट्रेप्टोमाइसिन सल्फेट का छिड़काव करें।",
            "cost_estimate": 1800.0,
            "urgency_days": 4,
            "notes": "Affects all above-ground plant parts. Spreads during rain splashes and heavy wind.",
            "notes_hi": "यह पौधे के जमीन से ऊपर के सभी हिस्सों को प्रभावित करता है। यह बारिश की बौछारों और तेज हवा के दौरान फैलता है।"
        }
    ],
    "Maize": [
        {
            "disease_name": "Maize Common Rust",
            "disease_name_hi": "मक्के का सामान्य रस्ट",
            "severity": "low",
            "confidence": 0.90,
            "treatments_organic": "No major intervention needed for low severity. Clear weeds around the field.",
            "treatments_organic_hi": "कम गंभीरता के लिए किसी बड़े हस्तक्षेप की आवश्यकता नहीं है। खेत के आसपास से खरपतवार साफ करें।",
            "treatments_chemical": "Fungicide application is rarely cost-effective unless infection is widespread.",
            "treatments_chemical_hi": "कवकनाशी का प्रयोग शायद ही कभी लागत प्रभावी होता है जब तक कि संक्रमण व्यापक न हो।",
            "cost_estimate": 400.0,
            "urgency_days": 10,
            "notes": "Usually resolves with drier weather conditions.",
            "notes_hi": "आमतौर पर शुष्क मौसम की स्थिति के साथ ठीक हो जाता है।"
        }
    ]
}

def get_fallback_diagnosis(crop_type: str, filename: str) -> dict:
    # Match crop from filename first
    matched_crop = "Tomato"
    fn_lower = filename.lower()
    for crop in MOCK_DIAGNOSES.keys():
        if crop.lower() in fn_lower:
            matched_crop = crop
            break
    else:
        # Fallback to field's crop type if present
        if crop_type in MOCK_DIAGNOSES:
            matched_crop = crop_type
        else:
            matched_crop = random.choice(list(MOCK_DIAGNOSES.keys()))
            
    # Randomly select a disease from that crop list
    options = MOCK_DIAGNOSES[matched_crop]
    return random.choice(options)

@router.get("/", response_model=List[DiagnosisResponse])
def get_diagnoses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "farmer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only farmers can view their diagnosis records"
        )
    return db.query(Diagnosis).filter(Diagnosis.user_id == current_user.id).order_by(Diagnosis.created_at.desc()).all()

@router.post("/", response_model=DiagnosisResponse)
async def create_diagnosis(
    field_id: Optional[int] = Form(None),
    crop_type_input: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "farmer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only farmers can upload crop images"
        )
        
    crop_type = "Tomato"
    # Resolve crop type from field if field_id is provided
    if field_id:
        field = db.query(Field).filter(Field.id == field_id, Field.user_id == current_user.id).first()
        if field:
            crop_type = field.crop_type
    elif crop_type_input:
        crop_type = crop_type_input
        
    # Read uploaded file
    file_bytes = await file.read()
    
    # Try calling Gemini if API key is set
    gemini_key = os.getenv("GEMINI_API_KEY")
    diagnosis_output = None
    
    if gemini_key:
        try:
            # Prepare image in Base64
            img_b64 = base64.b64encode(file_bytes).decode("utf-8")
            mime_type = file.content_type or "image/jpeg"
            
            prompt = (
                f"You are AgriSense Crop Doctor, an expert plant pathologist. "
                f"Analyze the crop leaf image provided. The crop is specified as: {crop_type}. "
                f"Identify if there is any disease or pest issue. "
                f"Provide a structured JSON response. "
                f"You MUST format the output exactly as JSON matching this schema: "
                f"{{"
                f"  \"disease_name\": \"Name of the disease (in English)\","
                f"  \"disease_name_hi\": \"Name of the disease (in Hindi)\","
                f"  \"severity\": \"low\" | \"medium\" | \"high\","
                f"  \"confidence\": 0.0 to 1.0 (float),"
                f"  \"treatments_organic\": \"Organic treatments (in English)\","
                f"  \"treatments_organic_hi\": \"Organic treatments (in Hindi)\","
                f"  \"treatments_chemical\": \"Chemical treatments (in English)\","
                f"  \"treatments_chemical_hi\": \"Chemical treatments (in Hindi)\","
                f"  \"cost_estimate\": estimated cost to treat in Indian Rupees (float),"
                f"  \"urgency_days\": recommended days to act (integer),"
                f"  \"notes\": \"General advice and description (in English)\","
                f"  \"notes_hi\": \"General advice and description (in Hindi)\""
                f"}}. "
                f"Return ONLY the JSON string. Do not include markdown code block characters like ```json."
            )
            
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inlineData": {
                                    "mimeType": mime_type,
                                    "data": img_b64
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=30.0)
                if response.status_code == 200:
                    res_json = response.json()
                    raw_text = res_json["candidates"][0]["content"]["parts"][0]["text"]
                    diagnosis_output = json.loads(raw_text.strip())
        except Exception as e:
            print(f"Gemini API call failed, falling back to mock: {e}")
            
    # Fallback to local mockup rules if Gemini was not configured or failed
    if not diagnosis_output:
        diagnosis_output = get_fallback_diagnosis(crop_type, file.filename)
        
    # Store in database
    # For demo purposes, we will mock the image_url to a local preview or standard placeholder
    mock_url = f"/uploads/{file.filename}"
    
    new_diag = Diagnosis(
        user_id=current_user.id,
        field_id=field_id,
        image_url=mock_url,
        crop_type=crop_type,
        disease_name=diagnosis_output["disease_name"],
        severity=diagnosis_output["severity"],
        confidence=diagnosis_output["confidence"],
        treatments_organic=f"ORGANIC: {diagnosis_output['treatments_organic']} || HINDI: {diagnosis_output.get('treatments_organic_hi', '')}",
        treatments_chemical=f"CHEMICAL: {diagnosis_output['treatments_chemical']} || HINDI: {diagnosis_output.get('treatments_chemical_hi', '')}",
        cost_estimate=diagnosis_output["cost_estimate"],
        urgency_days=diagnosis_output["urgency_days"],
        notes=f"EN: {diagnosis_output['notes']} || HI: {diagnosis_output.get('notes_hi', '')}"
    )
    db.add(new_diag)
    db.commit()
    db.refresh(new_diag)
    
    # Recalculate credit score since diagnoses count went up
    update_db_credit_score(db, current_user.id)
    
    # Map raw translations back into output schema for convenience
    new_diag.disease_name = f"{diagnosis_output['disease_name']} ({diagnosis_output.get('disease_name_hi', '')})"
    
    return new_diag
