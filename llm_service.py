"""
LLM Service for Natural Language Appointment Extraction
Uses Google Gemini API with structured JSON output
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, Field, ValidationError
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
from dateutil import parser as date_parser


class AppointmentExtraction(BaseModel):
    """Structured schema for appointment extraction"""
    date: Optional[str] = Field(None, description="Date in YYYY-MM-DD format")
    time: Optional[str] = Field(None, description="Time in HH:MM format (24-hour)")
    subject: Optional[str] = Field(None, description="Appointment subject/title")
    confidence: float = Field(0.0, description="Confidence score 0.0-1.0")
    missing_fields: List[str] = Field(default_factory=list, description="List of missing required fields")
    clarification_needed: Optional[str] = Field(None, description="Question to ask user for clarification")
    error: Optional[str] = Field(None, description="Error message if extraction failed")


class LLMService:
    """Production-grade LLM service with structured output"""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize Gemini API client"""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=self.api_key)
        # Use Gemini 2.0 Flash Exp - unlimited free tier
        self.model = genai.GenerativeModel('gemini-3-flash-preview')
        self.enabled = True
        print("✅ LLM Service initialized with Gemini 3 Flash Preview")
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for appointment extraction"""
        today = datetime.now()
        return f"""You are an appointment scheduling assistant. Extract appointment details from user messages.

Current date and time: {today.strftime('%A, %B %d, %Y at %I:%M %p')}
Current date: {today.strftime('%Y-%m-%d')}

IMPORTANT RULES:
1. Date MUST be in the future (after current date/time)
2. Parse relative dates: "tomorrow", "next Monday", "in 2 days", etc.
3. Parse times: "3pm" = "15:00", "10:30am" = "10:30"
4. If time is missing, ask for clarification
5. If date is missing, ask for clarification
6. Subject should be extracted from context

Return ONLY valid JSON matching this schema:
{{
    "date": "YYYY-MM-DD or null",
    "time": "HH:MM or null",
    "subject": "appointment subject or null",
    "confidence": 0.0-1.0,
    "missing_fields": ["field1", "field2"],
    "clarification_needed": "question to ask user or null",
    "error": "error message or null"
}}

Examples:
- "Dentist tomorrow at 3pm" → {{"date": "{(today + timedelta(days=1)).strftime('%Y-%m-%d')}", "time": "15:00", "subject": "Dentist", "confidence": 0.95, "missing_fields": [], "clarification_needed": null}}
- "Meeting next Monday" → {{"date": "[calculate next Monday]", "time": null, "confidence": 0.7, "missing_fields": ["time"], "clarification_needed": "What time is the meeting?"}}
- "Appointment yesterday" → {{"date": null, "time": null, "confidence": 0.0, "missing_fields": ["date"], "error": "Please provide a future date", "clarification_needed": "When would you like to schedule the appointment? (must be a future date)"}}
"""
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _call_gemini_api(self, user_message: str) -> dict:
        """Call Gemini API with retry logic"""
        try:
            prompt = f"""{self._get_system_prompt()}

User message: "{user_message}"

Extract appointment details and respond with valid JSON only:"""
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            
            json_text = response.text.strip()
            
            # Handle markdown code blocks if present
            if json_text.startswith("```"):
                json_text = json_text.split("```")[1]
                if json_text.startswith("json"):
                    json_text = json_text[4:]
                json_text = json_text.strip()
            
            return json.loads(json_text)
            
        except Exception as e:
            print(f"❌ Gemini API error: {e}")
            raise
    
    def _parse_relative_date(self, date_str: str) -> Optional[str]:
        """Parse relative dates like 'tomorrow', 'next Monday'"""
        try:
            if not date_str:
                return None
            parsed = date_parser.parse(date_str, fuzzy=True)
            if parsed.date() < datetime.now().date():
                return None
            return parsed.strftime('%Y-%m-%d')
        except Exception as e:
            print(f"Date parsing error: {e}")
            return None
    
    def _validate_extraction(self, data: dict) -> AppointmentExtraction:
        """Validate and clean extracted data"""
        try:
            extraction = AppointmentExtraction(**data)
            
            if extraction.date:
                try:
                    date_obj = datetime.strptime(extraction.date, '%Y-%m-%d').date()
                    if date_obj < datetime.now().date():
                        extraction.error = "Date must be in the future"
                        extraction.missing_fields.append("date")
                        extraction.clarification_needed = "Please provide a future date for your appointment."
                except ValueError:
                    extraction.error = "Invalid date format"
                    extraction.missing_fields.append("date")
            
            if not extraction.date:
                if "date" not in extraction.missing_fields:
                    extraction.missing_fields.append("date")
            
            if not extraction.time:
                if "time" not in extraction.missing_fields:
                    extraction.missing_fields.append("time")
            
            if not extraction.subject:
                if "subject" not in extraction.missing_fields:
                    extraction.missing_fields.append("subject")
            
            return extraction
            
        except ValidationError as e:
            print(f"Validation error: {e}")
            return AppointmentExtraction(
                confidence=0.0,
                error="Failed to extract appointment details",
                clarification_needed="Could you please rephrase your appointment request?"
            )
    
    def extract_appointment_details(self, user_message: str) -> AppointmentExtraction:
        """
        Main method to extract appointment details from natural language
        """
        if not user_message or len(user_message.strip()) < 3:
            return AppointmentExtraction(
                confidence=0.0,
                error="Message too short",
                clarification_needed="Please describe your appointment (e.g., 'Dentist tomorrow at 3pm')"
            )
        
        try:
            result = self._call_gemini_api(user_message)
            extraction = self._validate_extraction(result)
            print(f"📊 Extraction result: confidence={extraction.confidence}, missing={extraction.missing_fields}")
            return extraction
            
        except Exception as e:
            print(f"❌ LLM extraction failed: {e}")
            return AppointmentExtraction(
                confidence=0.0,
                error=f"LLM service error: {str(e)}",
                clarification_needed="I'm having trouble understanding. Could you please rephrase using format: 'Subject on Date at Time'?"
            )


# Singleton instance
_llm_service_instance: Optional[LLMService] = None


def get_llm_service() -> Optional[LLMService]:
    """Get or create LLM service singleton"""
    global _llm_service_instance
    
    if _llm_service_instance is None:
        try:
            _llm_service_instance = LLMService()
        except ValueError as e:
            print(f"⚠️ LLM service not available: {e}")
            return None
    
    return _llm_service_instance
