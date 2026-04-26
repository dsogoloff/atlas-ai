\# Atlas Assessment: Core User Flows (MVP Development)

This document specifies the primary user journeys and navigation logic for the Atlas Assessment platform. It is designed to be used as a reference for implementing front-end routing and interaction logic.

\---

\#\# 1\. Parent Journey: Onboarding & Management  
\*Goal: Securely register, manage child profiles, and review diagnostic data.\*

1\.  \*\*Landing Page\*\* ({{DATA:SCREEN:SCREEN\_62}})  
    \*   \*\*Action\*\*: Click "Get Started" or "Start Free Assessment"  
    \*   \*\*Destination\*\*: \*\*Parent Signup\*\*  
2\.  \*\*Parent Signup\*\* ({{DATA:SCREEN:SCREEN\_72}})  
    \*   \*\*Interactions\*\*:   
        \*   Click "Privacy Policy/COPPA" link \-\> Open \*\*Privacy Pop-up\*\* ({{DATA:SCREEN:SCREEN\_64}})  
        \*   Click "Sign up with Google" \-\> Redirect to \*\*Add Child\*\* (conceptual)  
        \*   Form Submit (First/Last Name, Email, Password) \-\> \*\*Add Child\*\*  
3\.  \*\*Add Child\*\* ({{DATA:SCREEN:SCREEN\_57}})  
    \*   \*\*Action\*\*: Complete name/grade/birth year form \-\> Click "Continue"  
    \*   \*\*Destination\*\*: \*\*Parent Dashboard\*\*  
4\.  \*\*Parent Dashboard\*\* ({{DATA:SCREEN:SCREEN\_9}})  
    \*   \*\*State: Empty\*\* ({{DATA:SCREEN:SCREEN\_77}}) \-\> CTA: "Add Your First Child"  
    \*   \*\*State: Active\*\* \-\> List children.   
        \*   Action: "Start New Assessment" \-\> \*\*K-4 Welcome\*\* or \*\*5-8 Welcome\*\*  
        \*   Action: "View Report" \-\> \*\*Diagnostic Report\*\*  
5\.  \*\*Diagnostic Report\*\* ({{DATA:SCREEN:SCREEN\_60}})  
    \*   \*\*Features\*\*: Radar chart, strand map, misconception cards.  
    \*   \*\*Action\*\*: "Download PDF" (Desktop only).

\---

\#\# 2\. Child Journey: K-4 (Sammy the Dachshund)  
\*Goal: Complete a playful, supportive math assessment.\*

1\.  \*\*K-4 Welcome\*\* ({{DATA:SCREEN:SCREEN\_68}})  
    \*   \*\*Action\*\*: Name confirmation \-\> Click "That's me\!"  
    \*   \*\*Destination\*\*: \*\*Practice Question\*\*  
2\.  \*\*K-4 Practice Question\*\* ({{DATA:SCREEN:SCREEN\_83}})  
    \*   \*\*Interaction\*\*: Answer tutorial \-\> Tapping auto-advances.  
    \*   \*\*Destination\*\*: \*\*Assessment Loop (Questions)\*\*  
3\.  \*\*Assessment Loop\*\* (Randomized order/Adaptive):  
    \*   \*\*Multiple Choice\*\* ({{DATA:SCREEN:SCREEN\_7}})  
    \*   \*\*Numeric Entry\*\* ({{DATA:SCREEN:SCREEN\_30}})  
    \*   \*\*Drag & Drop\*\* ({{DATA:SCREEN:SCREEN\_47}})  
4\.  \*\*Encouragement Interstitials\*\* ({{DATA:SCREEN:SCREEN\_82}})  
    \*   \*\*Trigger\*\*: Appears every 5 questions.  
    \*   \*\*Action\*\*: Auto-advances after 3s or "Keep going" click.  
5\.  \*\*Completion Screen\*\* ({{DATA:SCREEN:SCREEN\_19}})  
    \*   \*\*Action\*\*: Click "Show My Grown-up"  
    \*   \*\*Destination\*\*: \*\*Parent Dashboard\*\* (with Results Ready notification).

\---

\#\# 3\. Child Journey: 5-8 (Journey Map)  
\*Goal: Complete a mature, goal-oriented math assessment.\*

1\.  \*\*5-8 Welcome\*\* ({{DATA:SCREEN:SCREEN\_54}})  
    \*   \*\*Action\*\*: Avatar selection (Rocket/Planet/Star) \-\> Click "Begin"  
2\.  \*\*Journey Map Interstitial\*\* ({{DATA:SCREEN:SCREEN\_80}})  
    \*   \*\*Visual\*\*: Avatar advances along path.  
    \*   \*\*Action\*\*: Auto-advances to next question block.  
3\.  \*\*Advanced Assessment Loop\*\*:  
    \*   \*\*Numeric Entry (Journey)\*\* ({{DATA:SCREEN:SCREEN\_73}})  
    \*   \*\*Coordinate Geometry\*\* ({{DATA:SCREEN:SCREEN\_48}})  
    \*   \*\*Fraction Visualizer\*\* ({{DATA:SCREEN:SCREEN\_26}})  
    \*   \*\*Comparison Logic\*\* ({{DATA:SCREEN:SCREEN\_67}})  
4\.  \*\*Completion Journey\*\* ({{DATA:SCREEN:SCREEN\_70}})  
    \*   \*\*Action\*\*: Click "Show My Grown-up" \-\> \*\*Parent Dashboard\*\*.

\---

\#\# 4\. Instructor Journey: Student & Cohort Management  
\*Goal: Monitor student progress and analyze class performance.\*

1\.  \*\*Instructor Roster\*\* ({{DATA:SCREEN:SCREEN\_61}})  
    \*   \*\*State: Empty\*\* ({{DATA:SCREEN:SCREEN\_51}}) \-\> CTA: "Invite Students"  
    \*   \*\*State: Active\*\*: Table of students with status badges.  
    \*   \*\*Action\*\*: Click "View Report" \-\> \*\*Instructor Individual Report\*\*.  
2\.  \*\*Instructor Individual Report\*\* ({{DATA:SCREEN:SCREEN\_71}})  
    \*   \*\*Features\*\*: Full parent report view \+ \*\*Pedagogical Notes\*\* section.  
3\.  \*\*Cohort View\*\* ({{DATA:SCREEN:SCREEN\_28}})  
    \*   \*\*Navigation\*\*: Accessed via sidebar "Cohort Analytics".  
    \*   \*\*Features\*\*: Placement distribution charts, top misconceptions list.

\---

\#\# 5\. System States (Utilities)  
\*   \*\*Loading State\*\* ({{DATA:SCREEN:SCREEN\_11}}): Used between question groups and when generating reports.  
\*   \*\*Error State\*\* ({{DATA:SCREEN:SCREEN\_79}}): Generic fallback for 404 or connection loss.  
\*   \*\*Email Verification\*\* ({{DATA:SCREEN:SCREEN\_31}}): Interstitial after parent signup.

