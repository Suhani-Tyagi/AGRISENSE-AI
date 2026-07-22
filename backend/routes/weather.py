from fastapi import APIRouter, HTTPException, Query
import httpx
import datetime
import random
from typing import Optional

router = APIRouter(prefix="/weather", tags=["weather"])

# Actionable advisory generator based on conditions
def get_farming_advisory(temp_max: float, rain_sum: float, wind_speed: float, humidity: float) -> dict:
    alerts = []
    advisories = []
    
    # Check for alerts
    if temp_max > 40.0:
        alerts.append({
            "type": "heatwave",
            "severity": "high",
            "title": "Extreme Heat Alert",
            "title_hi": "अत्यधिक गर्मी की चेतावनी",
            "desc": "Temperatures exceeding 40°C. Protect crops from sun scorch and increase soil irrigation levels.",
            "desc_hi": "तापमान 40°सी से अधिक। फसलों को धूप से बचाएं और सिंचाई बढ़ाएं।"
        })
    elif temp_max < 5.0:
        alerts.append({
            "type": "frost",
            "severity": "high",
            "title": "Frost Warning",
            "title_hi": "पाला पड़ने की चेतावनी",
            "desc": "Frost conditions possible tonight. Cover fragile plants and irrigate lightly to protect roots.",
            "desc_hi": "आज रात पाला पड़ने की संभावना। संवेदनशील पौधों को ढकें और जड़ों की सुरक्षा के लिए हल्की सिंचाई करें।"
        })
        
    if rain_sum > 30.0:
        alerts.append({
            "type": "flood",
            "severity": "high",
            "title": "Heavy Rainfall Warning",
            "title_hi": "भारी बारिश की चेतावनी",
            "desc": "Heavy precipitation expected. Clear drainage channels to prevent waterlogging and root rot.",
            "desc_hi": "भारी बारिश की उम्मीद। जलभराव और जड़ों के सड़ने से बचाने के लिए जल निकासी नाले साफ करें।"
        })
    elif rain_sum > 0 and wind_speed > 25.0:
        alerts.append({
            "type": "storm",
            "severity": "medium",
            "title": "Gusty Winds and Showers",
            "title_hi": "तेज हवाएं और बौछारें",
            "desc": "Strong winds may cause lodging in tall crops. Avoid vertical spray treatments.",
            "desc_hi": "तेज हवाएं लंबी फसलों को नुकसान पहुंचा सकती हैं। कीटनाशक छिड़काव से बचें।"
        })
        
    # Check for general advisories
    if rain_sum > 5.0:
        advisories.append({
            "day": "Today",
            "advice": "Avoid irrigation today — significant rainfall expected.",
            "advice_hi": "आज सिंचाई से बचें - पर्याप्त वर्षा होने की उम्मीद है।",
            "ok_to_spray": False,
            "spray_reason": "Rain will wash away pesticide/fertilizer applications.",
            "spray_reason_hi": "बारिश कीटनाशक/उर्वरक छिड़काव को धो देगी।"
        })
    elif wind_speed > 20.0:
        advisories.append({
            "day": "Today",
            "advice": "Irrigate as normal, but do not spray pesticide due to strong winds.",
            "advice_hi": "सामान्य रूप से सिंचाई करें, लेकिन तेज हवाओं के कारण कीटनाशकों का छिड़काव न करें।",
            "ok_to_spray": False,
            "spray_reason": "High wind speeds cause spray drift, making chemical application ineffective and risky.",
            "spray_reason_hi": "तेज हवाओं से छिड़काव फैल जाता है, जिससे रसायनों का प्रयोग अप्रभावी और जोखिम भरा हो जाता है।"
        })
    else:
        advisories.append({
            "day": "Today",
            "advice": "Ideal weather conditions. Perfect day for fertilizer application, spraying, and weeding.",
            "advice_hi": "आदर्श मौसम की स्थिति। उर्वरक प्रयोग, छिड़काव और निराई के लिए उत्तम दिन।",
            "ok_to_spray": True,
            "spray_reason": "Low wind speed and clear skies ensure maximum absorption.",
            "spray_reason_hi": "कम हवा की गति और साफ आसमान अधिकतम अवशोषण सुनिश्चित करते हैं।"
        })
        
    return {
        "alerts": alerts,
        "advisories": advisories
    }

def generate_mock_weather(lat: float, lng: float) -> dict:
    """
    Generates a realistic mock 7-day forecast if API is unreachable.
    """
    days = []
    base_temp = 28.0
    # Simulate seasonal changes based on latitude
    if lat > 28.0: # North India/Himalayas - cooler
        base_temp = 18.0
        
    start_date = datetime.date.today()
    
    # Introduce some rain patterns
    rain_probability = random.random()
    
    for i in range(7):
        date_str = (start_date + datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        temp_max = round(base_temp + random.uniform(-4.0, 4.0), 1)
        temp_min = round(temp_max - random.uniform(8.0, 12.0), 1)
        wind_speed = round(random.uniform(5.0, 28.0), 1)
        humidity = random.randint(40, 90)
        
        # Determine precipitation
        rain = 0.0
        if rain_probability > 0.6 and i in [1, 2]: # rain on days 1 and 2
            rain = round(random.uniform(5.0, 45.0), 1)
            
        advice_info = get_farming_advisory(temp_max, rain, wind_speed, humidity)
        
        # Tailored code description
        weather_code = 0 # Clear
        weather_desc = "Clear sky"
        weather_desc_hi = "साफ आसमान"
        if rain > 15.0:
            weather_code = 3 # Heavy rain
            weather_desc = "Heavy rain"
            weather_desc_hi = "भारी बारिश"
        elif rain > 0:
            weather_code = 2 # Light rain
            weather_desc = "Light showers"
            weather_desc_hi = "हल्की बौछारें"
        elif humidity > 80:
            weather_code = 1 # Cloudy
            weather_desc = "Mainly cloudy"
            weather_desc_hi = "मुख्य रूप से बादल छाए रहेंगे"
            
        days.append({
            "date": date_str,
            "temp_max": temp_max,
            "temp_min": temp_min,
            "rain_sum": rain,
            "wind_speed": wind_speed,
            "humidity": humidity,
            "weather_code": weather_code,
            "weather_desc": weather_desc,
            "weather_desc_hi": weather_desc_hi,
            "advice": advice_info["advisories"][0]["advice"] if advice_info["advisories"] else "Normal farming conditions.",
            "advice_hi": advice_info["advisories"][0]["advice_hi"] if advice_info["advisories"] else "सामान्य कृषि स्थितियां।",
            "ok_to_spray": advice_info["advisories"][0]["ok_to_spray"] if advice_info["advisories"] else True,
            "spray_reason": advice_info["advisories"][0]["spray_reason"] if advice_info["advisories"] else "Weather is clear.",
            "spray_reason_hi": advice_info["advisories"][0]["spray_reason_hi"] if advice_info["advisories"] else "मौसम साफ है।"
        })
        
    # Get alerts for today (day 0)
    today_alerts = get_farming_advisory(days[0]["temp_max"], days[0]["rain_sum"], days[0]["wind_speed"], days[0]["humidity"])["alerts"]
    
    return {
        "latitude": lat,
        "longitude": lng,
        "is_simulated": True,
        "forecast": days,
        "alerts": today_alerts
    }

@router.get("/")
async def get_weather(
    latitude: float = Query(26.9124, description="Latitude of the field"),
    longitude: float = Query(75.7873, description="Longitude of the field")
):
    # Call Open-Meteo public REST API
    url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,relativehumidity_2m_max&timezone=auto"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                res_data = response.json()
                daily = res_data.get("daily", {})
                
                # Check that we received valid data array
                if "time" not in daily:
                    return generate_mock_weather(latitude, longitude)
                
                days = []
                for i in range(len(daily["time"])):
                    date_str = daily["time"][i]
                    temp_max = daily["temperature_2m_max"][i]
                    temp_min = daily["temperature_2m_min"][i]
                    rain = daily["precipitation_sum"][i]
                    wind_speed = daily["windspeed_10m_max"][i]
                    # Open-Meteo doesn't always have humidity in simple endpoints, default if missing
                    humidity = daily.get("relativehumidity_2m_max", [65]*7)[i] or 65
                    
                    advice_info = get_farming_advisory(temp_max, rain, wind_speed, humidity)
                    
                    weather_code = 0
                    weather_desc = "Clear sky"
                    weather_desc_hi = "साफ आसमान"
                    if rain > 15.0:
                        weather_code = 3
                        weather_desc = "Heavy rain"
                        weather_desc_hi = "भारी बारिश"
                    elif rain > 0:
                        weather_code = 2
                        weather_desc = "Light showers"
                        weather_desc_hi = "हल्की बौछारें"
                    elif humidity > 80:
                        weather_code = 1
                        weather_desc = "Mainly cloudy"
                        weather_desc_hi = "मुख्य रूप से बादल छाए रहेंगे"
                        
                    days.append({
                        "date": date_str,
                        "temp_max": temp_max,
                        "temp_min": temp_min,
                        "rain_sum": rain,
                        "wind_speed": wind_speed,
                        "humidity": humidity,
                        "weather_code": weather_code,
                        "weather_desc": weather_desc,
                        "weather_desc_hi": weather_desc_hi,
                        "advice": advice_info["advisories"][0]["advice"] if advice_info["advisories"] else "Normal farming conditions.",
                        "advice_hi": advice_info["advisories"][0]["advice_hi"] if advice_info["advisories"] else "सामान्य कृषि स्थितियां।",
                        "ok_to_spray": advice_info["advisories"][0]["ok_to_spray"] if advice_info["advisories"] else True,
                        "spray_reason": advice_info["advisories"][0]["spray_reason"] if advice_info["advisories"] else "Weather is clear.",
                        "spray_reason_hi": advice_info["advisories"][0]["spray_reason_hi"] if advice_info["advisories"] else "मौसम साफ है।"
                    })
                    
                today_alerts = get_farming_advisory(days[0]["temp_max"], days[0]["rain_sum"], days[0]["wind_speed"], days[0]["humidity"])["alerts"]
                
                return {
                    "latitude": latitude,
                    "longitude": longitude,
                    "is_simulated": False,
                    "forecast": days,
                    "alerts": today_alerts
                }
            else:
                return generate_mock_weather(latitude, longitude)
    except Exception as e:
        print(f"Weather API fetch failed, falling back to mock: {e}")
        return generate_mock_weather(latitude, longitude)
