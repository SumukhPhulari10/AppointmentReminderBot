const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

// Email transporter setup
let emailTransporter;
if (process.env.EMAIL_SERVICE === 'gmail') {
    emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
} else {
    emailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
}

// Twilio client setup
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// In-memory storage for scheduled appointments (in production, use a database)
const scheduledAppointments = new Map();

// Helper function to send email
async function sendEmail(to, subject, text, html) {
    try {
        const mailOptions = {
            from: `Appointment Bot <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            text: text,
            html: html
        };

        const info = await emailTransporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

// Helper function to send SMS
async function sendSMS(to, message) {
    try {
        const result = await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        });
        console.log('SMS sent:', result.sid);
        return { success: true, sid: result.sid };
    } catch (error) {
        console.error('Error sending SMS:', error);
        return { success: false, error: error.message };
    }
}

// Format date for display
function formatDateTime(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Schedule appointment with email and SMS
app.post('/api/appointments/schedule', async (req, res) => {
    try {
        const { dateTime, subject, email, phone } = req.body;

        if (!dateTime || !subject) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const appointmentId = Date.now().toString();
        const appointment = {
            id: appointmentId,
            dateTime,
            subject,
            email,
            phone,
            createdAt: new Date().toISOString()
        };

        // Store appointment
        scheduledAppointments.set(appointmentId, appointment);

        // Send confirmation email
        if (email) {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #6366f1;">✅ Appointment Confirmed</h2>
                    <p>Your appointment has been successfully scheduled!</p>
                    <div style="background: #f1f5f9; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #334155;">Appointment Details</h3>
                        <p><strong>Subject:</strong> ${subject}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                    </div>
                    <p>You will receive a reminder notification at the scheduled time.</p>
                    <p style="color: #64748b; font-size: 14px;">- Your Appointment Bot</p>
                </div>
            `;

            await sendEmail(
                email,
                `Appointment Confirmed: ${subject}`,
                `Your appointment "${subject}" is scheduled for ${formatDateTime(dateTime)}`,
                emailHtml
            );
        }

        // Send confirmation SMS
        if (phone) {
            await sendSMS(
                phone,
                `✅ Appointment confirmed!\n\n"${subject}"\n${formatDateTime(dateTime)}\n\nYou'll receive a reminder at the scheduled time.`
            );
        }

        // Schedule reminder (check every minute)
        scheduleReminder(appointment);

        res.json({
            success: true,
            appointmentId,
            message: 'Appointment scheduled successfully'
        });

    } catch (error) {
        console.error('Error scheduling appointment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cancel/Delete appointment
app.delete('/api/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (scheduledAppointments.has(id)) {
            scheduledAppointments.delete(id);
            res.json({ success: true, message: 'Appointment cancelled' });
        } else {
            res.status(404).json({ error: 'Appointment not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update appointment
app.put('/api/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { dateTime, subject, email, phone } = req.body;

        if (!scheduledAppointments.has(id)) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const appointment = scheduledAppointments.get(id);
        appointment.dateTime = dateTime || appointment.dateTime;
        appointment.subject = subject || appointment.subject;
        appointment.email = email || appointment.email;
        appointment.phone = phone || appointment.phone;
        appointment.updatedAt = new Date().toISOString();

        scheduledAppointments.set(id, appointment);

        // Reschedule reminder
        scheduleReminder(appointment);

        res.json({ success: true, appointment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Function to schedule and send reminders
function scheduleReminder(appointment) {
    const appointmentTime = new Date(appointment.dateTime);
    const now = new Date();
    const timeUntil = appointmentTime - now;

    if (timeUntil > 0) {
        setTimeout(async () => {
            console.log(`Sending reminder for appointment: ${appointment.id}`);

            // Send email reminder
            if (appointment.email) {
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #ef4444;">⏰ Appointment Reminder</h2>
                        <p>This is a reminder for your scheduled appointment!</p>
                        <div style="background: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ef4444;">
                            <h3 style="margin-top: 0; color: #991b1b;">Time for your appointment</h3>
                            <p><strong>Subject:</strong> ${appointment.subject}</p>
                            <p><strong>Scheduled Time:</strong> ${formatDateTime(appointment.dateTime)}</p>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">- Your Appointment Bot</p>
                    </div>
                `;

                await sendEmail(
                    appointment.email,
                    `⏰ Reminder: ${appointment.subject}`,
                    `Reminder: Time for "${appointment.subject}"`,
                    emailHtml
                );
            }

            // Send SMS reminder
            if (appointment.phone) {
                await sendSMS(
                    appointment.phone,
                    `⏰ APPOINTMENT REMINDER\n\n"${appointment.subject}"\n\nScheduled for: ${formatDateTime(appointment.dateTime)}\n\nTime to get ready!`
                );
            }

            // Remove from scheduled appointments after sending
            scheduledAppointments.delete(appointment.id);
        }, timeUntil);
    }
}

// Reschedule all existing appointments on server restart
function rescheduleAllAppointments() {
    scheduledAppointments.forEach(appointment => {
        scheduleReminder(appointment);
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Appointment Reminder Server running on port ${PORT}`);
    console.log(`📧 Email service: ${process.env.EMAIL_SERVICE || 'SMTP'}`);
    console.log(`📱 SMS service: ${process.env.TWILIO_PHONE_NUMBER ? 'Enabled' : 'Disabled'}`);
    rescheduleAllAppointments();
});
