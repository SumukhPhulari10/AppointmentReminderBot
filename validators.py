"""
Validation utilities for appointment data
"""

import re
from datetime import datetime
from typing import Tuple


def validate_datetime(date_str: str, time_str: str) -> Tuple[bool, str]:
    """
    Validate date and time strings
    
    Args:
        date_str: Date in YYYY-MM-DD format
        time_str: Time in HH:MM format (24-hour)
        
    Returns:
        (is_valid, error_message)
    """
    try:
        # Parse date
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Parse time
        time_obj = datetime.strptime(time_str, '%H:%M').time()
        
        # Just validate the format — any date/time is allowed
        datetime.combine(date_obj, time_obj)  # will raise ValueError if invalid
        
        return True, ""
        
    except ValueError as e:
        return False, f"Invalid date or time format: {str(e)}"


def is_future_datetime(datetime_str: str) -> bool:
    """
    Check if datetime string represents a future time
    
    Args:
        datetime_str: ISO format datetime string
        
    Returns:
        True if future, False otherwise
    """
    try:
        dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        return dt > datetime.now()
    except Exception:
        return False


def sanitize_user_input(text: str, max_length: int = 500) -> str:
    """
    Sanitize user input text
    
    Args:
        text: User input string
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
    """
    if not text:
        return ""
    
    # Strip whitespace
    text = text.strip()
    
    # Limit length
    if len(text) > max_length:
        text = text[:max_length]
    
    # Remove potentially dangerous characters (basic XSS prevention)
    text = text.replace('<', '').replace('>', '')
    
    return text


def validate_email(email: str) -> bool:
    """
    Validate email format
    
    Args:
        email: Email address string
        
    Returns:
        True if valid format, False otherwise
    """
    if not email:
        return False
    
    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """
    Validate phone number format
    
    Args:
        phone: Phone number string
        
    Returns:
        True if valid format, False otherwise
    """
    if not phone:
        return False
    
    # Remove common separators
    clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
    
    # Check if it's all digits and reasonable length
    return clean_phone.isdigit() and 10 <= len(clean_phone) <= 15


def validate_appointment_data(data: dict) -> Tuple[bool, str]:
    """
    Validate complete appointment data
    
    Args:
        data: Dictionary with appointment fields
        
    Returns:
        (is_valid, error_message)
    """
    # Check required fields
    if not data.get('date'):
        return False, "Date is required"
    
    if not data.get('time'):
        return False, "Time is required"
    
    if not data.get('subject'):
        return False, "Subject is required"
    
    # Validate datetime
    is_valid, error = validate_datetime(data['date'], data['time'])
    if not is_valid:
        return False, error
    
    # Validate email if provided
    if data.get('email') and not validate_email(data['email']):
        return False, "Invalid email format"
    
    # Validate phone if provided
    if data.get('phone') and not validate_phone(data['phone']):
        return False, "Invalid phone number format"
    
    return True, ""
