# 📋 PORT ISSUE - READ THIS!

## The Problem:
You're trying to use **Live Server (port 5500)** with the Flask backend, but they need to work together.

## The Solution:

**DON'T use Live Server!** The Flask server already serves your HTML files.

### Correct Way:

1. **Run Flask server:**
   ```bash
   python app.py
   ```

2. **Open in browser:**
   ```
   http://localhost:10000
   ```
   (NOT http://localhost:5500)

3. **That's it!** Flask serves everything:
   - ✅ HTML files (index.html)
   - ✅ CSS files (styles.css)
   - ✅ JavaScript files (script.js)
   - ✅ API endpoints (/api/appointments/schedule)

## Why Live Server Won't Work:

- **Live Server (5500)** only serves static files
- **Flask (10000)** serves static files AND handles backend API
- Your frontend needs to call the backend API, so both must be on the same domain/port
- Flask is already configured to do both!

## How to Test:

1. Stop Live Server if running
2. Run `python app.py`
3. Visit `http://localhost:10000`
4. Schedule an appointment - it will work! ✅

## For VS Code Users:

If you want to edit and see changes:
1. Edit your files (HTML, CSS, JS)
2. Save the file
3. **Hard refresh** the browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Changes will appear!

No need for Live Server when using Flask! 🎉
