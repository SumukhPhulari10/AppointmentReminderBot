# 📅 Appointment Reminder Bot

A professional, full-featured appointment reminder system with email notifications, browser alerts, and intelligent follow-up reminders.

## 🌟 Features

### Core Functionality
- **🤖 Conversational UI** - Friendly chat-based interface that guides users through scheduling
- **📅 Custom Date Picker** - Interactive calendar with month/year navigation
- **⏰ Smart Time Selection** - 12-hour format with AM/PM selector
- **💬 Appointment Details** - Subject and notes for each appointment
- **🔔 Multi-Channel Notifications**:
  - Browser notifications (instant, at scheduled time)
  - Email confirmations (immediate)
  - Email reminders (at scheduled time)
  - **NEW:** Automatic follow-up email 2 minutes after appointment time

### Management Features
- **📋 Appointment History** - View all scheduled appointments
- **✏️ Update Appointments** - Reschedule existing appointments
- **🗑️ Delete Appointments** - Cancel appointments with confirmation
- **📊 Status Tracking** - Shows "Upcoming" or "Past" status for each appointment

### Email System
- ✅ **Confirmation Email** - Sent immediately when appointment is scheduled
- ⏰ **Reminder Email** - Sent at the exact appointment time
- ⚠️ **Late Follow-up Email** - Automatically sent 2 minutes after appointment to check if user attended
- 📧 Uses Gmail SMTP (secure app passwords)

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Semantic structure
- **CSS3** - Modern, responsive design with glassmorphism effects
- **JavaScript (ES6+)** - Dynamic interactions and browser notifications

### Backend
- **Python 3.x** - Server-side logic
- **Flask** - Web framework and API
- **APScheduler** - Automated reminder scheduling
- **SMTP** - Email delivery via Gmail

### Storage
- **LocalStorage** - Client-side appointment persistence
- **In-Memory** - Server-side job scheduling (can be upgraded to database)

## 📁 Project Structure

```
ReminderBot/
├── index.html          # Main UI
├── styles.css          # Styling
├── script.js           # Frontend logic
├── app.py              # Python Flask backend
├── requirements.txt    # Python dependencies
├── .env                # Environment variables (your credentials)
├── .env.example        # Template for credentials
├── .gitignore          # Git ignore rules
├── README.md           # This file
├── DEPLOY.md           # Render deployment guide
└── PORT_ISSUE.md       # Why Live Server doesn't work
```

## 🚀 Local Setup

### Prerequisites
- Python 3.7+
- Gmail account with app password

### Installation

1. **Clone or download this repository**

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Get Gmail App Password:**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification
   - Generate App Password for "Mail"
   - Copy the 16-character password

4. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Update with your credentials:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   ```

5. **Run the server:**
   ```bash
   python app.py
   ```

6. **Access the bot:**
   - Open browser: `http://localhost:10000`
   - That's it! 🎉

## 💡 How to Use

1. **Click "Schedule New Appointment"**
2. **Select date** from the calendar
3. **Choose time** (hour, minute, AM/PM)
4. **Enter appointment subject**
5. **Provide your email** (optional but recommended)
6. **Confirm** and you're done!

### What Happens Next:
- ✅ **Immediate:** Confirmation email sent to your inbox
- ⏰ **At scheduled time:** Reminder email + browser notification
- ⚠️ **2 minutes later:** Follow-up email checking if you attended

## 🌐 Why Port 10000?

The appointment bot runs on **port 10000** (not Live Server port 5500) because:

1. **Flask serves both** frontend (HTML/CSS/JS) and backend (Python API)
2. **Email functionality requires** the Python backend to be running
3. **API calls** from frontend need to reach the Flask server
4. **Live Server** only displays files, can't send emails or run Python

**Think of it this way:**
- Live Server = Picture frame (display only)
- Flask Server = Smart device (display + functionality)

## 🚀 Deployment (Render)

This bot is **deployment-ready** for Render (free hosting):

### Quick Deploy Steps:
1. Push code to GitHub
2. Connect GitHub to Render
3. Set environment variables (email credentials)
4. Deploy! ✨

**Detailed Guide:** See `DEPLOY.md` for complete step-by-step instructions.

### After Deployment:
- Get a live URL like: `https://appointment-bot-xxxx.onrender.com`
- Share with anyone - they can use it without setup
- Emails work automatically
- No server management needed

## ✨ Current Status

- ✅ **Fully functional locally** on `http://localhost:10000`
- ✅ **Email system working** with Gmail SMTP
- ✅ **All features tested** and operational
- ✅ **Ready for Render deployment**
- ⏳ **SMS notifications** - Optional (Twilio not configured)

## 📧 Email Features in Detail

### 1. Confirmation Email
```
Subject: ✅ Appointment Confirmed: [Your Subject]
Sent: Immediately after scheduling
Contains: Appointment details, date, time
```

### 2. Reminder Email
```
Subject: ⏰ Reminder: [Your Subject]
Sent: At exact appointment time
Contains: Appointment details, scheduled time
```

### 3. Late Follow-up Email (NEW!)
```
Subject: ⚠️ Follow-up: [Your Subject]
Sent: 2 minutes after appointment time
Contains: Reminder about missed appointment, reschedule prompt
```

## 🔐 Security Notes

- **Never commit `.env`** to Git (already in `.gitignore`)
- **Use app passwords**, not your actual Gmail password
- **Keep credentials private**
- **Rotate passwords** if exposed

## 📝 Dependencies

```python
Flask==3.0.0              # Web framework
python-dotenv==1.0.0      # Environment variables
gunicorn==21.2.0          # Production server (for Render)
APScheduler==3.10.4       # Job scheduling
Flask-CORS==4.0.0         # Cross-origin requests

# Optional (for SMS):
# twilio==8.10.0
```

## 🤝 Contributing

Feel free to fork, modify, and enhance! Some ideas:
- Add database support (PostgreSQL/MongoDB)
- Implement user authentication
- Add recurring appointments
- SMS notifications via Twilio
- Calendar export (iCal)

## 📄 License

MIT License - Free to use and modify!

## 🆘 Troubleshooting

### Emails not sending?
- Check `.env` file exists with correct credentials
- Verify Gmail app password (16 characters, no spaces)
- Ensure 2-step verification enabled on Google account
- Check terminal for error messages

### Port 10000 already in use?
- Change `PORT=10000` in `.env` to another port
- Or stop the other service using port 10000

### Browser notifications not working?
- Allow notifications when browser prompts
- Check browser settings → Site permissions

### Can't access on port 5500?
- Don't use Live Server! Read `PORT_ISSUE.md`
- Use Flask server on port 10000 instead

## 📬 Contact & Support

For issues, questions, or suggestions, feel free to:
- Open an issue on GitHub
- Check `DEPLOY.md` for deployment help
- Read `PORT_ISSUE.md` for server questions

---

**Made with ❤️ for better appointment management**

Last Updated: February 13, 2026
Version: 2.0 (Python Flask + Email + Late Reminders)
