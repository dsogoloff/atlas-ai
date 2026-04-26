\# Atlas Assessment: Design Foundation

This document serves as the primary technical reference for the visual style and UI architecture of the Atlas Assessment platform.

\#\# 1\. Core Brand Identity  
\- \*\*Primary Brand\*\*: Seriously Addictive Mathematics (S.A.M.)  
\- \*\*Sub-brand\*\*: Powered by Inspirea Labs  
\- \*\*Mascot\*\*: Brown long-haired mini dachshund (Friendly, 3D rendered style)

\#\# 2\. Design Tokens (Tailwind CSS Configuration)

\#\#\# Colors  
| Token | Hex | Usage |  
| :--- | :--- | :--- |  
| \`sam-red\` | \`\#E63946\` | Primary CTAs, Logo accents, Brand highlights |  
| \`sam-navy\` | \`\#1B3A6B\` | Headlines, Body text (Instructor/Parent), Brand contrast |  
| \`sam-cream\` | \`\#FFF8F0\` | Primary page backgrounds, Soft card surfaces |  
| \`sam-orange\` | \`\#F4A261\` | Secondary accents, progress highlights |  
| \`sam-yellow\` | \`\#FFD166\` | Success states, celebratory accents |  
| \`sam-teal\` | \`\#06A77D\` | Correct indicators, growth/progress bars |  
| \`white\` | \`\#FFFFFF\` | Primary card backgrounds, input fields |  
| \`surface-dim\` | \`\#F1E9DB\` | Border colors, soft dividers |

\#\#\# Typography  
\- \*\*Headlines (Parent/Instructor)\*\*: \`Plus Jakarta Sans\`, Semibold/Bold  
\- \*\*Headlines (Child-facing)\*\*: \`Fredoka\` or \`Quicksand\`, Rounded, Bold  
\- \*\*Body Text\*\*: \`Plus Jakarta Sans\` or \`Inter\`, Regular/Medium  
\- \*\*Math Numerals\*\*: \`Fredoka\`, clear geometric shapes for legibility

\#\#\# Layout & Shape  
\- \*\*Border Radius\*\*: 12px (Standard buttons), 24px (Question tiles), 32px (Large cards)  
\- \*\*Shadows\*\*: Soft, low-elevation shadows (\`shadow-sm\` to \`shadow-md\`) to maintain a friendly, tactile feel.  
\- \*\*Max Content Width\*\*: 1200px (Desktop), Full-width (Tablet/Mobile)

\#\# 3\. Component Architecture

\#\#\# Global Navigation  
\- \*\*Parent/Instructor (Desktop)\*\*: Fixed Sidebar (240px) with brand logo and vertical nav items.  
\- \*\*Child Assessment (Tablet)\*\*: Slim top bar (60px) containing progress journey and pause controls.  
\- \*\*Mobile Navigation\*\*: Bottom Navigation Bar for primary dashboard destinations.

\#\#\# Interactive Elements  
\- \*\*Primary Buttons\*\*: \`bg-\[\#E63946\] text-white rounded-xl py-4 px-8 font-bold transition-transform active:scale-95\`  
\- \*\*Question Tiles\*\*: Large, tappable white cards with thick \`sam-navy\` or \`sam-red\` borders on selection.  
\- \*\*Input Fields\*\*: Soft cream backgrounds with navy text and prominent rounded corners.

\#\# 4\. Visual Assets (DataStore References)  
\- \*\*Mascot (Waving)\*\*: {{DATA:IMAGE:IMAGE\_37}}  
\- \*\*Mascot (Thinking)\*\*: {{DATA:IMAGE:IMAGE\_2}}  
\- \*\*Mascot (Cheering)\*\*: {{DATA:IMAGE:IMAGE\_58}}  
\- \*\*Mascot (Math Symbols)\*\*: {{DATA:IMAGE:IMAGE\_82}}

\---  
\*Refer to DESIGN.md ({{DATA:DOCUMENT:DOCUMENT\_15}}) for full markdown tokens.\*  
