"""Shared helpers."""

from typing import Optional
from flask import session
from models import User

def current_user() -> Optional[User]:
    uid = session.get("user_id")
    return User.query.get(uid) if uid else None
