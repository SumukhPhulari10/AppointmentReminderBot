from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from twilio.rest import Client
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
EMAIL_SERVICE = os.getenv('EMAIL_SERVICE', 'gmail')

# Twilio is optional - only initialize if credentials provided
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')

twilio_client = None
sms_enabled = False

# Only initialize Twilio if all credentials are provided
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER:
    try:
        from twilio.rest import Client
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        sms_enabled = True
        print("✅ SMS notifications enabled")
    except Exception as e:
        print(f"⚠️ Twilio not available: {e}")
        sms_enabled = False
else:
    print("ℹ️ SMS notifications disabled (no Twilio credentials)")

# Scheduler for reminders
scheduler = BackgroundScheduler()
scheduler.start()

# In-memory storage for scheduled jobs
scheduled_jobs = {}

def send_email(to_email, subject, html_content):
    """Send email using Gmail SMTP"""
    try:
        print(f"[DEBUG] Attempting to send email to {to_email}")
        print(f"[DEBUG] Using EMAIL_USER: {EMAIL_USER}")
        print(f"[DEBUG] EMAIL_PASSWORD set: {bool(EMAIL_PASSWORD)}")
        
        msg = MIMEMultipart('alternative')
        msg['From'] = f"Appointment Bot <{EMAIL_USER}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        print("[DEBUG] Connecting to Gmail SMTP...")
        # Connect to Gmail SMTP
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            print("[DEBUG] Connected! Attempting login...")
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            print("[DEBUG] Login successful! Sending message...")
            server.send_message(msg)
            print("[DEBUG] Message sent successfully!")
        
        print(f"✅ Email sent to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Authentication Error: {e}")
        print("   Check: 1) Email is correct, 2) App password is correct (not regular password)")
        return False
    except smtplib.SMTPException as e:
        print(f"❌ SMTP Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error sending email: {e}")
        import traceback
        traceback.print_exc()
        return False

def send_sms(to_phone, message):
    """Send SMS using Twilio (if enabled)"""
    if not sms_enabled or not twilio_client:
        print("SMS not enabled - skipping")
        return False
        
    try:
        message = twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone
        )
        print(f"SMS sent to {to_phone}: {message.sid}")
        return True
    except Exception as e:
        print(f"Error sending SMS: {e}")
        return False

def format_datetime(iso_string):
    """Format ISO datetime string for display"""
    dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
    return dt.strftime('%A, %B %d, %Y at %I:%M %p')

def send_reminder(appointment_id, subject, email, phone, datetime_str):
    """Send reminder via email and SMS"""
    print(f"Sending reminder for: {subject}")
    
    # Send email reminder
    if email:
        email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">⏰ Appointment Reminder</h2>
            <p>This is your scheduled appointment reminder!</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <h3 style="margin-top: 0; color: #991b1b;">Time for your appointment</h3>
                <p><strong>Subject:</strong> {subject}</p>
                <p><strong>Scheduled Time:</strong> {format_datetime(datetime_str)}</p>
            </div>
            <p style="color: #64748b; font-size: 14px;">- Your Appointment Bot</p>
        </div>
        """
        send_email(email, f"⏰ Reminder: {subject}", email_html)
    
    # Send SMS reminder
    if phone:
        sms_message = f"⏰ APPOINTMENT REMINDER\n\n\"{subject}\"\n\nScheduled for: {format_datetime(datetime_str)}\n\nTime to get ready!"
        send_sms(phone, sms_message)
    
    # Schedule follow-up "late" reminder for 2 minutes after
    if email:  # Only send late reminder if email is provided
        from datetime import timedelta
        reminder_time = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        late_reminder_time = reminder_time + timedelta(minutes=2)
        
        scheduler.add_job(
            send_late_reminder,
            'date',
            run_date=late_reminder_time,
            args=[subject, email, datetime_str]
        )
        print(f"[INFO] Late reminder scheduled for {late_reminder_time}")
    
    # Clean up scheduled job
    if appointment_id in scheduled_jobs:
        del scheduled_jobs[appointment_id]

def send_late_reminder(subject, email, datetime_str):
    """Send a follow-up reminder 2 minutes after appointment time"""
    print(f"Sending late reminder for: {subject}")
    
    late_email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Appointment Follow-up</h2>
        <p>This is a follow-up reminder for your appointment that was scheduled 2 minutes ago.</p>
        <div style="background: #fee2e2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #991b1b;">Were you able to attend?</h3>
            <p><strong>Subject:</strong> {subject}</p>
            <p><strong>Scheduled Time:</strong> {format_datetime(datetime_str)}</p>
            <p style="margin-top: 15px; font-size: 14px;">If you missed this appointment, please reschedule at your earliest convenience.</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">- Your Appointment Bot</p>
    </div>
    """
    send_email(email, f"⚠️ Follow-up: {subject}", late_email_html)

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('.', path)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.now().isoformat(),
        'email_configured': EMAIL_USER is not None,
        'sms_enabled': sms_enabled
    })

@app.route('/api/appointments/schedule', methods=['POST'])
def schedule_appointment():
    """Schedule a new appointment with email/SMS notifications"""
    try:
        data = request.json
        appointment_datetime = data.get('dateTime')
        subject = data.get('subject')
        email = data.get('email')
        phone = data.get('phone')
        
        if not appointment_datetime or not subject:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Generate appointment ID
        appointment_id = f"{datetime.now().timestamp()}"
        
        # Send confirmation email
        if email:
            confirmation_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #6366f1;">✅ Appointment Confirmed</h2>
                <p>Your appointment has been successfully scheduled!</p>
                <div style="background: #f1f5f9; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #334155;">Appointment Details</h3>
                    <p><strong>Subject:</strong> {subject}</p>
                    <p><strong>Date & Time:</strong> {format_datetime(appointment_datetime)}</p>
                </div>
                <p>You will receive a reminder notification at the scheduled time.</p>
                <p style="color: #64748b; font-size: 14px;">- Your Appointment Bot</p>
            </div>
            """
            send_email(email, f"Appointment Confirmed: {subject}", confirmation_html)
        
        # Send confirmation SMS
        if phone:
            confirmation_sms = f"✅ Appointment confirmed!\n\n\"{subject}\"\n{format_datetime(appointment_datetime)}\n\nYou'll receive a reminder at the scheduled time."
            send_sms(phone, confirmation_sms)
        
        # Schedule reminder
        reminder_time = datetime.fromisoformat(appointment_datetime.replace('Z', '+00:00'))
        job = scheduler.add_job(
            send_reminder,
            'date',
            run_date=reminder_time,
            args=[appointment_id, subject, email, phone, appointment_datetime]
        )
        scheduled_jobs[appointment_id] = job
        
        return jsonify({
            'success': True,
            'appointmentId': appointment_id,
            'message': 'Appointment scheduled successfully'
        })
        
    except Exception as e:
        print(f"Error scheduling appointment: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/appointments/<appointment_id>', methods=['DELETE'])
def cancel_appointment(appointment_id):
    """Cancel a scheduled appointment"""
    try:
        if appointment_id in scheduled_jobs:
            scheduled_jobs[appointment_id].remove()
            del scheduled_jobs[appointment_id]
            return jsonify({'success': True, 'message': 'Appointment cancelled'})
        else:
            return jsonify({'error': 'Appointment not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 10000))
    print(f"\n{'='*60}")
    print(f"🚀 Appointment Reminder Bot Server Starting...")
    print(f"{'='*60}")
    print(f"📧 Email notifications: {'✅ Enabled' if EMAIL_USER else '❌ Disabled'}")
    print(f"📱 SMS notifications: {'✅ Enabled' if sms_enabled else '❌ Disabled'}")
    print(f"{'='*60}")
    print(f"🌐 Access your bot at: http://localhost:{port}")
    print(f"{'='*60}\n")
    app.run(host='0.0.0.0', port=port, debug=False)
