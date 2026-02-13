# 🚀 Email & SMS Notification Setup Guide

## Quick Start

### 1. Install Dependencies

Open your terminal in the ReminderBot folder and run:

```bash
npm install
```

This will install all required packages:
- Express (web server)
- Nodemailer (email)
- Twilio (SMS)
- and other dependencies

### 2. Get Your Credentials

#### For Email (Gmail - Recommended)

1. Go to your [Google Account](https://myaccount.google.com/)
2. Click **Security** → **2-Step Verification** (enable it if not already)
3. Scroll to **App passwords**
4. Generate a new app password for "Mail"
5. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

#### For SMS (Twilio - Free Trial Available)

1. Sign up at [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Complete the verification
3. From the dashboard, copy:
   - **Account SID** (starts with AC...)
   - **Auth Token**
   - **Phone Number** (starts with +1...)

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Open `.env` and fill in your credentials:

```env
# Server Port
PORT=3000

# Email Configuration (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your.actual.email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Start the Server

```bash
npm start
```

You should see:
```
🚀 Appointment Reminder Server running on port 3000
📧 Email service: gmail
📱 SMS service: Enabled
```

### 5. Open the Application

Open `index.html` in your browser. Now when you schedule appointments:

1. Select date and time
2. Enter appointment subject
3. **NEW:** Enter your email and/or phone number
4. Confirm the appointment

You'll receive:
- ✅ **Immediate confirmation** via email/SMS
- ⏰ **Reminder notification** at the scheduled time

## Testing

### Test Email (Quick Test)

Before scheduling a full appointment, you can test if emails work by checking the server logs when you create an appointment.

### Test SMS

**Important:** Twilio free trial has limitations:
- Can only send to **verified phone numbers**
- To verify a number: Twilio Console → Phone Numbers → Verified Caller IDs

### Troubleshooting

**Server won't start:**
- Make sure you ran `npm install`
- Check that port 3000 is not already in use

**Emails not sending:**
- Double-check your Gmail app password (remove spaces)
- Make sure 2-Step Verification is enabled on your Google account
- Check server console for error messages

**SMS not sending:**
- Verify your phone number in Twilio console (required for free trial)
- Make sure phone number in app includes country code (+1 for US)
- Check Twilio balance/credits

**Frontend can't connect to backend:**
- Make sure the server is running (`npm start`)
- Check browser console for errors
- Verify the server URL is `http://localhost:3000`

## Production Deployment

When deploying to a live server:

1. Update `.env` with production server URL
2. Change `http://localhost:3000` in `script.js` to your actual server URL
3. Use environment variables on your hosting platform
4. Consider using a production email service (SendGrid, AWS SES)

## File Structure

```
ReminderBot/
├── index.html          # Frontend UI
├── styles.css          # Styling
├── script.js           # Frontend logic
├── server.js           # Backend API server
├── package.json        # Dependencies
├── .env                # Your credentials (DO NOT COMMIT!)
├── .env.example        # Template for credentials
└── README_SETUP.md     # This file
```

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` to Git
- Keep your credentials private
- Use app passwords, not your actual Gmail password
- Rotate credentials if they're exposed

## Need Help?

Common issues:
1. **"Module not found"** → Run `npm install`
2. **"Port 3000 in use"** → Change PORT in `.env`
3. **Emails go to spam** → Add your email to contacts
4. **SMS costs money** → Twilio free trial has $15 credit

Enjoy your appointment reminder bot! 🎉
