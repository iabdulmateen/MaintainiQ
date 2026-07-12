# MaintainIQ — AI-Powered QR Maintenance & Asset History Platform
MaintainIQ is a professional asset lifecycle and maintenance management application. It gives physical items a digital presence using QR codes, streamlines issue reporting with built-in **AI Diagnostics Triage**, tracks technician repair workflows, and compiles permanent maintenance logs.
---
## 🌟 Key Highlights & Features
1. **Intelligent AI Triage**: Converts user complaints into structured categories, severity ratings, potential failure causes, and actionable safety checks using Google Gemini API (with deterministic fallback).
2. **Dual-Database Storage Engine**: Works out-of-the-box using browser **LocalStorage** (for zero-setup evaluation) and provides seamless configuration inputs to hook up to a **Supabase** backend database.
3. **Printable QR Codes**: Generate customized, print-ready asset labels including location, barcode code, scan instructions, and a dynamic QR code linked directly to the public report route.
4. **Responsive Role Persona Switcher**: Includes a top-bar control deck to toggle between **Admin**, **Technician**, and **Public Reporter** personas to easily audit restricted actions and screens.
5. **Clean SPA client Router**: Single Page App using modern ES Modules and client-side hash routing (`#/`, `#/assets`, `#/issues`), guaranteeing seamless hosting on GitHub Pages, Netlify, or Vercel.
---
## 🚀 Quick Start / Local Setup
Because the application is built using modern **Vanilla JavaScript (ES Modules)**, there are no heavy package builds or configuration files to compile. 
### Step 1: Run a Local HTTP Server
To enable ES module loading (`import` statements), you must serve the files from a local server. Run any of the following commands in the project folder:
**Using Python:**
```bash
python -m http.server 3000
```
Open your browser to: `http://localhost:3000`
**Using Node.js (npx):**
```bash
npx live-server
```
### Step 2: Open and Test
- Navigate to `http://localhost:3000` or the address output by your server.
- The app initializes preloaded with **5 assets, 2 active issues, and 4 history entries** so you can start testing immediately.
- Use the **MaintainIQ Demo Console** at the top of the viewport to switch between **Admin**, **Technician**, and **Public User** roles.
---
## ⚙️ Integrations & APIs
Open the **Settings** view in the sidebar to configure the following services:
### 1. Google Gemini API (AI Triage)
- Generate a free key from the [Google AI Studio](https://aistudio.google.com/).
- Paste it into the Gemini Settings panel to enable live AI-generated summaries and issue classifications.
- *If no key is provided, the platform runs a local keywords-based heuristic engine matching queries like "flicker", "AC leakage", or "outlet spark" to ensure flawless demo runs.*
### 2. Supabase Integration
To connect the application to a live database, paste your **Supabase URL** and **Anon Key** in the settings.
#### Supabase Database Schema
Copy and paste this script directly into the **SQL Editor** of your Supabase dashboard to create the necessary tables:
```sql
-- 1. Create Assets Table
CREATE TABLE IF NOT EXISTS assets (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    location TEXT NOT NULL,
    condition TEXT DEFAULT 'Good',
    status TEXT DEFAULT 'Operational',
    "lastService" TEXT,
    "nextService" TEXT,
    "assignedTechnician" TEXT DEFAULT 'Unassigned'
);
-- 2. Create Issues Table
CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    "assetCode" TEXT REFERENCES assets(code) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT,
    status TEXT DEFAULT 'Reported',
    "reporterName" TEXT,
    "reporterEmail" TEXT,
    "assignedTechnician" TEXT DEFAULT 'Unassigned',
    "createdDate" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "maintenanceNotes" TEXT,
    "partsReplaced" TEXT,
    cost NUMERIC DEFAULT 0
);
-- 3. Create History Table
CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    "assetCode" TEXT REFERENCES assets(code) ON DELETE CASCADE,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    "issueId" TEXT,
    timestamp TEXT NOT NULL
);
-- 4. Enable Row Level Security (RLS) but allow public access for Hackathon Demo
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write" ON assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write" ON issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write" ON history FOR ALL USING (true) WITH CHECK (true);
```
---
## 📈 Evaluation Walkthrough Scenario
To demonstrate the full capability of the application to graders:
1. **Verify Sandbox**: Navigate to **Settings** and click **Wipe Local Changes & Load Demo Data**.
2. **Add Asset**: As **Admin**, click **Register Asset**. Enter `PRJ-001` as code and `Classroom Projector 01` as name. Submit. Verify that trying to add the same code again fails with validation warning.
3. **Extract QR Label**: Click **Label** next to `PRJ-001`. You can download the print preview sheet or click **Open Public View**.
4. **Report Issue**: On the Public View, click **Report Issue**. Input *"The display projector screen is flickering and fails to connect to HDMI."* 
5. **Run AI Triage**: Click **Run AI Triage**. The AI will suggest:
   - *Title*: Display Flickering & HDMI Detection Issue
   - *Priority*: High
   - *Possible Causes*: Loose HDMI connections, lamp source wear...
   - *Safe Checks*: Check cable ports, power cycle...
   Confirm the checks and submit the issue.
6. **Technician Flow**: Switch to **Technician** using the top Demo Console. Go to **Issues**. Click **Manage** next to the flickering issue. 
   - Click **Start Inspection** (Status changes to *Under Inspection*).
   - Click **Start Repair Work** (Status changes to *Maintenance In Progress*).
   - Click **Resolve Issue**. Enter repair notes (*"HDMI cable connector replaced"*), material cost (*$15*), and select next service date. Submit.
7. **Verify AI Summary Report**: After resolution, the system displays a professional AI-generated summary report of the work completed.
8. **Inspect History Trail**: Return to the **Dashboard** and view the **System Activity Trail** to verify that all operations are permanently logged in the history.
