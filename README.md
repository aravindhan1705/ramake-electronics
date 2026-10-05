# REMAKE ELECTRONICS

> **"Discover what your unused electronics can become."**  
> An intelligent electronic component reuse and project recommendation platform developed for Hackathon **PS3 – SECONDLIFE**.

---

## 1. Project Concept & Core Innovation

Instead of asking users what components they need to buy, **REMAKE ELECTRONICS** starts with the electronic components they already own and discovers what they can build.

### The Value Pipeline:
```
USER COMPONENTS
      ↓
REMAKE ELECTRONICS MATCHING ENGINE
      ↓
PROJECT RECOMMENDATIONS
      ↓
FEASIBILITY SCORE (%)
      ↓
MISSING COMPONENTS & SHORTAGES
      ↓
REUSE IMPACT & E-WASTE AVOIDANCE
```

---

## 2. Key Features

- **White-Theme Landing Page**: Clean, modern typography with black branding text and clear `LOGIN` / `GET STARTED` actions.
- **Secure Email OTP Authentication**:
  - Cryptographically secure 6-digit random code generation on backend (`crypto.randomInt`).
  - SHA-256 HMAC hashed storage with server secret.
  - Strict 5-minute expiry (`300` seconds).
  - Rate limiting (max 4 requests per 15 minutes) and 30-second cooldown timer.
  - Brute-force protection (max 5 incorrect attempts before code invalidation).
  - Never exposes OTP in frontend HTML/JS or client API responses.
  - Live SMTP email dispatch via Nodemailer + built-in Dev Mailbox inspector for evaluation.
- **Dashboard & User Session**:
  - Displays registered user's full name (e.g. `Aravindhan R`) and email.
  - Three-dot dropdown menu (`Home`, `My Projects`, `Log Out`).
  - Central Hero with two primary workflows: `[ I HAVE COMPONENTS ]` and `[ I WANT TO BUILD ]`.
  - **MY REUSE IMPACT** dashboard cards (Components Reused, Projects Saved, Projects Enabled, Estimated Waste Avoided in kg).
- **"I HAVE COMPONENTS" Workflow**:
  - Component count setup prompt ("How many components do you want to add?").
  - Searchable autocomplete input against 45+ electronic components catalog.
  - Unknown component rejection with clear warning badge.
  - Quantity validation (positive integers $\ge 1$).
  - Instant row removal without page reloads.
  - "Quick Load Demo Preset" button for 1-click test of the problem statement kit.
  - "MY COMPONENTS" review table.
  - Deterministic Smart Matching Engine.
  - Recommendations with feasibility progress bars, status badges (`READY TO BUILD`, `PARTIALLY READY`, `LOW FEASIBILITY`), missing components list, and reuse impact.
  - Detailed modal view with pinout overview and step-by-step instructions.
  - Saved Projects management ("My Projects").
- **"I WANT TO BUILD" (Reverse Workflow)**:
  - Choose a target project from the catalog.
  - Compares required components against your inventory.
  - Pinpoints missing components and quantity shortages.
  - Suggests alternative projects with higher feasibility.

---

## 3. Technology Stack

- **Backend**: Node.js v24+, Express.js, `nodemailer`, `cookie-parser`, `cors`, `dotenv`
- **Frontend**: Vanilla ES6+ JavaScript, Semantic HTML5, CSS Custom Properties (Design System)
- **Database/Store**: File-backed JSON store (`backend/data/store.json`) with auto-persistence
- **Security**: Node.js native `crypto`, HMAC SHA-256, HTTP-Only Cookie / Bearer Token sessions

---

## 4. Folder Structure

```
remake-electronics/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # OTP requests, verification, and sessions
│   │   ├── matchingController.js   # Component validation and matching execution
│   │   └── projectsController.js   # Projects, catalog, user inventory & saved items
│   ├── data/
│   │   ├── catalog.json            # 45+ Maker electronic components
│   │   ├── projects.json           # 19 predefined electronics reuse projects
│   │   └── store.json              # File-backed persistence store
│   ├── middleware/
│   │   └── authMiddleware.js       # Route protection & session verification
│   ├── routes/
│   │   ├── api.js                  # Projects, catalog, match, and user routes
│   │   └── auth.js                 # Send OTP, verify OTP, session me, logout
│   ├── services/
│   │   ├── db.js                   # Persistent storage engine
│   │   ├── emailService.js         # Nodemailer SMTP and Dev Mailbox
│   │   ├── matchingEngine.js       # Deterministic rule-based matching engine
│   │   └── otpService.js           # Crypto OTP generation & brute-force checks
│   └── server.js                   # Main Express application server
├── frontend/
│   ├── assets/                     # SVG icons & branding assets
│   ├── css/
│   │   └── styles.css              # Modern minimalist design system
│   ├── js/
│   │   ├── api.js                  # Fetch API client
│   │   ├── app.js                  # Router & navigation state
│   │   ├── auth.js                 # OTP UI, countdown & session state
│   │   ├── components.js           # Component rows, autocomplete, review table
│   │   └── projects.js             # Recommendation cards, details & reverse matching
│   └── index.html                  # Single Page Application template
├── .env                            # Active environment configuration
├── .env.example                    # Environment template
├── package.json                    # Dependencies and scripts
└── README.md                       # Comprehensive documentation
```

---

## 5. Installation & Setup

### Prerequisites
- Node.js LTS (v18+)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` settings:
```ini
PORT=3000
NODE_ENV=development
OTP_SECRET=remake_electronics_production_secure_salt_9281923
ENABLE_DEV_MAILBOX=true

# Optional: Add your real SMTP credentials to dispatch live emails:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_app_password
# EMAIL_FROM="REMAKE ELECTRONICS" <your_email@gmail.com>
```

### 3. Start the Server
```bash
npm start
```
The application will be live at:
**`http://localhost:3000`**

---

## 6. How the Feasibility & Matching Engine Works

### Feasibility Formula (Section 27)
$$\text{Feasibility} = \left(\frac{\text{Available Required Component Types}}{\text{Total Required Component Types}}\right) \times 100$$

### Quantity-Aware Matching (Section 28)
- If user has all required component types **AND** all quantities are $\ge$ required:  
  **Status**: `READY TO BUILD` (Feasibility = 100%)
- If user has some required component types, or has all types but lacks quantity:  
  **Status**: `PARTIALLY READY`
- If feasibility is low (< 40%):  
  **Status**: `LOW FEASIBILITY`

### Tie-Breaker Ranking (Section 31)
1. Feasibility Percentage (descending)
2. Fewer Missing Component Types
3. Fewer Quantity Shortages
4. Higher Estimated Waste Avoided
5. Lower Difficulty (Beginner $\to$ Intermediate $\to$ Advanced)

---

## 7. Hackathon Demo Walkthrough

1. Open `http://localhost:3000` on your browser.
2. Click **LOGIN** or **GET STARTED** at the top right.
3. Select **CREATE ACCOUNT**, enter:
   - Full Name: `Aravindhan R`
   - Email: `aravindhan@example.com`
4. Click **SEND OTP**.
5. Check the email or click **Auto-Fill OTP** (via built-in Dev Mailbox preview).
6. Click **VERIFY OTP**. You are authenticated and redirected to the **HOME / DASHBOARD**.
7. Observe `Aravindhan R ⋮` in the top right.
8. Click **I HAVE COMPONENTS**.
9. Click **⚡ Load Demo Preset** (prepopulates Arduino Uno ×1, Servo Motor ×2, Ultrasonic Sensor ×1, LED ×5, LDR ×2).
10. Click **FIND PROJECTS**.
11. View recommendations:
    - **Automatic Dustbin**: `100% FEASIBILITY` • `READY TO BUILD`
    - **Obstacle Detection System**: `75% FEASIBILITY` • `PARTIALLY READY` (Missing Buzzer ×1)
    - **Automatic Night Lamp**: `75% FEASIBILITY` • `PARTIALLY READY` (Missing Resistor ×1)
12. Click **VIEW PROJECT** on Automatic Dustbin to inspect full pinouts and build steps.
13. Click **SAVE PROJECT**.
14. Open the three-dot menu `⋮` $\to$ **My Projects** to view your saved projects.
15. Click **Home** $\to$ **I WANT TO BUILD**.
16. Pick a target project (e.g. *Smart Door System*) and click **CHECK MY COMPONENTS** to view missing parts and suggested alternatives.
17. Open three-dot menu $\to$ **Log Out** to return to the public landing page.
