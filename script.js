// Appointment Bot Logic
class AppointmentBot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.inputArea = document.getElementById('inputArea');
        this.currentStep = 'initial';
        this.appointmentData = {
            date: null,
            time: null,
            subject: null,
            email: null,
            phone: null
        };
        this.selectedDate = null;
        this.selectedHour = null;
        this.selectedMinute = null;
        this.selectedPeriod = null;
        this.currentMonth = new Date();
        this.editingAppointmentId = null;
        this.notificationTimeouts = {};

        this.init();
    }

    init() {
        // Request notification permission
        if ('Notification' in window) {
            Notification.requestPermission();
        }

        // Reschedule existing appointments on page load
        this.rescheduleExistingAppointments();

        // Show initial buttons
        this.showInitialButtons();
    }

    rescheduleExistingAppointments() {
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        const now = new Date();

        appointments.forEach((apt, index) => {
            const appointmentDateTime = new Date(apt.dateTime);
            const timeUntilAppointment = appointmentDateTime - now;

            if (timeUntilAppointment > 0) {
                // Schedule notification
                this.notificationTimeouts[index] = setTimeout(() => {
                    this.sendNotificationForAppointment(apt);
                }, timeUntilAppointment);
            }
        });
    }

    addMessage(text, isUser = false, includeHTML = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (includeHTML) {
            contentDiv.innerHTML = `<p>${text}</p>${includeHTML}`;
        } else {
            contentDiv.innerHTML = `<p>${text}</p>`;
        }

        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showInitialButtons() {
        const buttonsHTML = `
            <div class="button-group">
                <button class="btn btn-primary" onclick="bot.startAppointment()">Schedule New Appointment</button>
                <button class="btn btn-secondary" onclick="bot.viewHistory()">📋 View History</button>
                <button class="btn btn-secondary" onclick="bot.showHelp()">How it works</button>
            </div>
        `;
        this.inputArea.innerHTML = buttonsHTML;
    }

    viewHistory() {
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');

        if (appointments.length === 0) {
            // Show empty state in the history panel itself
            document.getElementById('chatMessages').style.display = 'none';
            document.getElementById('historyPanel').style.display = 'flex';
            document.getElementById('historyPanel').style.flexDirection = 'column';
            document.getElementById('historyPanelContent').innerHTML = `
                <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                    <p style="font-size: 16px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">No appointments yet</p>
                    <p style="font-size: 14px;">Schedule your first one to see it here!</p>
                </div>
            `;
            this.inputArea.innerHTML = `
                <div class="button-group">
                    <button class="btn btn-primary" onclick="bot.backToMenu(); bot.startAppointment()">+ Schedule Now</button>
                    <button class="btn btn-secondary" onclick="bot.backToMenu()">← Back</button>
                </div>
            `;
            return;
        }

        // Hide chat, show history panel
        document.getElementById('chatMessages').style.display = 'none';
        document.getElementById('historyPanel').style.display = 'flex';
        document.getElementById('historyPanel').style.flexDirection = 'column';

        const now = new Date();
        let historyHTML = '';

        // Create indexed copy and sort newest first, preserving original indices
        const sorted = appointments
            .map((apt, index) => ({ apt, index }))
            .sort((a, b) => {
                const dateA = new Date(a.apt.dateTime || a.apt.date);
                const dateB = new Date(b.apt.dateTime || b.apt.date);
                return dateB - dateA; // newest first
            });

        sorted.forEach(({ apt, index }) => {
            let appointmentDateTime;

            // Handle appointments with or without dateTime field
            if (apt.dateTime) {
                appointmentDateTime = new Date(apt.dateTime);
            } else {
                // Legacy appointments - construct from date and time
                appointmentDateTime = new Date(apt.date);
                const timeParts = apt.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
                if (timeParts) {
                    let hour = parseInt(timeParts[1]);
                    const minute = parseInt(timeParts[2]);
                    const period = timeParts[3].toUpperCase();

                    if (period === 'PM' && hour !== 12) {
                        hour += 12;
                    } else if (period === 'AM' && hour === 12) {
                        hour = 0;
                    }

                    appointmentDateTime.setHours(hour, minute, 0, 0);
                }
            }

            const isPast = appointmentDateTime < now;
            const dateStr = appointmentDateTime.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            historyHTML += `
                <div class="history-item ${isPast ? 'past-appointment' : ''}">
                    <div class="history-header">
                        <span class="history-status">${isPast ? '🕓 Past' : '⏰ Upcoming'}</span>
                        <span class="history-date">${dateStr} at ${apt.time}</span>
                    </div>
                    <div class="history-subject">${apt.subject}</div>
                    <div class="history-actions">
                        ${!isPast ? `
                            <button class="btn-small btn-primary" onclick="bot.updateAppointment(${index})">✏️ Update</button>
                            <button class="btn-small btn-danger" onclick="bot.deleteAppointment(${index})">🗑️ Delete</button>
                        ` : `
                            <button class="btn-small btn-danger" onclick="bot.deleteAppointment(${index})">🗑️ Remove</button>
                        `}
                    </div>
                </div>
            `;
        });

        document.getElementById('historyPanelContent').innerHTML = historyHTML;

        const buttonsHTML = `
            <div class="button-group">
                <button class="btn btn-secondary" onclick="bot.backToMenu()">← Back to Menu</button>
            </div>
        `;
        this.inputArea.innerHTML = buttonsHTML;
    }

    backToMenu() {
        // Show chat, hide history panel
        document.getElementById('chatMessages').style.display = 'flex';
        document.getElementById('historyPanel').style.display = 'none';

        // Restore NL input if available, otherwise fall back to manual buttons
        if (typeof this.showNLInput === 'function') {
            this.showNLInput();
        } else {
            this.showInitialButtons();
        }
    }

    deleteAppointment(index) {
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        const appointment = appointments[index];

        if (!confirm(`Are you sure you want to delete this appointment?\n\n"${appointment.subject}"`)) {
            return;
        }

        // Clear the notification timeout
        if (this.notificationTimeouts[index]) {
            clearTimeout(this.notificationTimeouts[index]);
            delete this.notificationTimeouts[index];
        }

        // Remove appointment
        appointments.splice(index, 1);
        localStorage.setItem('appointments', JSON.stringify(appointments));

        // Check if we're in the history panel view
        const historyPanel = document.getElementById('historyPanel');
        const isHistoryView = historyPanel.style.display !== 'none';

        // Refresh history view
        if (appointments.length > 0 && isHistoryView) {
            // Refresh the history panel
            this.viewHistory();
        } else if (appointments.length === 0 && isHistoryView) {
            // No more appointments, go back to menu
            this.backToMenu();
        } else {
            // We're in chat view (shouldn't happen but handle it)
            this.addMessage(`✓ Appointment "${appointment.subject}" has been deleted.`, false);
            this.showInitialButtons();
        }
    }

    updateAppointment(index) {
        this.editingAppointmentId = index;
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        const appointment = appointments[index];

        // Switch back to chat view for the update flow
        document.getElementById('chatMessages').style.display = 'flex';
        document.getElementById('historyPanel').style.display = 'none';

        this.addMessage(`Updating appointment: "${appointment.subject}"`, false);
        this.addMessage("Let's reschedule. Please select a new date:", false);

        this.currentStep = 'date';
        this.showDatePicker();
    }

    showHelp() {
        this.addMessage("Here's how I can help you:", false);
        this.addMessage("1️⃣ Click 'Schedule New Appointment' to get started\n2️⃣ Select your preferred date from the calendar\n3️⃣ Choose the time (hours, minutes, AM/PM)\n4️⃣ Enter the appointment subject\n5️⃣ Confirm and receive a notification at the scheduled time!", false);
    }

    startAppointment() {
        this.currentStep = 'date';
        this.addMessage("Great! Let's schedule your appointment.", false);
        this.addMessage("First, please select a date for your appointment:", false);
        this.showDatePicker();
    }

    showDatePicker() {
        const pickerHTML = `
            <div class="picker-container">
                <div class="picker-title">📅 Select Date</div>
                <div class="month-nav">
                    <button onclick="bot.changeMonth(-1)">← Prev</button>
                    <span id="currentMonth">${this.getMonthYear()}</span>
                    <button onclick="bot.changeMonth(1)">Next →</button>
                </div>
                <div id="dateGrid" class="date-grid"></div>
                <div class="step-actions" style="margin-top: 16px;">
                    <button class="btn btn-secondary step-back-btn" onclick="bot.goBackToMenu()">← Back</button>
                    <button class="btn btn-primary" onclick="bot.confirmDate()" id="confirmDateBtn" disabled>Confirm Date ✓</button>
                </div>
            </div>
        `;
        this.inputArea.innerHTML = pickerHTML;
        this.renderCalendar();
    }

    getMonthYear() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
    }

    changeMonth(direction) {
        this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + direction, 1);
        document.getElementById('currentMonth').textContent = this.getMonthYear();
        this.renderCalendar();
    }

    renderCalendar() {
        const dateGrid = document.getElementById('dateGrid');
        dateGrid.innerHTML = '';

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Add day headers
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.style.cssText = 'color: var(--text-muted); font-size: 11px; text-align: center; padding: 8px 4px; font-weight: 600;';
            dayHeader.textContent = day;
            dateGrid.appendChild(dayHeader);
        });

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            dateGrid.appendChild(emptyCell);
        }

        // Add day buttons
        for (let day = 1; day <= daysInMonth; day++) {
            const dateBtn = document.createElement('button');
            dateBtn.className = 'date-btn';
            dateBtn.textContent = day;

            const currentDate = new Date(year, month, day);

            // Disable past dates
            if (currentDate < today) {
                dateBtn.disabled = true;
            } else {
                dateBtn.onclick = () => this.selectDate(year, month, day, dateBtn);
            }

            dateGrid.appendChild(dateBtn);
        }
    }

    selectDate(year, month, day, element) {
        // Remove previous selection
        document.querySelectorAll('.date-btn.selected').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Add selection to clicked button
        element.classList.add('selected');

        this.selectedDate = new Date(year, month, day);
        document.getElementById('confirmDateBtn').disabled = false;
    }

    confirmDate() {
        if (!this.selectedDate) return;

        const dateStr = this.selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        this.appointmentData.date = this.selectedDate;
        this.addMessage(`📅 ${dateStr}`, true);
        this.addMessage("Perfect! Now, let's select the time for your appointment.", false);
        this.currentStep = 'time';
        this.showTimePicker();
    }

    showTimePicker() {
        // Build hour buttons (1-12) in a 4-column grid
        let hoursHTML = '';
        for (let i = 1; i <= 12; i++) {
            hoursHTML += `<button class="time-grid-btn" onclick="bot.selectHour(${i}, this)">${i}</button>`;
        }

        // All 60 minutes as a native scrollable select — works perfectly on mobile
        let minuteOptions = '';
        for (let i = 0; i < 60; i++) {
            const val = i.toString().padStart(2, '0');
            minuteOptions += `<option value="${val}">${val}</option>`;
        }

        const pickerHTML = `
            <div class="picker-container">
                <div class="picker-title">⏰ Select Time</div>

                <div class="time-section-block">
                    <div class="time-label">Hour</div>
                    <div class="time-grid" id="hourScroll">${hoursHTML}</div>
                </div>

                <div class="time-section-block">
                    <div class="time-label">Minute (00 – 59)</div>
                    <select class="minute-select" id="minuteSelect" onchange="bot.selectMinuteFromSelect(this.value)">
                        <option value="" disabled selected>— pick a minute —</option>
                        ${minuteOptions}
                    </select>
                </div>

                <div class="time-section-block">
                    <div class="time-label">AM / PM</div>
                    <div class="ampm-toggle">
                        <button class="ampm-btn" id="amBtn" onclick="bot.selectPeriod('AM', this)">AM</button>
                        <button class="ampm-btn" id="pmBtn" onclick="bot.selectPeriod('PM', this)">PM</button>
                    </div>
                </div>

                <div class="time-preview" id="timePreview">Select hour, minute &amp; AM/PM</div>

                <div class="step-actions" style="margin-top:14px;">
                    <button class="btn btn-secondary step-back-btn" onclick="bot.goBackToDate()">← Back</button>
                    <button class="btn btn-primary" onclick="bot.confirmTime()" id="confirmTimeBtn" disabled>✓ Confirm Time</button>
                </div>
            </div>
        `;
        this.inputArea.innerHTML = pickerHTML;
    }

    selectMinuteFromSelect(value) {
        this.selectedMinute = value;
        this.updateTimePreview();
        this.checkTimeSelection();
    }

    selectHour(hour, element) {
        document.querySelectorAll('#hourScroll .time-grid-btn').forEach(btn => btn.classList.remove('selected'));
        element.classList.add('selected');
        this.selectedHour = hour;
        this.updateTimePreview();
        this.checkTimeSelection();
    }

    selectMinute(minute, element) {
        // kept for compatibility (no longer used in grid but in case needed)
        document.querySelectorAll('#minuteScroll .time-grid-btn').forEach(btn => btn.classList.remove('selected'));
        if (element) element.classList.add('selected');
        this.selectedMinute = minute;
        this.updateTimePreview();
        this.checkTimeSelection();
    }

    selectPeriod(period, element) {
        document.querySelectorAll('.ampm-btn').forEach(btn => btn.classList.remove('selected'));
        element.classList.add('selected');
        this.selectedPeriod = period;
        this.updateTimePreview();
        this.checkTimeSelection();
    }

    updateTimePreview() {
        const preview = document.getElementById('timePreview');
        if (!preview) return;
        const h = this.selectedHour || '?';
        const m = this.selectedMinute || '?';
        const p = this.selectedPeriod || '?';
        if (this.selectedHour && this.selectedMinute && this.selectedPeriod) {
            preview.textContent = `⏰ ${h}:${m} ${p}`;
            preview.classList.add('ready');
        } else {
            preview.textContent = `${h}:${m} ${p}`;
            preview.classList.remove('ready');
        }
    }

    checkTimeSelection() {
        const confirmBtn = document.getElementById('confirmTimeBtn');
        if (this.selectedHour !== null && this.selectedMinute !== null && this.selectedPeriod !== null) {
            if (confirmBtn) confirmBtn.disabled = false;
        }
    }

    confirmTime() {
        if (this.selectedHour === null || this.selectedMinute === null || this.selectedPeriod === null) return;

        const timeStr = `${this.selectedHour}:${this.selectedMinute} ${this.selectedPeriod}`;
        this.appointmentData.time = {
            hour: this.selectedHour,
            minute: this.selectedMinute,
            period: this.selectedPeriod
        };

        this.addMessage(`🕐 ${timeStr}`, true);
        this.addMessage("Excellent! Now, please enter the subject or reason for this appointment:", false);
        this.currentStep = 'subject';
        this.showSubjectInput();
    }

    showSubjectInput() {
        const inputHTML = `
            <div class="input-group">
                <label class="input-label">📝 What's the appointment for?</label>
                <input type="text" class="chat-input" id="subjectInput" 
                       placeholder="e.g., Doctor's appointment, Team meeting, Dentist..." 
                       maxlength="100" autocomplete="off">
                <p class="input-hint">Keep it short so it's easy to read in your reminder</p>
                <div class="step-actions" style="margin-top: 12px;">
                    <button class="btn btn-secondary step-back-btn" onclick="bot.goBackToTime()">← Back</button>
                    <button class="btn btn-primary" onclick="bot.confirmSubject()">Continue →</button>
                </div>
            </div>
        `;
        this.inputArea.innerHTML = inputHTML;
        document.getElementById('subjectInput').focus();

        // Allow Enter key to submit
        document.getElementById('subjectInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.confirmSubject();
            }
        });
    }

    confirmSubject() {
        const subject = document.getElementById('subjectInput').value.trim();
        if (!subject) {
            alert('Please enter a subject for your appointment.');
            return;
        }

        this.appointmentData.subject = subject;
        this.addMessage(subject, true);
        this.showContactInput();
    }

    showContactInput() {
        this.addMessage("Great! Now, let me know how you'd like to receive reminders:", false);
        this.addMessage("Enter your contact details for email and/or SMS notifications:", false);

        const inputHTML = `
            <div class="input-group">
                <div style="margin-bottom: 12px;">
                    <label class="input-label">📧 Email Address (Optional)</label>
                    <input type="email" class="chat-input" id="emailInput" 
                           placeholder="your.email@example.com">
                    <p class="input-hint">You'll receive confirmation and reminder emails</p>
                </div>
                <div style="margin-bottom: 12px;">
                    <label class="input-label">📱 Phone Number (Optional)</label>
                    <input type="tel" class="chat-input" id="phoneInput" 
                           placeholder="+91XXXXXXXXXX (include country code)">
                    <p class="input-hint">For SMS reminders — include country code (e.g. +91 for India)</p>
                </div>
                <div class="step-actions" style="margin-top: 16px;">
                    <button class="btn btn-secondary step-back-btn" onclick="bot.goBackToSubject()">← Back</button>
                    <button class="btn btn-primary" onclick="bot.confirmContact()">Continue →</button>
                    <button class="btn btn-secondary" onclick="bot.skipContact()">Skip / Browser only</button>
                </div>
            </div>
        `;
        this.inputArea.innerHTML = inputHTML;
        document.getElementById('emailInput').focus();
    }

    confirmContact() {
        const email = document.getElementById('emailInput').value.trim();
        let phone = document.getElementById('phoneInput')?.value.trim() || null;

        // Basic email validation
        if (email && !this.validateEmail(email)) {
            alert('Please enter a valid email address.');
            return;
        }

        // Normalize and validate phone
        if (phone) {
            phone = this.normalizePhone(phone);
            if (!phone) {
                alert('Invalid phone number. Enter a 10-digit number or include country code (e.g. +91XXXXXXXXXX)');
                return;
            }
        }

        if (!email && !phone) {
            if (!confirm('No email or phone provided. You will only receive browser notifications. Continue?')) {
                return;
            }
        }

        this.appointmentData.email = email || null;
        this.appointmentData.phone = phone;

        const contactParts = [];
        if (email) contactParts.push(`📧 ${email}`);
        if (phone) contactParts.push(`📱 ${phone}`);
        this.addMessage(contactParts.length > 0 ? contactParts.join('  ') : 'Browser notifications only', true);

        this.showAppointmentSummary();
    }

    skipContact() {
        this.appointmentData.email = null;
        this.appointmentData.phone = null;
        this.addMessage('Browser notifications only', true);
        this.showAppointmentSummary();
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    normalizePhone(phone) {
        // Remove spaces, dashes, parentheses
        let cleaned = phone.replace(/[\s\-().]/g, '');
        // If 10 digits (Indian number), prepend +91
        if (/^[6-9]\d{9}$/.test(cleaned)) {
            return '+91' + cleaned;
        }
        // If already in E.164 format (+countrycode + digits)
        if (/^\+\d{10,15}$/.test(cleaned)) {
            return cleaned;
        }
        // Invalid
        return null;
    }

    showAppointmentSummary() {
        const dateStr = this.appointmentData.date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = `${this.appointmentData.time.hour}:${this.appointmentData.time.minute} ${this.appointmentData.time.period}`;

        const summaryHTML = `
            <div class="appointment-summary">
                <h4>📋 Appointment Summary</h4>
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Time:</strong> ${timeStr}</p>
                <p><strong>Subject:</strong> ${this.appointmentData.subject}</p>
            </div>
        `;

        this.addMessage("Perfect! Here's your appointment summary:", false, summaryHTML);
        this.addMessage("Would you like to confirm and schedule this appointment?", false);

        const buttonsHTML = `
            <div class="button-group">
                <button class="btn btn-primary" onclick="bot.scheduleAppointment()">✓ Schedule Appointment</button>
                <button class="btn btn-secondary" onclick="bot.cancelAndRestart()">✗ Cancel</button>
            </div>
        `;
        this.inputArea.innerHTML = buttonsHTML;
    }

    async scheduleAppointment() {
        // Calculate the exact appointment datetime
        const appointmentDateTime = new Date(this.appointmentData.date);
        let hour = this.appointmentData.time.hour;
        if (this.appointmentData.time.period === 'PM' && hour !== 12) {
            hour += 12;
        } else if (this.appointmentData.time.period === 'AM' && hour === 12) {
            hour = 0;
        }
        appointmentDateTime.setHours(hour, parseInt(this.appointmentData.time.minute), 0, 0);

        // Calculate time until appointment
        const now = new Date();
        const timeUntilAppointment = appointmentDateTime - now;

        if (timeUntilAppointment <= 0) {
            this.addMessage("⚠️ The selected time has already passed. Please schedule a future appointment.", false);
            this.cancelAndRestart();
            return;
        }

        const appointmentObj = {
            dateTime: appointmentDateTime.toISOString(),
            date: this.appointmentData.date.toISOString(),
            time: `${this.appointmentData.time.hour}:${this.appointmentData.time.minute} ${this.appointmentData.time.period}`,
            subject: this.appointmentData.subject,
            email: this.appointmentData.email,
            phone: this.appointmentData.phone,
            scheduled: now.toISOString()
        };

        // Send to backend for email/SMS notifications
        if (this.appointmentData.email || this.appointmentData.phone) {
            try {
                // Use current domain for API calls (works both locally and on Render)
                const apiUrl = window.location.origin + '/api/appointments/schedule';

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        dateTime: appointmentObj.dateTime,
                        subject: this.appointmentData.subject,
                        email: this.appointmentData.email,
                        phone: this.appointmentData.phone
                    })
                });

                const result = await response.json();
                if (result.success) {
                    appointmentObj.backendId = result.appointmentId;
                    console.log('Appointment scheduled on backend:', result.appointmentId);
                }
            } catch (error) {
                console.error('Error connecting to backend:', error);
                this.addMessage("⚠️ Note: Could not connect to notification server. Email/SMS will not be sent.", false);
            }
        }

        // Store appointment in localStorage
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');

        if (this.editingAppointmentId !== null) {
            // Update existing appointment
            const oldIndex = this.editingAppointmentId;
            const oldAppointment = appointments[oldIndex];

            // Clear old notification timeout
            if (this.notificationTimeouts[oldIndex]) {
                clearTimeout(this.notificationTimeouts[oldIndex]);
                delete this.notificationTimeouts[oldIndex];
            }

            // Delete old appointment from backend if it exists
            if (oldAppointment.backendId) {
                try {
                    const apiUrl = window.location.origin + `/api/appointments/${oldAppointment.backendId}`;
                    await fetch(apiUrl, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    console.error('Error deleting old appointment from backend:', error);
                }
            }

            // Update appointment
            appointments[oldIndex] = appointmentObj;

            // Schedule new browser notification
            this.notificationTimeouts[oldIndex] = setTimeout(() => {
                this.sendNotificationForAppointment(appointmentObj);
            }, timeUntilAppointment);

            localStorage.setItem('appointments', JSON.stringify(appointments));

            // Show success message
            const successHTML = '<div class="success-icon"></div>';
            this.addMessage("✅ Appointment updated successfully!", false, successHTML);

            let confirmMsg = `Updated appointment: "${this.appointmentData.subject}"`;
            if (this.appointmentData.email) {
                confirmMsg += '\n\nYou will receive reminders via:';
                confirmMsg += '\n📧 Email';
                confirmMsg += '\n🔔 Browser notification';
            }
            this.addMessage(confirmMsg, false);

            this.editingAppointmentId = null;
        } else {
            // Add new appointment
            const newIndex = appointments.length;
            appointments.push(appointmentObj);

            // Schedule the browser notification
            this.notificationTimeouts[newIndex] = setTimeout(() => {
                this.sendNotificationForAppointment(appointmentObj);
            }, timeUntilAppointment);

            localStorage.setItem('appointments', JSON.stringify(appointments));

            // Show success message
            const successHTML = '<div class="success-icon"></div>';
            this.addMessage("🎉 Success! Your appointment has been scheduled.", false, successHTML);

            let confirmMsg = `You will receive reminders via:`;
            const methods = [];
            if (this.appointmentData.email) methods.push('📧 Email');
            if (this.appointmentData.phone) methods.push('📱 SMS');
            methods.push('🔔 Browser notification');
            confirmMsg += '\n' + methods.join('\n');

            this.addMessage(confirmMsg, false);
        }

        // Show restart button
        setTimeout(() => {
            this.inputArea.innerHTML = `
                <div class="button-group">
                    <button class="btn btn-primary" onclick="bot.restart()">Schedule Another Appointment</button>
                    <button class="btn btn-secondary" onclick="bot.viewHistory()">📋 View History</button>
                </div>
            `;
        }, 1000);
    }

    sendNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⏰ Appointment Reminder', {
                body: `Time for: ${this.appointmentData.subject}`,
                icon: '📅',
                requireInteraction: true
            });
        }

        // Also show alert as backup
        alert(`⏰ Appointment Reminder!\n\nTime for: ${this.appointmentData.subject}`);
    }

    sendNotificationForAppointment(appointment) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⏰ Appointment Reminder', {
                body: `Time for: ${appointment.subject}`,
                icon: '📅',
                requireInteraction: true
            });
        }

        // Also show alert as backup
        alert(`⏰ Appointment Reminder!\n\nTime for: ${appointment.subject}`);
    }

    cancelAndRestart() {
        this.addMessage("No problem! Let's start over.", false);
        this.restart();
    }

    // ── Back navigation ──────────────────────────────────────
    goBackToMenu() {
        // Back from date picker → main menu
        this.currentStep = 'initial';
        this.selectedDate = null;
        if (typeof this.showNLInput === 'function') {
            this.showNLInput();
        } else {
            this.showInitialButtons();
        }
    }

    goBackToDate() {
        // Back from time picker → date picker
        this.addMessage("Going back to date selection...", false);
        this.selectedHour = null;
        this.selectedMinute = null;
        this.selectedPeriod = null;
        this.currentStep = 'date';
        this.showDatePicker();
    }

    goBackToTime() {
        // Back from subject → time picker
        this.addMessage("Going back to time selection...", false);
        this.appointmentData.time = null;
        this.selectedHour = null;
        this.selectedMinute = null;
        this.selectedPeriod = null;
        this.currentStep = 'time';
        this.showTimePicker();
    }

    goBackToSubject() {
        // Back from contact → subject
        this.addMessage("Going back to subject entry...", false);
        this.appointmentData.subject = null;
        this.currentStep = 'subject';
        this.showSubjectInput();
    }
    // ─────────────────────────────────────────────────────────

    restart() {
        this.currentStep = 'initial';
        this.appointmentData = { date: null, time: null, subject: null, email: null, phone: null };
        this.selectedDate = null;
        this.selectedHour = null;
        this.selectedMinute = null;
        this.selectedPeriod = null;
        this.currentMonth = new Date();
        this.editingAppointmentId = null;

        this.addMessage("Ready to schedule a new appointment! 😊", false);

        // Restore NL input if available, otherwise fall back to manual buttons
        if (typeof this.showNLInput === 'function') {
            this.showNLInput();
        } else {
            this.showInitialButtons();
        }
    }
}

// Initialize the bot

// Bot will be instantiated in nl_mode.js after overrides are applied
// const bot = new AppointmentBot();
