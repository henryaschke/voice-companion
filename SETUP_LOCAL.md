# 🏠 Local Testing Setup Guide

This guide will help you test the Voice Companion locally without deploying to AWS.

## Prerequisites

1. ✅ Python 3.13 (already installed)
2. ✅ Virtual environment created
3. 🔑 OpenAI API Key (get from: https://platform.openai.com/api-keys)
4. 🔑 Twilio Account (free trial works!)
5. 📡 ngrok (for exposing local server to Twilio)

---

## Step 1: Install Dependencies

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

**This will fix the Python 3.13 compatibility issue we just resolved!**

---

## Step 2: Create .env File

Create `backend/.env` with your credentials:

```bash
cd backend
cp env-template.txt .env
```

Then edit `.env`:

```env
# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Twilio Configuration (REQUIRED for phone calls)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_NUMBER_E164=+18501234567

# Security (keep default for local)
ADMIN_TOKEN=dev-admin-token

# Encryption (optional for local testing)
FERNET_KEY=

# Base URL (will update after ngrok)
BASE_URL=http://localhost:8000

# Database (default SQLite)
DATABASE_URL=sqlite+aiosqlite:///./data/voicecompanion.db
```

### 🔑 Where to Get Credentials:

**OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy the key (starts with `sk-proj-...`)
4. ⚠️ Make sure you have billing enabled and credit in your account

**Twilio Account (Free Trial):**
1. Sign up: https://www.twilio.com/try-twilio
2. Get free trial number (Voice enabled)
3. Find credentials:
   - Account SID: Dashboard → Account Info
   - Auth Token: Dashboard → Account Info (click "view")
   - Phone Number: Phone Numbers → Manage → Active numbers

---

## Step 3: Install ngrok (for Twilio webhooks)

Ngrok creates a public HTTPS tunnel to your local server so Twilio can reach it.

**Mac (Homebrew):**
```bash
brew install ngrok
```

**Or download from:** https://ngrok.com/download

**Sign up and authenticate:**
```bash
ngrok config add-authtoken YOUR_NGROK_TOKEN
```
(Get token from: https://dashboard.ngrok.com/get-started/your-authtoken)

---

## Step 4: Start the Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Starting EU Voice Companion Backend...
INFO:     Database initialized
```

✅ Test it: Open http://localhost:8000 in your browser. You should see:
```json
{
  "status": "ok",
  "service": "EU Voice Companion",
  "gdpr_compliant": true
}
```

---

## Step 5: Expose Backend with ngrok

**In a new terminal:**

```bash
ngrok http 8000
```

You'll see something like:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:8000
```

**Copy that HTTPS URL!** (e.g., `https://abc123.ngrok.io`)

---

## Step 6: Update Configuration

1. **Update backend/.env:**
```env
BASE_URL=https://abc123.ngrok.io
```

2. **Restart the backend** (Ctrl+C, then start again)

---

## Step 7: Configure Twilio Webhooks

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click on your phone number
3. Scroll to "Voice Configuration"
4. Set:
   - **A CALL COMES IN:** Webhook, HTTP POST
     ```
     https://abc123.ngrok.io/twilio/voice
     ```
   - **STATUS CALLBACK URL:**
     ```
     https://abc123.ngrok.io/twilio/status
     ```
5. Save

---

## Step 8: Test with a Phone Call! 📞

1. **Call your Twilio number** from any phone
2. You should hear the AI greeting in German!
3. Have a conversation!

**Watch the logs:**
```bash
# In your backend terminal, you'll see:
[CallSid] Connection attempt from Twilio
[CallSid] Connected to OpenAI Realtime API
[CallSid] User: Hallo, wie geht es dir?
[CallSid] Agent: Mir geht es gut, danke der Nachfrage!
```

---

## Step 9: (Optional) Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 to see the dashboard!

---

## 🎯 Testing Checklist

- [ ] Backend starts without errors
- [ ] Database initialized (check `backend/data/voicecompanion.db` exists)
- [ ] ngrok tunnel is running
- [ ] Twilio webhooks configured
- [ ] Test phone call works
- [ ] Can hear AI voice
- [ ] Conversation flows naturally
- [ ] Post-call analysis appears in database

---

## 🐛 Troubleshooting

### "Module not found" errors
```bash
cd backend
pip install -r requirements.txt
```

### "insufficient_quota" from OpenAI
- Add billing: https://platform.openai.com/account/billing
- Add $5-10 credit

### Call immediately hangs up
- Check ngrok is running
- Check BASE_URL in .env matches ngrok URL
- Check Twilio webhook URLs are correct
- View ngrok requests: http://localhost:4040

### No audio / silent call
- Restart backend after updating BASE_URL
- Check OpenAI API key is valid
- Check OpenAI account has Realtime API access

### Database errors
```bash
rm backend/data/voicecompanion.db
# Restart backend to recreate
```

---

## 📝 Quick Test Without Phone Call

You can test the API without a phone:

```bash
# Get health status
curl http://localhost:8000/health

# Get dashboard stats
curl http://localhost:8000/api/dashboard/private

# Create a test person
curl -X POST http://localhost:8000/api/people/seniors \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Test Person",
    "phone_e164": "+491701234567",
    "language": "de",
    "consent_recording": true,
    "retention_days": 30
  }'
```

---

## 🚀 What's Next?

Once local testing works:
1. Add more test persons via the frontend
2. Test different conversation scenarios
3. Check the dashboard analytics
4. Review transcripts and sentiment analysis

---

## 💡 Tips

- **ngrok free tier** has a timeout after ~2 hours. Just restart it and update Twilio webhooks with new URL.
- **Keep terminals open:** One for backend, one for ngrok, optionally one for frontend
- **Watch logs:** The backend logs show everything happening in real-time
- **Cost:** OpenAI Realtime API costs ~$0.06/minute of audio (input + output)

---

## 📞 Cost Estimate for Testing

| Service | Cost |
|---------|------|
| Twilio (free trial) | $0 (includes free credit) |
| OpenAI Realtime API | ~$0.06/minute |
| ngrok (free tier) | $0 |
| **5-minute test call** | ~$0.30 |

---

Good luck! 🎉

