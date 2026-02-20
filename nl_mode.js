// Natural Language Mode - DEFAULT INTERFACE
// This completely overrides the default behavior to show chat input immediately

(function () {
    // Store original init
    const originalInit = AppointmentBot.prototype.init;

    // Completely override init - don't call showInitialButtons!
    AppointmentBot.prototype.init = function () {
        // Request notification permission
        if ('Notification' in window) {
            Notification.requestPermission();
        }

        // Reschedule existing appointments
        this.rescheduleExistingAppointments();

        // DON'T call showInitialButtons() - check LLM first!
        this.checkLLMAndShowInput();
    };

    // Check LLM and show appropriate input
    AppointmentBot.prototype.checkLLMAndShowInput = async function () {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();

            if (data.llm_enabled) {
                // LLM available - show natural language input
                document.getElementById('llmStatus').style.display = 'inline';
                console.log('✅ Showing natural language input');
                this.showNLInput();
            } else {
                // No LLM - show manual buttons
                console.log('ℹ️ LLM disabled, using manual mode');
                this.showManualButtons();
            }
        } catch (error) {
            console.error('Error checking LLM:', error);
            this.showManualButtons();
        }
    };

    // Show natural language input (PRIMARY INTERFACE) 
    AppointmentBot.prototype.showNLInput = function () {
        const inputHTML = `
            <div class="nl-input-container">
                <input type="text" class="chat-input nl-input" id="nlMessageInput" 
                       placeholder="e.g. tomorrow 12pm dentist" 
                       maxlength="200" autofocus>
                <button class="btn btn-primary" onclick="bot.sendNLMessage()" id="nlSendBtn">
                    Send 🚀
                </button>
            </div>
            <div class="button-group" style="margin-top: 10px;">
                <button class="btn btn-secondary" onclick="bot.viewHistory()">📋 View History</button>
                <button class="btn btn-secondary" onclick="bot.switchToManualMode()">📝 Use Form</button>
            </div>
        `;
        this.inputArea.innerHTML = inputHTML;

        // Focus input
        setTimeout(() => {
            const input = document.getElementById('nlMessageInput');
            if (input) {
                input.focus();
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendNLMessage();
                    }
                });
            }
        }, 100);
    };

    // Show manual buttons (FALLBACK)
    AppointmentBot.prototype.showManualButtons = function () {
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        const hasAppointments = appointments.length > 0;

        const buttonsHTML = `
            <div class="button-group">
                <button class="btn btn-primary" onclick="bot.startAppointment()">Schedule New Appointment</button>
                ${hasAppointments ? '<button class="btn btn-secondary" onclick="bot.viewHistory()">📋 View History</button>' : ''}
                <button class="btn btn-secondary" onclick="bot.showHelp()">How it works</button>
            </div>
        `;
        this.inputArea.innerHTML = buttonsHTML;
    };

    // Switch to manual mode
    AppointmentBot.prototype.switchToManualMode = function () {
        this.addMessage("Switching to step-by-step form...", false);
        this.startAppointment();
    };

    // Send message to LLM
    AppointmentBot.prototype.sendNLMessage = async function () {
        const input = document.getElementById('nlMessageInput');
        if (!input) return;

        const message = input.value.trim();
        if (!message) {
            alert('Please type your appointment');
            return;
        }

        // Show user message
        this.addMessage(message, true);

        // Clear and disable input
        input.value = '';
        input.disabled = true;
        const sendBtn = document.getElementById('nlSendBtn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = 'Processing...';
        }

        try {
            const response = await fetch('/api/parse-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const result = await response.json();

            if (!result.success) {
                if (result.clarification_needed) {
                    this.addMessage(result.clarification_needed, false);
                    this.showNLInput();
                } else if (result.fallback_to_form) {
                    this.addMessage("Let's use the step-by-step form instead.", false);
                    this.switchToManualMode();
                } else {
                    this.addMessage(result.error || "Couldn't understand. Try again.", false);
                    this.showNLInput();
                }
            } else {
                this.pendingExtraction = result.extraction;
                this.showNLConfirmation(result.extraction);
            }
        } catch (error) {
            console.error('LLM error:', error);
            this.addMessage("⚠️ Error. Using manual form instead.", false);
            this.switchToManualMode();
        }
    };

    // Show confirmation
    AppointmentBot.prototype.showNLConfirmation = function (extraction) {
        const dateObj = new Date(extraction.date);
        const dateStr = dateObj.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const summaryHTML = `
            <div class="appointment-summary">
                <h4>📋 I understood:</h4>
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Time:</strong> ${extraction.time}</p>
                <p><strong>Subject:</strong> ${extraction.subject}</p>
            </div>
        `;

        this.addMessage("Perfect! Here's what I got:", false, summaryHTML);

        const buttonsHTML = `
            <div class="input-group" style="margin-bottom: 12px;">
                <label class="input-label">📧 Email (Optional)</label>
                <input type="email" class="chat-input" id="nlEmailInput" 
                       placeholder="your.email@example.com">
                <p class="input-hint">Leave blank for browser notifications only</p>
            </div>
            <div class="input-group" style="margin-bottom: 12px;">
                <label class="input-label">📱 Phone Number (Optional)</label>
                <input type="tel" class="chat-input" id="nlPhoneInput" 
                       placeholder="+91XXXXXXXXXX (include country code)">
                <p class="input-hint">For SMS reminders — include country code (e.g. +91 for India)</p>
            </div>
            <div class="button-group">
                <button class="btn btn-primary" onclick="bot.confirmNLAppointment()">✓ Schedule</button>
                <button class="btn btn-secondary" onclick="bot.cancelNLAppointment()">✗ Cancel</button>
            </div>
        `;
        this.inputArea.innerHTML = buttonsHTML;
        setTimeout(() => document.getElementById('nlEmailInput')?.focus(), 100);
    };

    // Confirm appointment
    AppointmentBot.prototype.confirmNLAppointment = async function () {
        if (!this.pendingExtraction) return;

        const email = document.getElementById('nlEmailInput')?.value.trim();
        let phone = document.getElementById('nlPhoneInput')?.value.trim() || null;

        if (email && !this.validateEmail(email)) {
            alert('Invalid email');
            return;
        }

        if (phone) {
            phone = this.normalizePhone(phone);
            if (!phone) {
                alert('Invalid phone number. Enter a 10-digit number or include country code (e.g. +91XXXXXXXXXX)');
                return;
            }
        }

        const timeParts = this.pendingExtraction.time.match(/^(\d+):(\d+)$/);
        if (!timeParts) {
            alert('Invalid time');
            return;
        }

        let hour = parseInt(timeParts[1]);
        const minute = timeParts[2];
        const period = hour >= 12 ? 'PM' : 'AM';

        if (hour > 12) hour -= 12;
        else if (hour === 0) hour = 12;

        this.appointmentData = {
            date: new Date(this.pendingExtraction.date),
            time: { hour, minute, period },
            subject: this.pendingExtraction.subject,
            email: email || null,
            phone: phone
        };

        await this.scheduleAppointment();
        this.pendingExtraction = null;
    };

    // Cancel
    AppointmentBot.prototype.cancelNLAppointment = function () {
        this.pendingExtraction = null;
        this.addMessage("No problem! Try again:", false);
        this.showNLInput();
    };

    // Initialize
    AppointmentBot.prototype.pendingExtraction = null;
})();

// Create bot instance AFTER all overrides are applied
const bot = new AppointmentBot();
