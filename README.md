# 📅 Appointment Reminder Bot

An AI-powered, full-featured appointment reminder system with natural language scheduling, email & SMS notifications, and intelligent follow-up reminders.

> Built as part of the **Gen AI for Gen Z** program by **ScaleDown Community** in collaboration with **Intel Unnati & HPE**.

---

## 🌟 Features

### 🤖 AI-Powered Natural Language Scheduling
- **Type naturally** — just say *"Dentist tomorrow at 3pm"* and the bot understands
- Powered by **Google Gemini 3 Flash** LLM for intelligent appointment extraction
- Handles relative dates: *"next Monday"*, *"in 2 days"*, *"this Friday"*
- Asks follow-up questions if details are missing (date, time, subject)
- Falls back gracefully to manual form if NL mode is unavailable

### 📋 Manual Step-by-Step Form (Alternative Mode)
- Interactive calendar with month/year navigation
- 12-hour time picker with AM/PM selector
- Subject and contact info entry

### 🔔 Multi-Channel Notifications
| Channel | When Sent |
|---|---|
| 📧 Confirmation Email | Immediately on booking |
| ⏰ Reminder Email | At exact appointment time |
| ⚠️ Follow-up Email | 2 minutes after appointment |
| 📱 Confirmation SMS | Immediately on booking (if phone provided) |
| 📱 Reminder SMS | At exact appointment time |
| 📱 Follow-up SMS | 2 minutes after appointment |
| 🔔 Browser Notification | At exact appointment time |

### 📋 Appointment Management
- **History Panel** — View all appointments, newest first
- **Update** — Reschedule upcoming appointments
- **Delete/Remove** — Cancel or clear past appointments
- **Status Tracking** — Upcoming vs Past labels

---

## 🛠️ Technology Stack & Engineering Practices

### Frontend
- **HTML5 / CSS3 / JavaScript (ES6+)** — Semantic, responsive UI with glassmorphism design
- **Class-based OOP** — `AppointmentBot` class with prototype extension pattern for NL mode
- **LocalStorage** — Client-side appointment persistence

### Backend
- **Python 3.x + Flask** — RESTful API server
- **APScheduler** — Precise job scheduling for reminders and follow-ups
- **Gmail SMTP** — Secure email delivery via app passwords
- **Twilio** — SMS notifications (optional, configurable)

### AI / LLM Integration
- **Google Gemini 3 Flash Preview** — Natural language appointment extraction
- **Structured JSON output** — Gemini returns validated JSON (date, time, subject, confidence)
- **Pydantic validation** — Schema enforcement on extracted data
- **Tenacity retry logic** — Automatic retry with exponential backoff on API failures
- **Graceful degradation** — Falls back to manual form if LLM is unavailable

### Engineering Patterns Used
- **Service layer pattern** — `LLMService` class isolates all AI logic from Flask routes
- **Singleton pattern** — Single LLM service instance reused across requests
- **Middleware/preprocessing** — Phone number normalization before Twilio API calls
- **Environment-based config** — All credentials via `.env`, never hardcoded
- **Prototype extension** — NL mode extends base bot class without modifying core logic
- **Graceful fallback** — Every external API (Gemini, Twilio, ScaleDown) fails safely

---

## 📁 Project Structure

```
ReminderBot/
├── index.html          # Main UI
├── styles.css          # Styling (glassmorphism, animations)
├── script.js           # Core bot logic (AppointmentBot class)
├── nl_mode.js          # NL mode extension (Gemini integration)
├── app.py              # Flask backend (API, email, SMS, scheduling)
├── llm_service.py      # LLM service layer (Gemini + structured extraction)
├── requirements.txt    # Python dependencies
├── .env                # Environment variables (credentials - never commit)
├── .env.example        # Template for credentials
├── .gitignore          # Git ignore rules
├── README.md           # This file
└── DEPLOY.md           # Render deployment guide
```

---

## 🚀 Local Setup

### Prerequisites
- Python 3.7+
- Gmail account with app password
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com/app/apikey))

### Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment — edit `.env`:**
   ```env
   # Required
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password

   # For AI natural language mode
   GEMINI_API_KEY=your-gemini-api-key

   # Optional — for SMS notifications
   TWILIO_ACCOUNT_SID=your-sid
   TWILIO_AUTH_TOKEN=your-token
   TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
   ```

3. **Run the server:**
   ```bash
   python app.py
   ```

4. **Open in browser:** `http://localhost:10000`

---

## 💡 How to Use

### Natural Language Mode (Default)
1. Type your appointment naturally: *"Doctor appointment next Friday at 11am"*
2. Bot extracts details using Gemini AI and shows a confirmation
3. Enter your email and/or phone number
4. Confirm — done! ✅

### Manual Form Mode
1. Click **"Use Form Instead"** button
2. Pick date from calendar → choose time → enter subject → enter contact info → confirm

---

## 🤖 LLM Architecture

```
User Input (natural language)
        ↓
  nl_mode.js sends to /api/parse-message
        ↓
  llm_service.py → LLMService.extract_appointment_details()
        ↓
  Gemini 3 Flash Preview API call
  (structured JSON output enforced)
        ↓
  Pydantic validation + date/future check
        ↓
  Returns: { date, time, subject, confidence, missing_fields }
        ↓
  If missing fields → bot asks follow-up question
  If complete → shows confirmation card
        ↓
  User confirms → /api/appointments/schedule
        ↓
  APScheduler schedules reminders
  Email + SMS sent immediately
```

---

## 📧 Notification Flow

```
Appointment Booked
    ├── Confirmation Email (instant)
    ├── Confirmation SMS (instant, if phone provided)
    └── Scheduled at appointment time:
            ├── Reminder Email
            ├── Reminder SMS
            ├── Browser Notification
            └── +2 minutes:
                    ├── Follow-up Email
                    └── Follow-up SMS
```

---

## 🔐 Security Notes

- **Never commit `.env`** to Git (already in `.gitignore`)
- **Use Gmail app passwords**, not your actual password
- **Twilio credentials** stored only in `.env`
- **Gemini API key** stored only in `.env`

---

## 📝 Dependencies

```
Flask==3.0.0                    # Web framework
python-dotenv==1.0.0            # Environment variable loading
gunicorn==21.2.0                # Production WSGI server (Render)
APScheduler==3.10.4             # Reminder job scheduling
Flask-CORS==4.0.0               # Cross-origin request handling
google-generativeai             # Gemini LLM API
pydantic                        # Data validation for LLM output
tenacity                        # Retry logic with exponential backoff
python-dateutil                 # Relative date parsing
twilio                          # SMS notifications (optional)
```

---

## 🌐 Deployment (Render)

1. Push code to GitHub
2. Connect GitHub repo to [Render](https://render.com)
3. Set environment variables in Render dashboard
4. Deploy — get a live URL like `https://appointment-bot-xxxx.onrender.com`

See `DEPLOY.md` for detailed steps.

---

## 🆘 Troubleshooting

| Problem | Fix |
|---|---|
| Emails not sending | Check `.env` credentials, verify Gmail app password (16 chars) |
| NL mode not working | Check `GEMINI_API_KEY` in `.env` |
| SMS not sending | Check Twilio credentials, ensure phone is E.164 format (+91XXXXXXXXXX) |
| Port 10000 in use | Change `PORT=10000` in `.env` |
| Browser notifications blocked | Allow notifications in browser site settings |

---

**Made with ❤️ for better appointment management**

Last Updated: February 18, 2026
Version: 3.0 — AI-Powered (Gemini NL + Email + SMS + Smart History)
