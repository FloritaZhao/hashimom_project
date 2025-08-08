from __future__ import annotations
from typing import Any

import os, requests
from flask import Blueprint, jsonify, request
from .utils import current_user
from models import db, GlutenScan, AIMessage, Profile
from datetime import datetime
from config import Config

bp = Blueprint("ai", __name__)

def _u(): return current_user()

@bp.before_request
def _auth():
    # Skip authentication for CORS preflight requests
    if request.method == 'OPTIONS':
        return
    if not _u():
        return jsonify(error="Unauthorized"), 401

# ----- Gluten Snap -----
@bp.route("/gluten_scans", methods=["GET"])
def list_scans() -> Any:
    return jsonify([s.to_dict() for s in _u().gluten_scans])

@bp.route("/gluten_scans", methods=["POST"])
def create_scan() -> Any:
    data = request.get_json(silent=True) or {}
    img = data.get("image_data")
    if not img:
        return jsonify(error="image_data is required"), 400

    # Use OpenAI Vision API for food analysis
    analysis_result = analyze_food_image(img)
    
    scan = GlutenScan(
        user_id=_u().id, 
        image_url="<provided>", 
        result_tag=analysis_result.get("food_name", "Unknown"),
        created_at=datetime.utcnow()
    )
    db.session.add(scan)
    db.session.commit()
    
    # Return the full analysis for the frontend
    result = scan.to_dict()
    result.update({
        "analysis": analysis_result.get("analysis", ""),
        "gluten_assessment": analysis_result.get("gluten_assessment", ""),
        "confidence": analysis_result.get("confidence", "medium")
    })
    
    return jsonify(result), 201

def analyze_food_image(image_data: str) -> dict:
    """Analyze a food image using Gemini Vision API."""
    api_key = Config.GEMINI_API_KEY
    if not api_key:
        return {
            "food_name": "Unidentified Food",
            "analysis": "I can see there's food in the image, but I need a Gemini API key to provide detailed analysis.",
            "gluten_assessment": "Cannot determine gluten content without API access",
            "confidence": "low"
        }

    try:
        import google.generativeai as genai
        from PIL import Image
        import io
        import base64
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Convert base64 image data to PIL Image
        if image_data.startswith('data:image'):
            # Remove data URL prefix if present
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        prompt = """Analyze this food image and provide:
1. What food/dish is this?
2. List the main ingredients you can identify
3. Assess if it likely contains gluten (wheat, barley, rye, etc.)
4. Rate your confidence in the analysis (high/medium/low)
Format your response as a clear, helpful analysis for someone with celiac disease or gluten sensitivity."""
        
        # Updated API call format for current Gemini
        response = model.generate_content([image, prompt])
        analysis_text = response.text
        
        # Extract key information from the analysis
        lines = analysis_text.split('\n')
        food_name = "Analyzed Food"
        gluten_assessment = "Assessment pending"
        confidence = "medium"
        
        for line in lines:
            if any(word in line.lower() for word in ['food', 'dish', 'appears to be', 'looks like']):
                food_name = line.strip()[:50]  # Limit length
            elif 'gluten' in line.lower():
                gluten_assessment = line.strip()
            elif any(word in line.lower() for word in ['confidence', 'certain', 'sure']):
                if 'high' in line.lower():
                    confidence = "high"
                elif 'low' in line.lower():
                    confidence = "low"
        
        return {
            "food_name": food_name,
            "analysis": analysis_text,
            "gluten_assessment": gluten_assessment,
            "confidence": confidence
        }

    except Exception as e:
        import logging
        logging.error(f"Gemini Vision API error: {str(e)}")
        
        # Check if it's an API key issue
        if "401" in str(e) or "unauthorized" in str(e).lower():
            error_msg = "API authentication failed. Please check your Gemini API key."
        elif "404" in str(e) or "not found" in str(e).lower():
            error_msg = f"Model not found. Using fallback analysis. Error: {str(e)}"
        else:
            error_msg = f"Analysis error: {str(e)}"
            
        return {
            "food_name": "Analysis Error", 
            "analysis": f"I encountered an issue analyzing the image: {error_msg}",
            "gluten_assessment": "Unable to assess gluten content due to analysis error",
            "confidence": "low"
        }

# ----- Food Chat -----
@bp.route("/food_chat", methods=["POST"])
def food_chat() -> Any:
    """Chat about food analysis results using Gemini API."""
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    context = data.get("context", "")  # Previous analysis context
    
    if not message:
        return jsonify(error="Message is required"), 400
    
    api_key = Config.GEMINI_API_KEY
    if not api_key:
        return jsonify({
            "response": "I'd love to chat about your food, but I need a Gemini API key to provide detailed responses. For now, I can suggest consulting ingredient lists and contacting manufacturers for gluten information."
        })
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""You are a helpful assistant specializing in food analysis and gluten-free guidance.
Context from previous analysis: {context}
User question: {message}
Provide helpful, accurate information about:
- Food ingredients and preparation
- Gluten content assessment  
- Celiac disease and gluten sensitivity considerations
- Alternative food suggestions
- General nutritional information
Be supportive and informative, but always remind users to consult healthcare providers for medical advice. Keep responses concise and practical."""

        response = model.generate_content(prompt)
        ai_response = response.text
        return jsonify({"response": ai_response})

    except Exception as e:
        import logging
        logging.error(f"Gemini Chat API error: {str(e)}")
        
        if "401" in str(e) or "unauthorized" in str(e).lower():
            error_msg = "Authentication failed. Please check your API key."
        elif "404" in str(e) or "not found" in str(e).lower():
            error_msg = "Model not available. Please try again later."
        else:
            error_msg = "I'm having trouble processing your message right now."
            
        return jsonify({
            "response": f"{error_msg} Please try again or consult a healthcare provider for specific dietary concerns."
        })

# ----- AI Messages -----
def generate_encouragement() -> str:
    """Generate a short, encouraging message for the user."""
    api_key = Config.GEMINI_API_KEY
    if not api_key:
        return "You're doing great! Keep up the hard work."
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = "Write a short, uplifting, and encouraging message for someone tracking their health. Make it sound personal and optimistic. Less than 25 words"
        response = model.generate_content(prompt)
        return response.text.strip()

    except Exception as e:
        import logging
        logging.error(f"Gemini encouragement error: {str(e)}")
        return "Stay positive and keep making healthy choices!"

@bp.route("/ai_messages/encouragement", methods=["GET"])
def get_encouragement_message() -> Any:
    """Generate and return a new encouragement message."""
    message_text = generate_encouragement()
    
    # Create and save the message to the database
    new_message = AIMessage(
        user_id=_u().id,
        message=message_text,
        created_at=datetime.utcnow()
    )
    db.session.add(new_message)
    db.session.commit()
    
    return jsonify(new_message.to_dict())


@bp.route("/ai_messages", methods=["GET"])
def latest_msg() -> Any:
    msg = (
        AIMessage.query.filter_by(user_id=_u().id)
        .order_by(AIMessage.created_at.desc())
        .first()
    )
    # Attach trimester info for frontend convenience
    trimester = "-"
    prof = Profile.query.filter_by(user_id=_u().id).first()
    if prof:
        from datetime import date as _date
        from utils.gestation import calculate_by_lmp, calculate_by_due
        today = _date.today()
        if prof.lmp_date:
            trimester = calculate_by_lmp(prof.lmp_date, today).get("trimester", "-")  # type: ignore
        elif prof.due_date:
            trimester = calculate_by_due(prof.due_date, today).get("trimester", "-")  # type: ignore

    payload = msg.to_dict() if msg else {"message": "Welcome! Let's start tracking your progress."}
    payload.update({"trimester": trimester})
    return jsonify(payload)
