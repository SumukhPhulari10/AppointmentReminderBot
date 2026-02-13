# 🚀 Deploy to Render in 5 Minutes

## Step 1: Get Your Credentials

### Gmail App Password (for Email Notifications)
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App passwords**
4. Generate password for "Mail"
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Twilio (for SMS Notifications) - OPTIONAL
1. Sign up at [twilio.com/try-twilio](https://www.twilio.com/try-twilio) (Free $15 credit)
2. From dashboard, copy:
   - Account SID
   - Auth Token  
   - Phone Number

## Step 2: Deploy to Render

### A. Create GitHub Repository
1. Go to [github.com](https://github.com) and create a new repository
2. Push your ReminderBot code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_GITHUB_URL
   git push -u origin main
   ```

### B. Deploy on Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `appointment-bot` (or your choice)
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Plan:** Free

5. **Add Environment Variables:**
   Click "Environment" tab and add:
   
   | Key | Value |
   |-----|-------|
   | `EMAIL_USER` | your-email@gmail.com |
   | `EMAIL_PASSWORD` | your-app-password |
   | `TWILIO_ACCOUNT_SID` | your-twilio-sid |
   | `TWILIO_AUTH_TOKEN` | your-twilio-token |
   | `TWILIO_PHONE_NUMBER` | +1234567890 |

6. Click **"Create Web Service"**

## Step 3: Use Your Bot!

After deployment (takes 2-3 minutes):

1. Render will give you a URL like: `https://appointment-bot-xxxx.onrender.com`
2. **Share that URL with anyone!** They can now:
   - Schedule appointments
   - Get email reminders
   - Get SMS reminders
   - No setup needed!

## Testing

1. Visit your Render URL
2. Schedule an appointment for 1-2 minutes from now
3. Enter your email/phone
4. Check your inbox and phone!

## Important Notes

### Free Tier Limitations
- **Render Free:** Server sleeps after 15 min of inactivity (restarts automatically)
- **Twilio Free:** Can only send SMS to verified numbers
  - Verify at: Twilio Console → Phone Numbers → Verified Caller IDs

### Cost
- **Render:** FREE (with some limitations)
- **Gmail:** FREE
- **Twilio:** Free $15 credit (then pay-as-you-go, very cheap)

## Troubleshooting

**Deployment fails:**
- Check build logs in Render dashboard
- Ensure `requirements.txt` and `app.py` are in root directory

**Email not working:**
- Double-check Gmail app password (no spaces)
- Ensure 2-step verification is enabled

**SMS not working:**
- Verify phone numbers in Twilio console (free tier requirement)
- Check Twilio credit balance

**Server sleeping:**
- Free tier sleeps after inactivity
- Upgrade to paid plan ($7/month) for always-on

## That's It!

Your bot is now live and accessible to anyone at your Render URL. No server management needed! 🎉

### What Users Can Do:
✅ Schedule appointments  
✅ Get email confirmations  
✅ Get SMS confirmations  
✅ Receive email reminders  
✅ Receive SMS reminders  
✅ View/update/delete appointments  

All from their browser, no setup required!
