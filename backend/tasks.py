"""Background tasks for the HashiMom application.

This module configures APScheduler to run periodic jobs such as
generating AI encouragement messages.  The scheduler is initialized
from `app.py` via `init_scheduler(app)` and runs in the same process
as the Flask application.
"""

from __future__ import annotations
import os, requests, logging
from datetime import datetime
from typing import Iterable

from apscheduler.schedulers.background import BackgroundScheduler
from flask import current_app
from models import db, User, AIMessage


def init_scheduler(app) -> None:
    """Initialize and start the background scheduler.

    The scheduler is attached to the Flask application context so it
    shares access to the database.  Jobs are added here.
    """
    scheduler = BackgroundScheduler(timezone="UTC")

    @scheduler.scheduled_job("interval", days=1)
    def daily_ai_message_job() -> None:
        """Generate a daily AI encouragement message for every user.

        This job runs once per day. It iterates through all users and
        creates an `AIMessage` record containing the AI‑generated text.
        If no OpenAI API key is configured the job falls back to a
        canned message.  Any exceptions are caught and logged to
        avoid crashing the scheduler.
        """
        with app.app_context():
            users: Iterable[User] = User.query.all()
            for user in users:
                try:
                    message_text = generate_ai_encouragement(user)
                except Exception as e:
                    logging.warning(f"AI generation failed for user {user.id}: {e}")
                    # Fallback to a generic message on failure.
                    message_text = "Remember to take care of yourself today! 🌟"
                ai_msg = AIMessage(user_id=user.id, message=message_text, created_at=datetime.utcnow())
                db.session.add(ai_msg)
            db.session.commit()
            logging.info(f"Generated AI messages for {len(list(users))} users")

    scheduler.start()


def generate_initial_messages(app) -> None:
    """Generate initial AI messages for all users (for testing/setup).
    
    This is useful for immediately creating messages without waiting for the daily job.
    """
    with app.app_context():
        users: Iterable[User] = User.query.all()
        for user in users:
            # Check if user already has an AI message from today
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            existing_msg = AIMessage.query.filter(
                AIMessage.user_id == user.id,
                AIMessage.created_at >= today_start
            ).first()
            
            if not existing_msg:
                try:
                    message_text = generate_ai_encouragement(user)
                except Exception as e:
                    logging.warning(f"AI generation failed for user {user.id}: {e}")
                    message_text = "You're doing great! Keep tracking your health journey. 💪"
                
                ai_msg = AIMessage(user_id=user.id, message=message_text, created_at=datetime.utcnow())
                db.session.add(ai_msg)
        
        db.session.commit()
        logging.info(f"Generated initial AI messages for {len(list(users))} users")


def generate_ai_encouragement(user: User) -> str:
    """Generate an AI encouragement message for a user using Gemini API."""
    key = current_app.config.get("GEMINI_API_KEY")
    if not key:
        # Enhanced fallback messages when no API key is configured
        fallback_messages = [
            "You're doing amazing by tracking your health! Keep it up! 🌟",
            "Every symptom you log helps you understand your body better. Great work! 💪",
            "Your health journey matters, and you're taking all the right steps! ✨",
            "Consistency in health tracking shows real dedication. You've got this! 🌈",
            "Remember: small steps every day lead to big improvements! Keep going! 🎯"
        ]
        # Use user ID to select a consistent message for the day
        import hashlib
        today = datetime.utcnow().date().isoformat()
        seed = hashlib.md5(f"{user.id}-{today}".encode()).hexdigest()
        message_index = int(seed, 16) % len(fallback_messages)
        return fallback_messages[message_index]

    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""You are a supportive health tracking assistant. Generate one brief, encouraging message (1-2 sentences) for someone named {user.nickname} who is tracking their health symptoms and lab results. Be warm, supportive, and motivational about their health journey."""
        
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logging.warning(f"Gemini AI generation failed for user {user.id}: {e}")
        # Fallback to a generic message on failure
        return "You're doing great by staying on top of your health! Keep tracking and stay strong! 💪"

