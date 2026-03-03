# Employee (Candidate) Workflows & Settings

> **User Type Name (Recommended): _Candidates_**  
> Alternatives considered: Job Seekers, Professionals, Talent.  
> **Reason:** “Candidates” is neutral, professional, and commonly used across modern job platforms without sounding temporary or junior.

---

## 1. Role Definition: Candidate

A **Candidate** is an individual using the platform to:
- Discover job opportunities
- Evaluate employers and roles
- Apply to jobs
- Track activity and preferences

Candidates **do not** post jobs, manage companies, or access admin features.

---

## 2. Candidate Account Lifecycle

### 2.1 Anonymous (Pre‑Signup)
- Browse jobs
- Search & filter
- View job details
- View company profiles

**Restrictions:**
- Cannot save jobs
- Cannot save searches
- Cannot apply (unless external apply without tracking)

---

### 2.2 Registered Candidate

Registration unlocks:
- Saved jobs
- Saved searches & alerts
- Application tracking (if direct apply enabled)
- Profile & preferences

Registration methods:
- Email + password
- Optional social login (future, not required)

---

## 3. Core Candidate Workflows (Firm)

### 3.1 Discover Jobs

**Primary Entry Points**
- `/jobs` (search-first landing)
- SEO job pages
- Shared links (social, email)

**Workflow**
1. Enter keyword or use default feed
2. Apply filters:
   - Location / Remote
   - Employment type
   - Experience level
   - Salary range
   - Date posted
3. Sort results:
   - Most relevant (default)
   - Most recent
4. Open job detail

**Rules**
- Filters update instantly
- Clear empty states
- Persistent filters across navigation

---

### 3.2 Evaluate Job & Company

**Job Detail View**
- Role summary
- Responsibilities
- Requirements
- Compensation
- Benefits
- Apply CTA

**Company Context**
- Company name & logo
- Short description
- Website link
- Other open roles

**Trust Signals**
- Salary transparency (if provided)
- Verified employer badge (if applicable)
- Posting date + expiry

---

### 3.3 Save Job

**Workflow**
1. Click “Save” on job card or job page
2. Job added to Saved Jobs list
3. Save persists across sessions

**Rules**
- One-click toggle
- No confirmation modal
- Undo supported

---

### 3.4 Save Search & Alerts

**Workflow**
1. Candidate performs a search with filters
2. Click “Save this search”
3. Configure alert frequency:
   - Daily
   - Weekly
   - Off
4. Platform sends alerts when new matching jobs appear

**Rules**
- Alerts only include *new* jobs
- One-click unsubscribe per alert

---

### 3.5 Apply to Job

#### A. External Apply (Default)
1. Click “Apply”
2. Redirect to employer/ATS site
3. Platform records outbound click

**Candidate View**
- Mark job as “Applied (external)” manually (optional)

#### B. Direct Apply (If Enabled)
1. Click “Apply”
2. Upload resume
3. Fill minimal form (name, email)
4. Submit
5. Confirmation shown

**Rules**
- Resume stored securely
- No duplicate submissions

---

### 3.6 Track Activity

**Candidate Dashboard**
- Saved jobs
- Saved searches
- Applied jobs (direct apply only)
- Recently viewed jobs

---

## 4. Candidate Profile (Minimal, Intentional)

### 4.1 Profile Fields

- Full name
- Email
- Resume (file)
- Preferred job location(s)
- Preferred role keywords
- Remote preference

> No mandatory “social profile” or noisy fields.

---

### 4.2 Resume Management

- Upload / replace resume
- One active resume at a time (v1)
- File validation (PDF/DOC)

---

## 5. Candidate Settings

### 5.1 Account Settings
- Email
- Password change
- Account deletion

---

### 5.2 Notification Settings

**Email Notifications**
- Saved search alerts
- Platform announcements (optional)

**Controls**
- Frequency per saved search
- Global mute option

---

### 5.3 Privacy & Data Controls

- Resume visibility:
  - Only shared on direct apply
- Data export (GDPR-ready)
- Delete account & data

---

## 6. Candidate Permissions & Constraints

**Allowed**
- Read jobs & companies
- Save jobs/searches
- Apply to jobs
- Manage own profile

**Not Allowed**
- Post jobs
- Contact employers directly (outside apply)
- See other candidates
- Access admin or billing features

---

## 7. Anti-Abuse Rules (Candidate Side)

- Apply rate limits
- Bot detection on search/apply
- Resume upload scanning

---

## 8. Naming Summary (Final)

**Primary User Type Name:** ✅ **Candidate**

**Used in UI as:**
- “Candidate Dashboard”
- “Candidate Settings”
- “Candidate Alerts”

This terminology aligns with professional job platforms and avoids ambiguity.

---

## Final Principle

Candidates should feel:
- Fast discovery
- Zero friction
- Full control over alerts and data

If a feature does not improve **discovery**, **clarity**, or **apply confidence**, it does not belong in the Candidate experience.

