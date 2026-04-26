\# Product Requirements Document (PRD): Atlas Assessment MVP

\#\# 1\. Executive Summary  
\*\*Atlas Assessment\*\* is an AI-powered diagnostic platform designed by \*\*Seriously Addictive Mathematics (S.A.M.)\*\*. It provides high-fidelity math assessments for children (K-8), offering parents and instructors detailed insights into a child's mathematical proficiency, identifying specific learning gaps and misconceptions through an interactive, age-appropriate experience.

\---

\#\# 2\. Target Audience & Personas  
\- \*\*Parent\*\*: Seeking to understand their child's current math level and looking for actionable growth plans.  
\- \*\*Child (K-4)\*\*: Young learners who need a playful, supportive environment (led by mascot "Sammy the Dachshund").  
\- \*\*Child (5-8)\*\*: Older students who prefer a mature, goal-oriented "Journey Map" experience.  
\- \*\*Instructor\*\*: Education professionals managing cohorts of students, requiring detailed diagnostic data and pedagogical tools.

\---

\#\# 3\. Product Vision & Brand  
\- \*\*Core Value\*\*: Precision diagnostics delivered through a world-class Singapore Math pedagogy.  
\- \*\*Mascot\*\*: A friendly, brown long-haired mini dachshund.  
\- \*\*Visual Style\*\*: Bright, playful, and premium. Friendly for children; professional and data-rich for adults.  
\- \*\*Key Design Tokens\*\*:  
    \- \*\*Primary Red\*\*: \`\#E63946\`  
    \- \*\*Primary Navy\*\*: \`\#1B3A6B\`  
    \- \*\*Background Cream\*\*: \`\#FFF8F0\`  
    \- \*\*Typography\*\*: Plus Jakarta Sans (UI), Fredoka (Child-facing).

\---

\#\# 4\. Feature Requirements (MVP Scope)

\#\#\# 4.1 Parent Portal  
\- \*\*Onboarding\*\*: Email/Social signup with COPPA-compliant consent.  
\- \*\*Child Management\*\*: Add/Edit child profiles (Name, Grade, Birth Year).  
\- \*\*Dashboard\*\*: Track multiple children, view status, and initiate assessments.  
\- \*\*Diagnostic Reports\*\*: Detailed performance breakdown by strand (Number Sense, Operations, etc.), featuring radar charts and misconception insights.

\#\#\# 4.2 Child Assessment Experience  
\- \*\*Adaptive Questioning\*\*: Interactive math problems (Multiple Choice, Numeric Entry, Drag & Drop).  
\- \*\*K-4 Journey\*\*: Mascot-led with encouraging interstitials.  
\- \*\*5-8 Journey\*\*: Progress-based map with avatar milestones (Mascot-free).  
\- \*\*No-Pressure Flow\*\*: No "Correct/Incorrect" feedback during assessment; no visible timer.

\#\#\# 4.3 Instructor Portal  
\- \*\*Student Roster\*\*: Manage class lists and monitoring assessment progress.  
\- \*\*Pedagogical Reporting\*\*: Access student reports with additional teacher-focused notes and worksheet recommendations.  
\- \*\*Cohort Analytics\*\*: High-level class performance trends and common misconception identification.

\---

\#\# 5\. Screen Inventory & Modules

\#\#\# Module A: Authentication & Onboarding  
\- Landing Page (Desktop/Mobile)  
\- Parent Signup (First/Last Name, Email, Password)  
\- Privacy/COPPA Pop-up  
\- Add Child (Form)

\#\#\# Module B: K-4 Child Journey (Tablet Landscape)  
\- Welcome Screen (Mascot greeting)  
\- Practice Question (Tutorial)  
\- Assessment Loop (MC, Numeric, Drag/Drop)  
\- Encouragement Interstitials  
\- Completion Screen (Mascot celebration)

\#\#\# Module C: 5-8 Child Journey (Tablet Landscape)  
\- Welcome Journey (Avatar selection)  
\- Journey Map Interstitial (Progress path)  
\- Advanced Assessment Loop (Coordinate Geometry, Fractions, Logic)  
\- Completion Journey

\#\#\# Module D: Reporting & Dashboards  
\- Parent Dashboard (State: Empty, Active)  
\- Instructor Roster (State: Empty, Active)  
\- Diagnostic Report (Radar Chart, Strand Map, Recommendations)  
\- Instructor Cohort View (Analytics)

\---

\#\# 6\. Technical Requirements  
\- \*\*Responsive Web\*\*: Desktop (1440px), Tablet (1024px \- Primary for kids), Mobile (375px+).  
\- \*\*Tech Stack Recommendation\*\*: HTML5, Tailwind CSS (for styling), React/Vue/Next.js (for state management).  
\- \*\*Interaction Model\*\*: No "Submit" buttons for kids; auto-advance on answer selection.  
\- \*\*Compliance\*\*: COPPA (Children's Online Privacy Protection Rule) alignment required.

\---

\#\# 7\. Success Metrics  
\- Assessment Completion Rate.  
\- Accuracy of placement (Level 1A through 8B).  
\- Parent conversion from "Report Viewed" to "Consultation Booked".

\---  
\*Created on: 2024-10-24\*  
\*Version: 1.0 (MVP Readiness)\*  
