<!-- Module D - 1: Parent Dashboard (Desktop) -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Atlas Assessment - Parent Dashboard</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "tertiary-container": "#936f03",
                    "on-tertiary": "#ffffff",
                    "on-tertiary-container": "#fffbff",
                    "surface-container-low": "#f1f3ff",
                    "sam-navy": "#1B3A6B",
                    "on-surface": "#001a40",
                    "secondary-fixed-dim": "#ffb780",
                    "on-primary-container": "#fffbff",
                    "tertiary-fixed-dim": "#edc157",
                    "inverse-on-surface": "#edf0ff",
                    "on-tertiary-fixed": "#251a00",
                    "on-primary": "#ffffff",
                    "outline-variant": "#e4bebc",
                    "on-error": "#ffffff",
                    "error": "#ba1a1a",
                    "on-surface-variant": "#5b403f",
                    "surface-dim": "#cadaff",
                    "inverse-surface": "#0d2f60",
                    "sam-yellow": "#FFD166",
                    "on-error-container": "#93000a",
                    "sam-gray-dark": "#333333",
                    "surface-container": "#e8edff",
                    "primary-container": "#db313f",
                    "primary-fixed": "#ffdad8",
                    "on-secondary": "#ffffff",
                    "surface-container-high": "#e0e8ff",
                    "surface-container-lowest": "#ffffff",
                    "sam-gray-mid": "#777777",
                    "on-background": "#001a40",
                    "primary-fixed-dim": "#ffb3b1",
                    "surface-tint": "#bb152c",
                    "secondary": "#8e4e14",
                    "sam-red": "#E63946",
                    "error-container": "#ffdad6",
                    "on-primary-fixed": "#410007",
                    "inverse-primary": "#ffb3b1",
                    "surface-container-highest": "#d7e2ff",
                    "secondary-fixed": "#ffdcc4",
                    "secondary-container": "#ffab69",
                    "white": "#FFFFFF",
                    "on-secondary-fixed-variant": "#6f3800",
                    "sam-orange": "#F4A261",
                    "background": "#f9f9ff",
                    "tertiary-fixed": "#ffdf9b",
                    "surface-variant": "#d7e2ff",
                    "tertiary": "#755700",
                    "sam-cream": "#FFF8F0",
                    "on-secondary-fixed": "#2f1400",
                    "on-tertiary-fixed-variant": "#5b4300",
                    "surface-bright": "#f9f9ff",
                    "sam-gray-light": "#E5E5E5",
                    "sam-teal": "#06A77D",
                    "surface": "#f9f9ff",
                    "primary": "#b7102a",
                    "on-primary-fixed-variant": "#92001c",
                    "on-secondary-container": "#783d01",
                    "outline": "#8f6f6e"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "stack-lg": "32px",
                    "report-width": "880px",
                    "margin-desktop": "40px",
                    "gutter": "24px",
                    "margin-tablet": "32px",
                    "unit": "4px",
                    "stack-sm": "8px",
                    "container-max": "1440px",
                    "stack-md": "16px"
            },
            "fontFamily": {
                    "display-child": ["Plus Jakarta Sans"],
                    "math-numeral": ["Plus Jakarta Sans"],
                    "headline-adult": ["Inter"],
                    "caption": ["Inter"],
                    "body-regular": ["Inter"]
            },
            "fontSize": {
                    "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                    "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                    "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                    "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                    "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .bento-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 24px;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
    </style>
</head>
<body class="bg-sam-cream min-h-screen text-on-surface selection:bg-sam-red/20">
<!-- TopAppBar -->
<header class="bg-[#FDFBF7] flex justify-between items-center w-full px-4 py-3 h-16 border-b border-gray-200 docked full-width top-0 z-50">
<div class="flex items-center gap-4">
<button class="material-symbols-outlined text-[#1B3A6B] transition-colors duration-200 active:scale-95 hover:bg-gray-100 p-2 rounded-full">menu</button>
<h1 class="text-[#1B3A6B] font-extrabold text-xl font-['Plus_Jakarta_Sans'] tracking-tight">Atlas Assessment</h1>
</div>
<div class="flex items-center gap-4">
<div class="hidden md:flex items-center gap-6 mr-6">
<a class="text-[#E63946] font-['Plus_Jakarta_Sans'] font-bold text-lg" href="#">Reports</a>
<a class="text-[#1B3A6B] font-['Plus_Jakarta_Sans'] font-bold text-lg hover:text-[#E63946] transition-colors" href="#">Resources</a>
</div>
<div class="w-10 h-10 rounded-full bg-sam-navy flex items-center justify-center text-white font-bold overflow-hidden">
<img class="w-full h-full object-cover" data-alt="Portrait of a smiling professional woman, high-end photography, soft natural lighting, blurry office background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2R4s2iO7ohCYkFkrnVZUHJNtAS8og8ayn-CGn_ysCH1MhA59TJbT16iKV1bqxCDfWxPCbKreiavvfyHIaKbxGnYVtakSGfLpPvDlqU3nH3613LkfRDUnI4yKJMTePLAlvlURth_Dx3ZD8r9KYJkavfCi6KJ_LIzRiQbOlehzYA4eHA6R5geqNpt09KD30JbM8o00GJAKVVSeWHqYmKMqUv85fLvXwZyY8rSG2KzV6RubQSkUq4GI9XuWXYRoiJZmTOkyWgLUFe6Ai"/>
</div>
</div>
</header>
<main class="max-w-[1200px] mx-auto px-4 py-8 pb-32">
<!-- Hero Section / Welcome -->
<div class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
<div>
<span class="text-sam-red font-headline-adult text-caption tracking-widest uppercase mb-2 block">Instructor View</span>
<h2 class="font-headline-adult text-[40px] leading-tight text-sam-navy mb-2">Welcome back, Sarah</h2>
<p class="font-body-regular text-sam-gray-mid max-w-lg">Monitor student diagnostic progress and review detailed performance metrics for the S.A.M. Level 2 Cohort.</p>
</div>
<div class="flex gap-4">
<button class="bg-white border-2 border-sam-navy text-sam-navy px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-sam-navy hover:text-white transition-all active:scale-95">
<span class="material-symbols-outlined">download</span>
                    Export Class Data
                </button>
</div>
</div>
<!-- Metric Overview Grid (Bento Style) -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
<div class="md:col-span-2 glass-card rounded-3xl p-8 shadow-[0_4px_12px_rgba(27,58,107,0.08)] flex flex-col justify-between">
<div>
<h3 class="text-sam-navy font-headline-adult text-caption font-bold mb-4">COHORT PROGRESS</h3>
<div class="flex items-end gap-2 mb-6">
<span class="text-5xl font-black text-sam-navy leading-none">84%</span>
<span class="text-sam-teal font-bold mb-1 flex items-center gap-1"><span class="material-symbols-outlined text-sm">trending_up</span> +5%</span>
</div>
</div>
<div class="w-full h-4 bg-sam-gray-light rounded-full overflow-hidden">
<div class="w-[84%] h-full bg-sam-red rounded-full"></div>
</div>
</div>
<div class="bg-sam-navy rounded-3xl p-8 shadow-xl text-white flex flex-col justify-between">
<h3 class="text-white/70 font-headline-adult text-caption font-bold">TOTAL STUDENTS</h3>
<div class="text-5xl font-black">24</div>
<div class="text-white/60 text-sm">Active Enrolled</div>
</div>
<div class="bg-sam-teal rounded-3xl p-8 shadow-xl text-white flex flex-col justify-between">
<h3 class="text-white/70 font-headline-adult text-caption font-bold">AVG. SCORE</h3>
<div class="text-5xl font-black">72</div>
<div class="text-white/60 text-sm">Diagnostic Points</div>
</div>
</div>
<!-- Student Cards Grid -->
<h3 class="font-headline-adult text-xl text-sam-navy mb-6 flex items-center gap-2">
<span class="material-symbols-outlined">group</span>
            Student Rosters
        </h3>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
<!-- Student Card 1: Completed -->
<div class="bg-white rounded-[32px] p-6 shadow-[0_4px_12px_rgba(27,58,107,0.08)] hover:shadow-xl transition-shadow border-2 border-transparent hover:border-sam-red/10 cursor-pointer">
<div class="flex justify-between items-start mb-6">
<div class="flex items-center gap-4">
<div class="w-16 h-16 rounded-2xl bg-sam-cream flex items-center justify-center overflow-hidden border-2 border-sam-gray-light">
<img class="w-full h-full object-cover" data-alt="Portrait of a young joyful Asian student boy wearing a yellow t-shirt, studio lighting, clean background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8ePUorvordmTOQVGTr1Dx-n6UlF-BWkQE_oBGBqAmMETGiCRVDnrSOYjwLqgUzMHLHhWzoxF5hsKAeJSEc4FXMf0yHYyvBEmzyQuMvpH0eFqlouC1lDpM8EJIcnoD_zcXRa8I_tVm67DGOy_4-X9hoDCJHgqc-xHvm6XxkuTIVu24XyiUgMun2PO9FyEMAQXmQ5dkHNRiFNf4Z6sX2XFv07z_GIV1v_LI43eNV0SIUMDnyOLhEFYegpOhQ_DOkgd7vzi1IAGIl0N5"/>
</div>
<div>
<h4 class="font-headline-adult text-lg text-sam-navy leading-tight">Oliver Zhang</h4>
<span class="text-xs font-bold text-sam-teal bg-sam-teal/10 px-2 py-1 rounded-full uppercase tracking-wider">Complete</span>
</div>
</div>
<div class="bg-sam-cream p-2 rounded-xl">
<span class="material-symbols-outlined text-sam-navy">more_vert</span>
</div>
</div>
<div class="space-y-4 mb-6">
<div class="flex justify-between items-center text-sm">
<span class="text-sam-gray-mid">Visual Thinking</span>
<span class="font-bold text-sam-navy">92%</span>
</div>
<div class="w-full h-2 bg-sam-gray-light rounded-full">
<div class="w-[92%] h-full bg-sam-teal rounded-full"></div>
</div>
<div class="flex justify-between items-center text-sm">
<span class="text-sam-gray-mid">Number Sense</span>
<span class="font-bold text-sam-navy">78%</span>
</div>
<div class="w-full h-2 bg-sam-gray-light rounded-full">
<div class="w-[78%] h-full bg-sam-teal rounded-full"></div>
</div>
</div>
<button class="w-full py-4 bg-sam-red text-white rounded-2xl font-bold hover:bg-primary-container transition-all active:scale-[0.98]">
                    View Diagnostic Report
                </button>
</div>
<!-- Student Card 2: In Progress -->
<div class="bg-white rounded-[32px] p-6 shadow-[0_4px_12px_rgba(27,58,107,0.08)] hover:shadow-xl transition-shadow border-2 border-transparent hover:border-sam-red/10 cursor-pointer">
<div class="flex justify-between items-start mb-6">
<div class="flex items-center gap-4">
<div class="w-16 h-16 rounded-2xl bg-sam-cream flex items-center justify-center overflow-hidden border-2 border-sam-gray-light">
<img class="w-full h-full object-cover" data-alt="Close-up of a young girl with curly hair smiling, warm bright lighting, soft focus background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbSuTfLRknnBymCSE69QMj3PR3mJRyp2yZcyWKcB9XfsjSpPXjJk_FptBMdvelPAAA4msfpUOk5Ju3xn4w81zkjhplWn_aW0n3gZIx5rwUUNzeTmXEKhB_TswCYzIsFg9czcfKWpPQIcA6pTRAzgPTXb5aaXbxW79JeJ0OWhoGxCZ3mz6ArygqoW-O0tAXcsvEkoF7qTK4AmbXi86jgkqa4oTjlkhUpBfN-LHxFKBuW5c2qquLa3KsZ5wcEUc6aD_JJqKUH4lEb5Kx"/>
</div>
<div>
<h4 class="font-headline-adult text-lg text-sam-navy leading-tight">Maya Rodriguez</h4>
<span class="text-xs font-bold text-sam-orange bg-sam-orange/10 px-2 py-1 rounded-full uppercase tracking-wider">In Progress</span>
</div>
</div>
<div class="bg-sam-cream p-2 rounded-xl">
<span class="material-symbols-outlined text-sam-navy">more_vert</span>
</div>
</div>
<div class="bg-sam-cream/50 rounded-2xl p-4 mb-6">
<div class="flex items-center gap-3 text-sam-navy mb-2">
<span class="material-symbols-outlined">timer</span>
<span class="font-bold text-sm">Currently Active</span>
</div>
<p class="text-xs text-sam-gray-dark leading-relaxed">Solving: Multi-step word problems (Level 3 Strand)</p>
</div>
<div class="space-y-4 mb-6">
<div class="w-full h-2 bg-sam-gray-light rounded-full overflow-hidden">
<div class="w-[45%] h-full bg-sam-orange rounded-full"></div>
</div>
<div class="flex justify-between text-xs font-bold text-sam-gray-mid">
<span>45% Completed</span>
<span>12/28 Tasks</span>
</div>
</div>
<button class="w-full py-4 border-2 border-sam-navy text-sam-navy rounded-2xl font-bold hover:bg-sam-navy hover:text-white transition-all active:scale-[0.98]">
                    Live Monitor
                </button>
</div>
<!-- Student Card 3: Ready to Start -->
<div class="bg-white rounded-[32px] p-6 shadow-[0_4px_12px_rgba(27,58,107,0.08)] hover:shadow-xl transition-shadow border-2 border-transparent hover:border-sam-red/10 cursor-pointer">
<div class="flex justify-between items-start mb-6">
<div class="flex items-center gap-4">
<div class="w-16 h-16 rounded-2xl bg-sam-cream flex items-center justify-center overflow-hidden border-2 border-sam-gray-light">
<img class="w-full h-full object-cover" data-alt="Portrait of a young boy student looking at camera, soft lighting, minimalist background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXaRuUpf26TiFGh0fGIHFjjbs7z0FVfJOEhYgIlpzRn4D9jQJaODP1vDwZbj8OMaKZW38pI4P5cotC895UU2ZqAwwPgIp8HyGpBckiJudj1Atx7ZK1U4cEETWL5eOVT0oDDoyHhhAgy0PcqiPPOrkNPMiWB8ywM-sYWk7UmEv5poL3223UAwKviH0blnhqSHHfME9eM7ZC7S-TjHV2Pdl9HJeY5TiSXG7dezZ_B68n7jRqiQ7hzgxiivJ60sewp8HAXJQem40DhnPA"/>
</div>
<div>
<h4 class="font-headline-adult text-lg text-sam-navy leading-tight">Liam Thompson</h4>
<span class="text-xs font-bold text-sam-gray-mid bg-sam-gray-light px-2 py-1 rounded-full uppercase tracking-wider">Scheduled</span>
</div>
</div>
<div class="bg-sam-cream p-2 rounded-xl">
<span class="material-symbols-outlined text-sam-navy">more_vert</span>
</div>
</div>
<div class="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-sam-gray-light rounded-2xl mb-6">
<span class="material-symbols-outlined text-sam-gray-light text-4xl mb-2">calendar_today</span>
<span class="text-sm font-bold text-sam-navy">Next Session</span>
<span class="text-xs text-sam-gray-mid">Oct 24, 2023 at 10:00 AM</span>
</div>
<button class="w-full py-4 bg-sam-gray-light text-sam-gray-mid rounded-2xl font-bold cursor-not-allowed">
                    Report Not Ready
                </button>
</div>
</div>
<!-- Insight Section (Asymmetric) -->
<div class="mt-16 bg-[#1B3A6B] rounded-[40px] overflow-hidden flex flex-col md:flex-row relative">
<div class="p-12 md:w-3/5 z-10">
<h3 class="text-white font-headline-adult text-3xl mb-4">Cohort Misconception Alert</h3>
<p class="text-white/80 font-body-regular mb-8 leading-relaxed">
                    65% of your class is currently struggling with **Visual Word Problems involving Division**. We've prepared a targeted worksheet bundle to address this specific gap before the next assessment module.
                </p>
<div class="flex gap-4">
<button class="bg-sam-red text-white px-8 py-4 rounded-2xl font-bold hover:shadow-lg transition-all">Download Worksheets</button>
<button class="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold hover:bg-white/20 transition-all">View Analytics</button>
</div>
</div>
<div class="md:w-2/5 relative min-h-[300px]">
<div class="absolute inset-0 bg-gradient-to-l from-[#1B3A6B] via-transparent to-transparent z-10"></div>
<img class="w-full h-full object-cover" data-alt="Abstract colorful education concept with books and geometry shapes floating in soft light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_-ctpMajWS0vbnZ7_mrtVmvmw_XNTrWthAj0JU9IYNNdm0MPIdBRLydtauj3m08W5YVoqLWjRDSpOKX-REKily_fIl5hYfjuZTHRG1PAw0MIZb-lU5YVQ2vG5oJ5Rjp1EE3eskrgpDy59X9SFjXUzbCVdQKnkRX84BeNcIN45cBUt9UeuvQUvepFQoyXOf2TP7SsbngRkUxZFScbK8fiKBo26LWahHHeC7zoROZ1YlJwVTX4oegOm35ONALMSj97G9oxvtZUBoxIB"/>
</div>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-2xl md:hidden">
<a class="flex flex-col items-center justify-center text-[#E63946] dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-1" href="#">
<span class="material-symbols-outlined">group</span>
<span class="font-['Plus_Jakarta_Sans'] font-medium text-[12px]">Roster</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#E63946] transition-transform scale-100 active:scale-90" href="#">
<span class="material-symbols-outlined">analytics</span>
<span class="font-['Plus_Jakarta_Sans'] font-medium text-[12px]">Cohort</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#E63946] transition-transform scale-100 active:scale-90" href="#">
<span class="material-symbols-outlined">assessment</span>
<span class="font-['Plus_Jakarta_Sans'] font-medium text-[12px]">Reports</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#E63946] transition-transform scale-100 active:scale-90" href="#">
<span class="material-symbols-outlined">settings</span>
<span class="font-['Plus_Jakarta_Sans'] font-medium text-[12px]">Settings</span>
</a>
</nav>
<!-- Floating Action Button -->
<button class="fixed bottom-8 right-8 w-16 h-16 bg-sam-red text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40">
<span class="material-symbols-outlined text-3xl">add</span>
</button>
</body></html>

<!-- Module D - 2: Parent Dashboard - Empty (Desktop) -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Parent Dashboard | Atlas Assessment</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "tertiary-container": "#936f03",
                    "on-tertiary": "#ffffff",
                    "on-tertiary-container": "#fffbff",
                    "surface-container-low": "#f1f3ff",
                    "sam-navy": "#1B3A6B",
                    "on-surface": "#001a40",
                    "secondary-fixed-dim": "#ffb780",
                    "on-primary-container": "#fffbff",
                    "tertiary-fixed-dim": "#edc157",
                    "inverse-on-surface": "#edf0ff",
                    "on-tertiary-fixed": "#251a00",
                    "on-primary": "#ffffff",
                    "outline-variant": "#e4bebc",
                    "on-error": "#ffffff",
                    "error": "#ba1a1a",
                    "on-surface-variant": "#5b403f",
                    "surface-dim": "#cadaff",
                    "inverse-surface": "#0d2f60",
                    "sam-yellow": "#FFD166",
                    "on-error-container": "#93000a",
                    "sam-gray-dark": "#333333",
                    "surface-container": "#e8edff",
                    "primary-container": "#db313f",
                    "primary-fixed": "#ffdad8",
                    "on-secondary": "#ffffff",
                    "surface-container-high": "#e0e8ff",
                    "surface-container-lowest": "#ffffff",
                    "sam-gray-mid": "#777777",
                    "on-background": "#001a40",
                    "primary-fixed-dim": "#ffb3b1",
                    "surface-tint": "#bb152c",
                    "secondary": "#8e4e14",
                    "sam-red": "#E63946",
                    "error-container": "#ffdad6",
                    "on-primary-fixed": "#410007",
                    "inverse-primary": "#ffb3b1",
                    "surface-container-highest": "#d7e2ff",
                    "secondary-fixed": "#ffdcc4",
                    "secondary-container": "#ffab69",
                    "white": "#FFFFFF",
                    "on-secondary-fixed-variant": "#6f3800",
                    "sam-orange": "#F4A261",
                    "background": "#f9f9ff",
                    "tertiary-fixed": "#ffdf9b",
                    "surface-variant": "#d7e2ff",
                    "tertiary": "#755700",
                    "sam-cream": "#FFF8F0",
                    "on-secondary-fixed": "#2f1400",
                    "on-tertiary-fixed-variant": "#5b4300",
                    "surface-bright": "#f9f9ff",
                    "sam-gray-light": "#E5E5E5",
                    "sam-teal": "#06A77D",
                    "surface": "#f9f9ff",
                    "primary": "#b7102a",
                    "on-primary-fixed-variant": "#92001c",
                    "on-secondary-container": "#783d01",
                    "outline": "#8f6f6e"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "stack-lg": "32px",
                    "report-width": "880px",
                    "margin-desktop": "40px",
                    "gutter": "24px",
                    "margin-tablet": "32px",
                    "unit": "4px",
                    "stack-sm": "8px",
                    "container-max": "1440px",
                    "stack-md": "16px"
            },
            "fontFamily": {
                    "display-child": ["Plus Jakarta Sans"],
                    "math-numeral": ["Plus Jakarta Sans"],
                    "headline-adult": ["Inter"],
                    "caption": ["Inter"],
                    "body-regular": ["Inter"]
            },
            "fontSize": {
                    "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                    "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                    "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                    "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                    "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
            }
          },
        },
      }
    </script>
<style>
        body { background-color: #FFF8F0; }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
    </style>
</head>
<body class="font-body-regular text-sam-navy min-h-screen flex flex-col">
<!-- TopAppBar Navigation -->
<header class="bg-[#FDFBF7] dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 fixed top-0 left-0 w-full z-50">
<div class="flex justify-between items-center w-full px-4 py-3 h-16 max-w-7xl mx-auto">
<div class="flex items-center gap-4">
<button class="transition-colors duration-200 active:scale-95 text-[#1B3A6B] hover:bg-gray-100 dark:hover:bg-slate-800 p-2 rounded-full">
<span class="material-symbols-outlined">menu</span>
</button>
<h1 class="text-[#1B3A6B] dark:text-slate-100 font-extrabold text-xl font-['Plus_Jakarta_Sans']">Atlas Assessment</h1>
</div>
<div class="flex items-center gap-6">
<nav class="hidden md:flex gap-8">
<a class="font-['Plus_Jakarta_Sans'] font-bold text-lg tracking-tight text-[#E63946]" href="#">Roster</a>
<a class="font-['Plus_Jakarta_Sans'] font-bold text-lg tracking-tight text-[#1B3A6B] hover:bg-gray-100 dark:hover:bg-slate-800 px-2 rounded" href="#">Cohort</a>
<a class="font-['Plus_Jakarta_Sans'] font-bold text-lg tracking-tight text-[#1B3A6B] hover:bg-gray-100 dark:hover:bg-slate-800 px-2 rounded" href="#">Reports</a>
<a class="font-['Plus_Jakarta_Sans'] font-bold text-lg tracking-tight text-[#1B3A6B] hover:bg-gray-100 dark:hover:bg-slate-800 px-2 rounded" href="#">Settings</a>
</nav>
<div class="h-10 w-10 rounded-full overflow-hidden border-2 border-sam-red shadow-sm">
<img alt="Parent Avatar" data-alt="professional portrait of a smiling parent in a soft focus domestic setting, warm lighting, approachable and friendly appearance" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA34h4JnaI5SIRW2-FWMRoCwMYRhSvWainjwDk2XurTIvQJUm3FR035XlF5O82YF8CdbINgAx9F-zaiS7zT2ej-UY7f4mOoKUiRYOFyuzelI0lCUMWtR_ZEkb6LUhiBOQYBcqB-CIsbGzsQMlA3DqNa-0shjboZ3dmACYjW8RsaLIHMPypXvXWomIVLjSh6SpCcZ8-YLixDxhJDuGBcqP1fbo-IC0_Trjj4GUTd_405rgNyA7xsfhE_0kQn0HGmYTF69eEiHk-lb04O"/>
</div>
</div>
</div>
</header>
<!-- Main Content Canvas -->
<main class="flex-grow pt-24 pb-32 px-4 md:px-8 max-w-screen-report-width mx-auto w-full flex flex-col items-center justify-center">
<!-- Empty State Hero Card -->
<div class="w-full bg-white rounded-[32px] shadow-[0_4px_12px_rgba(27,58,107,0.08)] p-8 md:p-16 text-center border border-sam-gray-light relative overflow-hidden">
<!-- Mascot Integration: Sammy the Otter -->
<div class="mb-10 flex justify-center">
<div class="relative w-64 h-64">
<img alt="Sammy the Otter Mascot" class="w-full h-full object-contain" data-alt="playful and friendly cartoon otter mascot wearing a small red bowtie, waving warmly, clean 2D vector style, vibrant colors" src="https://lh3.googleusercontent.com/aida-public/AB6AXuByPETD9mqnFFQltWaUrE7n298tepu9tpWJOpAmtTSDwGRgFmKEjy84eKJ1NNKP_HnfGxfnGwZyZdd7dZEFidlQxKGwam_Sfmp5XvRkoeap3dtho_9O-IKYoi6BsIV8V1-H85_4wH0v1FV5qbpDROId4-KlQbO_eXct1u2prlz-8N5ATKy1TKGUpYiLRgo_AgguGNfbOsm0Q1ZWLFkTHuwHPXrGetk8AcclkzKrcflX9bUyTFRORoJ0NchHzT47Q6Q1ZwoRf6-CW1ft"/>
<!-- Speech Bubble -->
<div class="absolute -top-4 -right-12 bg-sam-cream border-2 border-sam-navy p-4 rounded-2xl shadow-md max-w-[200px]">
<p class="font-display-child text-sm text-sam-navy leading-tight">Ready to discover your child's math journey?</p>
<div class="absolute -bottom-2 left-6 w-4 h-4 bg-sam-cream border-b-2 border-r-2 border-sam-navy transform rotate-45"></div>
</div>
</div>
</div>
<!-- Content -->
<h2 class="font-headline-adult text-sam-navy mb-4">Welcome to the Atlas Family!</h2>
<p class="font-body-regular text-sam-gray-dark mb-10 max-w-lg mx-auto">
                You haven't added any students to your roster yet. Start by creating a profile for your child to begin their diagnostic mathematical journey.
            </p>
<!-- Primary CTA -->
<button class="bg-sam-red text-white font-['Plus_Jakarta_Sans'] font-bold py-5 px-12 rounded-[16px] text-lg shadow-lg hover:bg-[#D62E3B] transition-all transform active:scale-95 flex items-center gap-3 mx-auto">
<span class="material-symbols-outlined">person_add</span>
                Add Your First Child
            </button>
<!-- Secondary Path Indicators (Visual Flourish) -->
<div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
<div class="flex flex-col items-center p-4">
<div class="w-12 h-12 rounded-full bg-sam-cream flex items-center justify-center text-sam-navy mb-3">
<span class="material-symbols-outlined">analytics</span>
</div>
<span class="text-caption font-semibold">Track Progress</span>
</div>
<div class="flex flex-col items-center p-4">
<div class="w-12 h-12 rounded-full bg-sam-cream flex items-center justify-center text-sam-navy mb-3">
<span class="material-symbols-outlined">psychology</span>
</div>
<span class="text-caption font-semibold">Identify Gaps</span>
</div>
<div class="flex flex-col items-center p-4">
<div class="w-12 h-12 rounded-full bg-sam-cream flex items-center justify-center text-sam-navy mb-3">
<span class="material-symbols-outlined">emoji_events</span>
</div>
<span class="text-caption font-semibold">Celebrate Wins</span>
</div>
</div>
</div>
<!-- Quick Help Section -->
<div class="mt-12 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
<div class="bg-white/50 p-6 rounded-2xl border border-sam-gray-light flex items-start gap-4">
<div class="text-sam-orange">
<span class="material-symbols-outlined text-3xl">play_circle</span>
</div>
<div>
<h4 class="font-bold text-sam-navy">How it works</h4>
<p class="text-sm text-sam-gray-mid">A 3-minute guide to setting up your dashboard.</p>
</div>
</div>
<div class="bg-white/50 p-6 rounded-2xl border border-sam-gray-light flex items-start gap-4">
<div class="text-sam-teal">
<span class="material-symbols-outlined text-3xl">help_outline</span>
</div>
<div>
<h4 class="font-bold text-sam-navy">Support Center</h4>
<p class="text-sm text-sam-gray-mid">Got questions about the assessment? We're here.</p>
</div>
</div>
</div>
</main>
<!-- BottomNavBar (Mobile Only) -->
<nav class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-2xl">
<a class="flex flex-col items-center justify-center text-[#E63946] dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-1 scale-100 active:scale-90 transition-transform" href="#">
<span class="material-symbols-outlined">group</span>
<span class="font-['Plus_Jakarta_Sans'] font-medium text-[12px]">Roster</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#E63946] scale-100 active:scale-90 transition-transform" href="#">
<span class="material-symbols-outlined">analytics</span>
<span class="font-['Plus_Jakarta_Sans'] font-medium text-[12px]">Cohort</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#E63946] scale-100 active:scale-90 transition-transform" href="#">
<span class="material-symbols-outlined">assessment</span>
<span class="font-['Plus_Jakarta_Sans'] font-medium text-[12px]">Reports</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#E63946] scale-100 active:scale-90 transition-transform" href="#">
<span class="material-symbols-outlined">settings</span>
<span class="font-['Plus_Jakarta_Sans'] font-medium text-[12px]">Settings</span>
</a>
</nav>
</body></html>

<!-- Module D - 4: Diagnostic Report (Desktop) -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Atlas Assessment - Diagnostic Report</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "tertiary-container": "#936f03",
                        "on-tertiary": "#ffffff",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "sam-navy": "#1B3A6B",
                        "on-surface": "#001a40",
                        "secondary-fixed-dim": "#ffb780",
                        "on-primary-container": "#fffbff",
                        "tertiary-fixed-dim": "#edc157",
                        "inverse-on-surface": "#edf0ff",
                        "on-tertiary-fixed": "#251a00",
                        "on-primary": "#ffffff",
                        "outline-variant": "#e4bebc",
                        "on-error": "#ffffff",
                        "error": "#ba1a1a",
                        "on-surface-variant": "#5b403f",
                        "surface-dim": "#cadaff",
                        "inverse-surface": "#0d2f60",
                        "sam-yellow": "#FFD166",
                        "on-error-container": "#93000a",
                        "sam-gray-dark": "#333333",
                        "surface-container": "#e8edff",
                        "primary-container": "#db313f",
                        "primary-fixed": "#ffdad8",
                        "on-secondary": "#ffffff",
                        "surface-container-high": "#e0e8ff",
                        "surface-container-lowest": "#ffffff",
                        "sam-gray-mid": "#777777",
                        "on-background": "#001a40",
                        "primary-fixed-dim": "#ffb3b1",
                        "surface-tint": "#bb152c",
                        "secondary": "#8e4e14",
                        "sam-red": "#E63946",
                        "error-container": "#ffdad6",
                        "on-primary-fixed": "#410007",
                        "inverse-primary": "#ffb3b1",
                        "surface-container-highest": "#d7e2ff",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "white": "#FFFFFF",
                        "on-secondary-fixed-variant": "#6f3800",
                        "sam-orange": "#F4A261",
                        "background": "#f9f9ff",
                        "tertiary-fixed": "#ffdf9b",
                        "surface-variant": "#d7e2ff",
                        "tertiary": "#755700",
                        "sam-cream": "#FFF8F0",
                        "on-secondary-fixed": "#2f1400",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "surface-bright": "#f9f9ff",
                        "sam-gray-light": "#E5E5E5",
                        "sam-teal": "#06A77D",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-primary-fixed-variant": "#92001c",
                        "on-secondary-container": "#783d01",
                        "outline": "#8f6f6e"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "stack-lg": "32px",
                        "report-width": "880px",
                        "margin-desktop": "40px",
                        "gutter": "24px",
                        "margin-tablet": "32px",
                        "unit": "4px",
                        "stack-sm": "8px",
                        "container-max": "1440px",
                        "stack-md": "16px"
                    }
                }
            }
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .radar-chart-bg {
            background-image: radial-gradient(circle, #E5E5E5 1px, transparent 1px);
            background-size: 20px 20px;
        }
    </style>
</head>
<body class="bg-sam-cream font-body-regular text-on-surface antialiased">
<!-- TopAppBar -->
<header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm docked full-width top-0 z-50 fixed w-full h-16 flex justify-between items-center px-6">
<div class="flex items-center gap-stack-md">
<span class="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans']">Atlas Assessment</span>
</div>
<div class="flex items-center gap-6">
<div class="hidden md:flex items-center gap-8 font-['Plus_Jakarta_Sans'] text-sm">
<a class="text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors px-2 py-1 rounded" href="#">Student Roster</a>
<a class="text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors px-2 py-1 rounded" href="#">Cohort Analytics</a>
<a class="text-[#E63946] font-bold px-2 py-1 rounded" href="#">Diagnostic Reports</a>
<a class="text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors px-2 py-1 rounded" href="#">Resources</a>
</div>
<div class="flex items-center gap-4">
<button class="material-symbols-outlined text-slate-600 dark:text-slate-400 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all">notifications</button>
<button class="material-symbols-outlined text-slate-600 dark:text-slate-400 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all">help_outline</button>
<img alt="Instructor Profile Avatar" class="w-8 h-8 rounded-full object-cover ring-2 ring-sam-red ring-offset-2" data-alt="Professional headshot of a female educator with a friendly smile, soft natural lighting in a modern office" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDy8dLz44a3BT0_2cVBhPDGOkCz4_3sU9jSElN2ZGfOj1iA5ZdYUZ-_5VWTRlnPpWFPQxiMkbo_8SWtgOgEeMGx7Wins0IS0p-UKGe2iiS3QBu28IqRrK5Fg6YjMc09h7CmVtPxUHjwT7FzVlVn2qpCLayKowcojcvlN6Rljd9f06LJVNEVgmRdCEMw0Bz-X6ly0-DCCl_1kOQMBUSrn7k3QR2LY7PUTANx1UwXZtgaX1vPOmU5vrTDwWBsRwxiCMqZQ9ixiLV7oaEf"/>
</div>
</div>
</header>
<!-- SideNavBar -->
<aside class="bg-slate-50 dark:bg-slate-950 h-screen w-64 fixed left-0 top-0 border-r border-slate-200 dark:border-slate-800 flat no-shadows hidden lg:flex flex-col pt-20 pb-6 z-40">
<div class="px-6 mb-8">
<h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-['Plus_Jakarta_Sans']">Instructor Portal</h2>
<p class="text-[12px] text-slate-500 font-medium">Diagnostic Dashboard</p>
</div>
<nav class="flex-1 px-3 space-y-1">
<a class="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all font-['Plus_Jakarta_Sans'] text-[14px] font-medium group" href="#">
<span class="material-symbols-outlined group-hover:text-slate-900">group</span>
                Student Roster
            </a>
<a class="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all font-['Plus_Jakarta_Sans'] text-[14px] font-medium group" href="#">
<span class="material-symbols-outlined group-hover:text-slate-900">analytics</span>
                Cohort Analytics
            </a>
<a class="flex items-center gap-3 px-3 py-3 rounded-lg bg-white dark:bg-slate-900 text-[#E63946] border-r-4 border-[#E63946] shadow-sm font-['Plus_Jakarta_Sans'] text-[14px] font-medium" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">assessment</span>
                Diagnostic Reports
            </a>
<a class="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all font-['Plus_Jakarta_Sans'] text-[14px] font-medium group" href="#">
<span class="material-symbols-outlined group-hover:text-slate-900">menu_book</span>
                Resources
            </a>
</nav>
<div class="px-3 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-1">
<a class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 transition-all font-['Plus_Jakarta_Sans'] text-[14px]" href="#">
<span class="material-symbols-outlined">settings</span>
                Settings
            </a>
<a class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 transition-all font-['Plus_Jakarta_Sans'] text-[14px]" href="#">
<span class="material-symbols-outlined">contact_support</span>
                Support
            </a>
</div>
</aside>
<!-- Main Content Canvas -->
<main class="lg:ml-64 pt-24 pb-16 px-6 lg:px-margin-desktop">
<div class="max-w-[880px] mx-auto">
<!-- Report Header -->
<div class="flex flex-col md:flex-row md:items-end justify-between gap-stack-md mb-stack-lg">
<div>
<span class="text-sam-red font-bold tracking-wider uppercase text-[12px]">Diagnostic Report • Grade 4</span>
<h1 class="text-[32px] font-bold text-sam-navy leading-tight mt-1 font-['Plus_Jakarta_Sans']">Benjamin "Ben" Harrison</h1>
<div class="flex items-center gap-4 mt-2 text-sam-gray-mid">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">calendar_today</span> Oct 24, 2023</span>
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">timer</span> 42m duration</span>
</div>
</div>
<div class="flex gap-stack-sm">
<button class="flex items-center gap-2 px-6 py-2 border-2 border-sam-navy text-sam-navy rounded-xl font-bold hover:bg-sam-navy hover:text-white transition-all text-[14px]">
<span class="material-symbols-outlined text-[18px]">download</span>
                        Export PDF
                    </button>
<button class="flex items-center gap-2 px-6 py-2 bg-sam-red text-white rounded-xl font-bold shadow-md hover:scale-[1.02] transition-all text-[14px]">
<span class="material-symbols-outlined text-[18px]">share</span>
                        Share with Parent
                    </button>
</div>
</div>
<!-- Bento Grid Summary -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-stack-lg">
<!-- Overall Proficiency -->
<div class="md:col-span-2 bg-white p-8 rounded-3xl shadow-[0px_4px_12px_rgba(27,58,107,0.08)] flex items-center justify-between overflow-hidden relative">
<div class="z-10">
<h3 class="text-sam-navy font-bold text-lg mb-2">Overall Proficiency</h3>
<div class="flex items-baseline gap-2">
<span class="text-5xl font-extrabold text-sam-red">84%</span>
<span class="text-sam-teal font-bold flex items-center gap-1 text-[14px]">
<span class="material-symbols-outlined text-[16px]">trending_up</span> +5%
                            </span>
</div>
<p class="text-sam-gray-mid mt-4 max-w-[280px] text-[14px]">Ben is performing significantly above grade-level average in <span class="font-bold text-sam-navy">Algebraic Thinking</span>.</p>
</div>
<!-- Simplified Visual Radar Backdrop -->
<div class="w-48 h-48 bg-slate-50 rounded-full flex items-center justify-center relative">
<div class="absolute inset-0 border-[1px] border-dashed border-slate-200 rounded-full scale-75"></div>
<div class="absolute inset-0 border-[1px] border-dashed border-slate-200 rounded-full scale-50"></div>
<svg class="w-40 h-40 transform rotate-12" viewbox="0 0 100 100">
<polygon fill="none" points="50,10 90,40 75,90 25,90 10,40" stroke="#E5E5E5" stroke-width="1"></polygon>
<polygon fill="#E63946" fill-opacity="0.2" points="50,20 80,45 65,75 35,75 20,45" stroke="#E63946" stroke-width="2"></polygon>
</svg>
</div>
</div>
<!-- Learning Persona -->
<div class="bg-sam-navy text-white p-8 rounded-3xl shadow-lg flex flex-col justify-between">
<div>
<h3 class="font-bold text-lg mb-4">Learner Profile</h3>
<div class="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[12px] font-bold uppercase tracking-wide">
<span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">bolt</span> Dynamic Strategist
                        </div>
</div>
<div class="mt-6">
<p class="text-white/80 text-[14px] leading-relaxed">Excels at visual problem solving and mental math, but needs focus on procedural notation.</p>
</div>
</div>
</div>
<!-- Strand Map Section -->
<div class="bg-white p-8 rounded-3xl shadow-[0px_4px_12px_rgba(27,58,107,0.08)] mb-stack-lg">
<div class="flex items-center justify-between mb-8">
<h2 class="text-2xl font-bold text-sam-navy font-['Plus_Jakarta_Sans']">Competency Strand Map</h2>
<div class="flex gap-4">
<div class="flex items-center gap-2 text-[12px] font-medium text-sam-gray-mid">
<div class="w-3 h-3 rounded-full bg-sam-teal"></div> Mastery
                        </div>
<div class="flex items-center gap-2 text-[12px] font-medium text-sam-gray-mid">
<div class="w-3 h-3 rounded-full bg-sam-yellow"></div> Developing
                        </div>
<div class="flex items-center gap-2 text-[12px] font-medium text-sam-gray-mid">
<div class="w-3 h-3 rounded-full bg-sam-red"></div> Growth Opportunity
                        </div>
</div>
</div>
<div class="space-y-6">
<!-- Strand Item: Number Sense -->
<div>
<div class="flex justify-between items-end mb-2">
<span class="font-bold text-sam-navy">Number &amp; Operations</span>
<span class="text-sam-teal font-extrabold">92%</span>
</div>
<div class="h-3 bg-slate-100 rounded-full overflow-hidden">
<div class="h-full bg-gradient-to-r from-sam-teal to-[#10c99a] w-[92%] rounded-full"></div>
</div>
</div>
<!-- Strand Item: Algebra -->
<div>
<div class="flex justify-between items-end mb-2">
<span class="font-bold text-sam-navy">Algebraic Thinking</span>
<span class="text-sam-teal font-extrabold">88%</span>
</div>
<div class="h-3 bg-slate-100 rounded-full overflow-hidden">
<div class="h-full bg-gradient-to-r from-sam-teal to-[#10c99a] w-[88%] rounded-full"></div>
</div>
</div>
<!-- Strand Item: Geometry -->
<div>
<div class="flex justify-between items-end mb-2">
<span class="font-bold text-sam-navy">Measurement &amp; Geometry</span>
<span class="text-sam-yellow font-extrabold">64%</span>
</div>
<div class="h-3 bg-slate-100 rounded-full overflow-hidden">
<div class="h-full bg-gradient-to-r from-sam-yellow to-[#ffdf91] w-[64%] rounded-full"></div>
</div>
</div>
<!-- Strand Item: Fractions -->
<div>
<div class="flex justify-between items-end mb-2">
<span class="font-bold text-sam-navy">Fractions &amp; Decimals</span>
<span class="text-sam-red font-extrabold">42%</span>
</div>
<div class="h-3 bg-slate-100 rounded-full overflow-hidden">
<div class="h-full bg-gradient-to-r from-sam-red to-[#ff6b76] w-[42%] rounded-full"></div>
</div>
</div>
</div>
</div>
<!-- Insights & Recommendations -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
<!-- Misconception Cards -->
<div class="space-y-4">
<h3 class="text-xl font-bold text-sam-navy px-2">Identified Gaps</h3>
<div class="bg-white p-6 rounded-2xl border border-sam-gray-light shadow-sm flex gap-4">
<div class="w-12 h-12 bg-sam-red/10 rounded-xl flex items-center justify-center shrink-0">
<span class="material-symbols-outlined text-sam-red">troubleshoot</span>
</div>
<div>
<h4 class="font-bold text-sam-navy">Denominator Confusion</h4>
<p class="text-[14px] text-sam-gray-mid mt-1">Attempts to add denominators when calculating fraction sums. (e.g., 1/4 + 1/4 = 2/8)</p>
</div>
</div>
<div class="bg-white p-6 rounded-2xl border border-sam-gray-light shadow-sm flex gap-4">
<div class="w-12 h-12 bg-sam-orange/10 rounded-xl flex items-center justify-center shrink-0">
<span class="material-symbols-outlined text-sam-orange">architecture</span>
</div>
<div>
<h4 class="font-bold text-sam-navy">Spatial Orientation</h4>
<p class="text-[14px] text-sam-gray-mid mt-1">Struggles with rotating 3D shapes mentally in geometry problems.</p>
</div>
</div>
</div>
<!-- Recommendations -->
<div class="space-y-4">
<h3 class="text-xl font-bold text-sam-navy px-2">Next Steps</h3>
<div class="bg-sam-cream p-6 rounded-2xl border-2 border-dashed border-sam-orange flex flex-col h-full">
<div class="flex items-center gap-3 mb-4">
<img alt="Sammy the Otter Mascot" class="w-10 h-10 object-contain" data-alt="A friendly and cute cartoon otter mascot with wide eyes and a welcoming expression, simple vector style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZW1ow00H1SwH49eKMGDh3tECQ68YwceE7DpbEYHxSH3AClUVFdkXKtaqeEo03doI79vPrRN9iWJQOhVw6vIHgDFHNk7Z0FyrJ47Epil4oBccSo8Wfd-a3Uz4ef_xhd_bPuZrNLAaCFVL9FPTWqK-Nz5LczOdTzOySP9mqgi-J2nH0UTCphvzUEbH0m07auGdUau2HexZk1s9Qqa3nxXzGJsYXG4NbBAJtOO-mwNX2rrK2YSi-1d1KkmCxEtRsnI-TRFHdBPMGhghg"/>
<span class="font-bold text-sam-navy">Sammy's Plan for Ben</span>
</div>
<ul class="space-y-3">
<li class="flex items-start gap-3 text-[14px] text-sam-navy/80">
<span class="material-symbols-outlined text-sam-teal text-[20px]">check_circle</span>
                                Practice visual fraction models using circular diagrams.
                            </li>
<li class="flex items-start gap-3 text-[14px] text-sam-navy/80">
<span class="material-symbols-outlined text-sam-teal text-[20px]">check_circle</span>
                                Target "Equivalent Fractions" module in the Portal.
                            </li>
<li class="flex items-start gap-3 text-[14px] text-sam-navy/80">
<span class="material-symbols-outlined text-sam-teal text-[20px]">check_circle</span>
                                Use manipulative tools for 3D shape identification.
                            </li>
</ul>
<button class="mt-auto pt-6 w-full py-3 bg-sam-navy text-white rounded-xl font-bold hover:bg-sam-red transition-all">
                            Assign Practice Missions
                        </button>
</div>
</div>
</div>
<!-- Action Footer -->
<div class="mt-12 p-8 bg-white rounded-3xl border border-sam-gray-light flex flex-col md:flex-row items-center justify-between gap-6">
<div class="flex items-center gap-4">
<div class="w-12 h-12 bg-sam-teal/10 rounded-full flex items-center justify-center">
<span class="material-symbols-outlined text-sam-teal">history_edu</span>
</div>
<div>
<p class="font-bold text-sam-navy">View Full Response Log</p>
<p class="text-[14px] text-sam-gray-mid">Review every answer Ben gave during the assessment.</p>
</div>
</div>
<button class="px-8 py-3 bg-slate-100 text-sam-navy font-bold rounded-xl hover:bg-slate-200 transition-all">
                    Open Answer Key
                </button>
</div>
</div>
</main>
<!-- Bottom Navigation (Mobile Only) -->
<nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 px-4 z-50">
<button class="flex flex-col items-center gap-1 text-slate-500">
<span class="material-symbols-outlined">group</span>
<span class="text-[10px]">Students</span>
</button>
<button class="flex flex-col items-center gap-1 text-slate-500">
<span class="material-symbols-outlined">analytics</span>
<span class="text-[10px]">Cohort</span>
</button>
<button class="flex flex-col items-center gap-1 text-[#E63946]">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">assessment</span>
<span class="text-[10px] font-bold">Reports</span>
</button>
<button class="flex flex-col items-center gap-1 text-slate-500">
<span class="material-symbols-outlined">menu_book</span>
<span class="text-[10px]">Resources</span>
</button>
</nav>
</body></html>

<!-- Module D - 3: Parent Dashboard (Mobile) -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "tertiary-container": "#936f03",
                    "on-tertiary": "#ffffff",
                    "on-tertiary-container": "#fffbff",
                    "surface-container-low": "#f1f3ff",
                    "sam-navy": "#1B3A6B",
                    "on-surface": "#001a40",
                    "secondary-fixed-dim": "#ffb780",
                    "on-primary-container": "#fffbff",
                    "tertiary-fixed-dim": "#edc157",
                    "inverse-on-surface": "#edf0ff",
                    "on-tertiary-fixed": "#251a00",
                    "on-primary": "#ffffff",
                    "outline-variant": "#e4bebc",
                    "on-error": "#ffffff",
                    "error": "#ba1a1a",
                    "on-surface-variant": "#5b403f",
                    "surface-dim": "#cadaff",
                    "inverse-surface": "#0d2f60",
                    "sam-yellow": "#FFD166",
                    "on-error-container": "#93000a",
                    "surface-container": "#e8edff",
                    "primary-container": "#db313f",
                    "primary-fixed": "#ffdad8",
                    "on-secondary": "#ffffff",
                    "surface-container-high": "#e0e8ff",
                    "surface-container-lowest": "#ffffff",
                    "sam-gray-mid": "#777777",
                    "on-background": "#001a40",
                    "primary-fixed-dim": "#ffb3b1",
                    "surface-tint": "#bb152c",
                    "secondary": "#8e4e14",
                    "sam-red": "#E63946",
                    "error-container": "#ffdad6",
                    "on-primary-fixed": "#410007",
                    "inverse-primary": "#ffb3b1",
                    "surface-container-highest": "#d7e2ff",
                    "secondary-fixed": "#ffdcc4",
                    "secondary-container": "#ffab69",
                    "white": "#FFFFFF",
                    "on-secondary-fixed-variant": "#6f3800",
                    "sam-orange": "#F4A261",
                    "background": "#f9f9ff",
                    "tertiary-fixed": "#ffdf9b",
                    "surface-variant": "#d7e2ff",
                    "tertiary": "#755700",
                    "sam-cream": "#FFF8F0",
                    "on-secondary-fixed": "#2f1400",
                    "on-tertiary-fixed-variant": "#5b4300",
                    "surface-bright": "#f9f9ff",
                    "sam-gray-light": "#E5E5E5",
                    "sam-teal": "#06A77D",
                    "surface": "#f9f9ff",
                    "primary": "#b7102a",
                    "on-primary-fixed-variant": "#92001c",
                    "on-secondary-container": "#783d01",
                    "outline": "#8f6f6e"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "stack-lg": "32px",
                    "report-width": "880px",
                    "margin-desktop": "40px",
                    "gutter": "24px",
                    "margin-tablet": "32px",
                    "unit": "4px",
                    "stack-sm": "8px",
                    "container-max": "1440px",
                    "stack-md": "16px"
            },
            "fontFamily": {
                    "display-child": ["Plus Jakarta Sans"],
                    "math-numeral": ["Plus Jakarta Sans"],
                    "headline-adult": ["Inter"],
                    "caption": ["Inter"],
                    "body-regular": ["Inter"]
            },
            "fontSize": {
                    "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                    "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                    "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                    "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                    "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body {
            -webkit-tap-highlight-color: transparent;
        }
        .bento-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
        }
        .safe-bottom {
            padding-bottom: env(safe-area-inset-bottom);
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream font-body-regular text-sam-gray-dark min-h-screen pb-24">
<!-- Top AppBar (from JSON) -->
<header class="fixed top-0 left-0 w-full z-50 bg-[#fdfcf8] dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center justify-between px-6 py-4">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-[#E63946] dark:text-red-400">arrow_back</span>
<h1 class="text-2xl font-black text-[#1b3a6b] dark:text-white tracking-tight">S.A.M.</h1>
</div>
<div class="flex items-center gap-4">
<div class="w-10 h-10 rounded-full bg-sam-navy flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
<img alt="Parent Avatar" class="w-full h-full object-cover" data-alt="close-up portrait of a friendly young father in a casual blue shirt smiling warmly with soft indoor lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAZWj5oS1htnULU_lJ7MBWSGtzmL--CeML9cHs-NeiOSCcAy68AxLIJlliExB0pHgr2NV9v9BN3DTueGtmZJAKlzUc3whcRSAHeFAy6b9H01t4Dj3TCb6AZEv2PzbLI1Irqblb8bMzIUrF6EqlzSCncGjtidmnUjKTjeenggCC6FLT0M9uLtaFFePsUVQFu7Qyr-o0kSLyl-0T7XLcBjs5t_iCJLAD5MePjuxTzmfm_PouHDw2Z1dw5IvchBshrW_H3pJuj3ujXWcv"/>
</div>
</div>
</header>
<main class="mt-20 px-6 max-w-md mx-auto">
<!-- Hero Summary Section -->
<section class="mb-8">
<div class="flex justify-between items-end mb-4">
<div>
<p class="text-caption font-caption text-sam-gray-mid">Welcome back, Sarah</p>
<h2 class="text-headline-adult font-headline-adult text-sam-navy">Leo's Dashboard</h2>
</div>
<div class="bg-sam-teal/10 text-sam-teal px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Grade 3
                </div>
</div>
<!-- Main Score Card -->
<div class="bg-white rounded-3xl p-6 shadow-[0px_4px_12px_rgba(27,58,107,0.08)] relative overflow-hidden">
<div class="absolute -right-4 -top-4 w-24 h-24 bg-sam-red/5 rounded-full"></div>
<div class="relative z-10 flex items-center justify-between">
<div>
<p class="text-caption font-caption text-sam-gray-mid mb-1">Overall Proficiency</p>
<div class="flex items-baseline gap-2">
<span class="text-[48px] font-extrabold text-sam-navy leading-none">82</span>
<span class="text-sam-red font-bold text-lg">%</span>
</div>
<p class="text-xs text-sam-teal font-semibold mt-2 flex items-center gap-1">
<span class="material-symbols-outlined text-sm">trending_up</span>
                            +5% from last month
                        </p>
</div>
<div class="w-24 h-24">
<svg class="w-full h-full" viewbox="0 0 36 36">
<path class="text-sam-gray-light" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="transparent" stroke="currentColor" stroke-dasharray="100, 100" stroke-width="3"></path>
<path class="text-sam-red" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="transparent" stroke="currentColor" stroke-dasharray="82, 100" stroke-linecap="round" stroke-width="3"></path>
</svg>
</div>
</div>
</div>
</section>
<!-- Bento Style Insights -->
<section class="mb-8">
<h3 class="text-caption font-caption text-sam-navy mb-4 font-bold uppercase tracking-widest">Quick Stats</h3>
<div class="bento-grid">
<div class="bg-sam-navy text-white rounded-3xl p-5 flex flex-col justify-between h-40">
<span class="material-symbols-outlined text-sam-yellow">timer</span>
<div>
<p class="text-[28px] font-bold">14h</p>
<p class="text-xs opacity-70">Focus Time</p>
</div>
</div>
<div class="bg-sam-orange/10 border border-sam-orange/20 rounded-3xl p-5 flex flex-col justify-between h-40">
<span class="material-symbols-outlined text-sam-orange">auto_awesome</span>
<div>
<p class="text-[28px] font-bold text-sam-navy">3</p>
<p class="text-xs text-sam-gray-mid">Badges Earned</p>
</div>
</div>
<div class="col-span-2 bg-white rounded-3xl p-5 shadow-[0px_4px_12px_rgba(27,58,107,0.08)] flex items-center gap-4">
<div class="bg-sam-teal/10 p-3 rounded-2xl">
<span class="material-symbols-outlined text-sam-teal">emoji_events</span>
</div>
<div>
<p class="font-bold text-sam-navy">Math Champion</p>
<p class="text-xs text-sam-gray-mid">Next milestone: 50 correct answers</p>
</div>
<span class="material-symbols-outlined ml-auto text-sam-gray-light">chevron_right</span>
</div>
</div>
</section>
<!-- Recent Assessments (Standard List with Style) -->
<section class="mb-8">
<div class="flex justify-between items-center mb-4">
<h3 class="text-caption font-caption text-sam-navy font-bold uppercase tracking-widest">Recent Activity</h3>
<button class="text-xs font-bold text-sam-red">View All</button>
</div>
<div class="space-y-3">
<div class="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-transparent active:scale-95 transition-all">
<div class="flex items-center gap-4">
<div class="w-12 h-12 bg-sam-cream rounded-xl flex items-center justify-center">
<span class="material-symbols-outlined text-sam-navy">calculate</span>
</div>
<div>
<p class="font-bold text-sam-navy">Number Sense</p>
<p class="text-xs text-sam-gray-mid">Oct 24, 2023</p>
</div>
</div>
<div class="text-right">
<p class="font-bold text-sam-red">92/100</p>
<p class="text-[10px] text-sam-teal font-bold uppercase">Excelled</p>
</div>
</div>
<div class="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-transparent active:scale-95 transition-all">
<div class="flex items-center gap-4">
<div class="w-12 h-12 bg-sam-cream rounded-xl flex items-center justify-center">
<span class="material-symbols-outlined text-sam-navy">square_foot</span>
</div>
<div>
<p class="font-bold text-sam-navy">Geometry</p>
<p class="text-xs text-sam-gray-mid">Oct 22, 2023</p>
</div>
</div>
<div class="text-right">
<p class="font-bold text-sam-navy">74/100</p>
<p class="text-[10px] text-sam-orange font-bold uppercase">Improving</p>
</div>
</div>
</div>
</section>
<!-- Learning Path Banner -->
<section class="mb-8">
<div class="bg-gradient-to-br from-sam-navy to-blue-900 rounded-3xl p-6 text-white relative overflow-hidden">
<div class="relative z-10">
<h4 class="text-lg font-bold mb-1">Recommended for Leo</h4>
<p class="text-xs opacity-80 mb-4 max-w-[200px]">Next lesson: Intro to Multi-digit Subtraction</p>
<button class="bg-sam-red hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl text-sm shadow-lg transition-transform active:scale-90">
                        Continue Journey
                    </button>
</div>
<div class="absolute bottom-0 right-0 w-32 h-32 opacity-20">
<span class="material-symbols-outlined text-[120px] absolute -bottom-4 -right-4">school</span>
</div>
</div>
</section>
<!-- Focus Areas -->
<section class="mb-12">
<h3 class="text-caption font-caption text-sam-navy mb-4 font-bold uppercase tracking-widest">Strength &amp; Focus</h3>
<div class="grid grid-cols-1 gap-4">
<div class="flex items-center gap-4 p-4 rounded-2xl border-2 border-sam-teal/20 bg-white">
<div class="w-10 h-10 rounded-full bg-sam-teal flex items-center justify-center text-white">
<span class="material-symbols-outlined">star</span>
</div>
<div class="flex-1">
<p class="text-sm font-bold text-sam-navy">Mental Arithmetic</p>
<div class="w-full bg-sam-gray-light h-2 rounded-full mt-1">
<div class="bg-sam-teal h-2 rounded-full w-[95%]"></div>
</div>
</div>
</div>
<div class="flex items-center gap-4 p-4 rounded-2xl border-2 border-sam-orange/20 bg-white">
<div class="w-10 h-10 rounded-full bg-sam-orange flex items-center justify-center text-white">
<span class="material-symbols-outlined">lightbulb</span>
</div>
<div class="flex-1">
<p class="text-sm font-bold text-sam-navy">Word Problems</p>
<div class="w-full bg-sam-gray-light h-2 rounded-full mt-1">
<div class="bg-sam-orange h-2 rounded-full w-[62%]"></div>
</div>
</div>
</div>
</div>
</section>
</main>
<!-- Bottom Navigation (from JSON) -->
<nav class="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.06)] rounded-t-2xl">
<a class="flex flex-col items-center justify-center text-[#E63946] bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-1 active:scale-90 duration-150" href="#">
<span class="material-symbols-outlined" data-weight="fill">home</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Home</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-3 py-1 hover:text-[#E63946] transition-colors active:scale-90 duration-150" href="#">
<span class="material-symbols-outlined">calculate</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Assessments</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-3 py-1 hover:text-[#E63946] transition-colors active:scale-90 duration-150" href="#">
<span class="material-symbols-outlined">analytics</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Reports</span>
</a>
</nav>
<!-- Floating Action Button Contextual Logic -->
<!-- FAB is suppressed on Dashboard as per relevance check, focusing on content consumption -->
</body></html>

<!-- Module D - 5: Parent Report (Mobile) -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "tertiary-container": "#936f03",
                        "on-tertiary": "#ffffff",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "sam-navy": "#1B3A6B",
                        "on-surface": "#001a40",
                        "secondary-fixed-dim": "#ffb780",
                        "on-primary-container": "#fffbff",
                        "tertiary-fixed-dim": "#edc157",
                        "inverse-on-surface": "#edf0ff",
                        "on-tertiary-fixed": "#251a00",
                        "on-primary": "#ffffff",
                        "outline-variant": "#e4bebc",
                        "on-error": "#ffffff",
                        "error": "#ba1a1a",
                        "on-surface-variant": "#5b403f",
                        "surface-dim": "#cadaff",
                        "inverse-surface": "#0d2f60",
                        "sam-yellow": "#FFD166",
                        "on-error-container": "#93000a",
                        "sam-gray-dark": "#333333",
                        "surface-container": "#e8edff",
                        "primary-container": "#db313f",
                        "primary-fixed": "#ffdad8",
                        "on-secondary": "#ffffff",
                        "surface-container-high": "#e0e8ff",
                        "surface-container-lowest": "#ffffff",
                        "sam-gray-mid": "#777777",
                        "on-background": "#001a40",
                        "primary-fixed-dim": "#ffb3b1",
                        "surface-tint": "#bb152c",
                        "secondary": "#8e4e14",
                        "sam-red": "#E63946",
                        "error-container": "#ffdad6",
                        "on-primary-fixed": "#410007",
                        "inverse-primary": "#ffb3b1",
                        "surface-container-highest": "#d7e2ff",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "white": "#FFFFFF",
                        "on-secondary-fixed-variant": "#6f3800",
                        "sam-orange": "#F4A261",
                        "background": "#f9f9ff",
                        "tertiary-fixed": "#ffdf9b",
                        "surface-variant": "#d7e2ff",
                        "tertiary": "#755700",
                        "sam-cream": "#FFF8F0",
                        "on-secondary-fixed": "#2f1400",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "surface-bright": "#f9f9ff",
                        "sam-gray-light": "#E5E5E5",
                        "sam-teal": "#06A77D",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-primary-fixed-variant": "#92001c",
                        "on-secondary-container": "#783d01",
                        "outline": "#8f6f6e"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "fontFamily": {
                        "display-child": ["Plus Jakarta Sans"],
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "caption": ["Inter"],
                        "body-regular": ["Inter"]
                    },
                    "fontSize": {
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
                    }
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        .radar-grid {
            clip-path: polygon(50% 0%, 100% 38%, 81% 100%, 19% 100%, 0% 38%);
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream font-body-regular text-on-surface">
<!-- TopAppBar -->
<header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm fixed top-0 w-full z-50">
<div class="flex justify-between items-center w-full px-6 py-4">
<div class="text-xl font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans']">Atlas Assessment</div>
<div class="flex gap-4 items-center">
<span class="material-symbols-outlined text-slate-600 dark:text-slate-400 cursor-pointer active:opacity-80">notifications</span>
<div class="w-8 h-8 rounded-full bg-sam-gray-light overflow-hidden cursor-pointer active:opacity-80">
<img alt="Instructor profile avatar" data-alt="professional headshot of a friendly female teacher in her 30s with a warm smile, soft studio lighting, blurred classroom background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuACxVyRv2mjDEe2N09ztzUbT-zkNDu6d59g71VqM4EgsAMcBA0gR3pfNizCqv4v8GlJSASMmGb5swH_po58qQEKROkYnKtWENxhCw3HT-FxWKM51qntwLHESYzVAATLY3MSYS22hF5x8Xkij9L1WlENXQOyV6v3yXrSRu0OZfzsWoAelkvz3RFv3RAS8HWbIDSwH5snbCxrCq16V45uz6-XkE9mbiTXGdtLLJu9DM01TdAoqs1sjDzlpT86qNsnA4VaZMYsiM1BzRRU"/>
</div>
</div>
</div>
<!-- Desktop Nav Placeholder (Hidden on Mobile) -->
<nav class="hidden md:flex justify-center gap-8 pb-2">
<a class="text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors font-['Plus_Jakarta_Sans'] font-medium" href="#">Dashboard</a>
<a class="text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors font-['Plus_Jakarta_Sans'] font-medium" href="#">Students</a>
<a class="text-red-600 border-b-2 border-red-600 pb-1 font-['Plus_Jakarta_Sans'] font-medium" href="#">Reports</a>
<a class="text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors font-['Plus_Jakarta_Sans'] font-medium" href="#">Curriculum</a>
</nav>
</header>
<main class="pt-24 pb-32 px-4 max-w-report-width mx-auto">
<!-- Report Header Section -->
<section class="mb-8">
<div class="flex items-center gap-3 mb-2">
<span class="material-symbols-outlined text-sam-red">analytics</span>
<h1 class="font-headline-adult text-headline-adult text-sam-navy">Diagnostic Report</h1>
</div>
<div class="bg-white rounded-xl p-4 shadow-[0_4px_12px_rgba(27,58,107,0.08)] border border-sam-gray-light/30">
<div class="flex items-center gap-4">
<div class="w-16 h-16 rounded-full bg-sam-orange/10 flex items-center justify-center border-2 border-sam-orange">
<span class="text-2xl font-bold text-sam-orange">AL</span>
</div>
<div>
<h2 class="text-lg font-bold text-sam-navy">Alex Lim</h2>
<p class="text-caption text-sam-gray-mid">Primary 3 • Mid-Year Diagnostic</p>
<p class="text-caption font-semibold text-sam-teal flex items-center gap-1">
<span class="material-symbols-outlined text-xs">check_circle</span>
                            Assessment Completed
                        </p>
</div>
</div>
</div>
</section>
<!-- Skill Profile / Radar Chart Container -->
<section class="mb-8">
<h3 class="font-headline-adult text-lg text-sam-navy mb-4">Competency Map</h3>
<div class="bg-white rounded-xl p-6 shadow-[0_4px_12px_rgba(27,58,107,0.08)] relative overflow-hidden">
<!-- Radar Chart Visual Logic -->
<div class="relative w-full aspect-square flex items-center justify-center max-w-[300px] mx-auto">
<!-- Radar Rings -->
<div class="absolute inset-0 border border-sam-gray-light radar-grid opacity-20"></div>
<div class="absolute inset-[15%] border border-sam-gray-light radar-grid opacity-40"></div>
<div class="absolute inset-[30%] border border-sam-gray-light radar-grid opacity-60"></div>
<div class="absolute inset-[45%] border border-sam-gray-light radar-grid opacity-80"></div>
<!-- Radar Polygon (Performance) -->
<div class="absolute inset-0 bg-sam-red/20 radar-grid" style="clip-path: polygon(50% 10%, 90% 40%, 75% 85%, 30% 90%, 15% 45%);"></div>
<!-- Labels -->
<div class="absolute top-[-20px] left-1/2 -translate-x-1/2 text-caption font-bold text-sam-navy">Number Sense</div>
<div class="absolute top-[35%] right-[-10px] text-caption font-bold text-sam-navy">Algebra</div>
<div class="absolute bottom-[0] right-[10%] text-caption font-bold text-sam-navy text-right">Data Analysis</div>
<div class="absolute bottom-[0] left-[10%] text-caption font-bold text-sam-navy">Measurement</div>
<div class="absolute top-[35%] left-[-10px] text-caption font-bold text-sam-navy">Geometry</div>
</div>
<div class="mt-8 flex justify-center gap-6">
<div class="flex items-center gap-2">
<div class="w-3 h-3 rounded-full bg-sam-red"></div>
<span class="text-caption">Alex's Performance</span>
</div>
<div class="flex items-center gap-2">
<div class="w-3 h-3 rounded-full bg-sam-gray-light"></div>
<span class="text-caption">Grade Average</span>
</div>
</div>
</div>
</section>
<!-- Strands Progress -->
<section class="mb-8">
<h3 class="font-headline-adult text-lg text-sam-navy mb-4">Performance by Strand</h3>
<div class="space-y-4">
<!-- Strand Item -->
<div class="bg-white rounded-xl p-4 shadow-[0_4px_12px_rgba(27,58,107,0.08)] border-l-4 border-sam-teal">
<div class="flex justify-between items-center mb-2">
<span class="font-bold text-sam-navy">Whole Numbers</span>
<span class="text-sam-teal font-bold">85%</span>
</div>
<div class="w-full bg-sam-gray-light h-2.5 rounded-full overflow-hidden">
<div class="bg-sam-teal h-full rounded-full" style="width: 85%"></div>
</div>
</div>
<!-- Strand Item -->
<div class="bg-white rounded-xl p-4 shadow-[0_4px_12px_rgba(27,58,107,0.08)] border-l-4 border-sam-orange">
<div class="flex justify-between items-center mb-2">
<span class="font-bold text-sam-navy">Fractions &amp; Decimals</span>
<span class="text-sam-orange font-bold">62%</span>
</div>
<div class="w-full bg-sam-gray-light h-2.5 rounded-full overflow-hidden">
<div class="bg-sam-orange h-full rounded-full" style="width: 62%"></div>
</div>
</div>
<!-- Strand Item -->
<div class="bg-white rounded-xl p-4 shadow-[0_4px_12px_rgba(27,58,107,0.08)] border-l-4 border-sam-red">
<div class="flex justify-between items-center mb-2">
<span class="font-bold text-sam-navy">Measurement</span>
<span class="text-sam-red font-bold">48%</span>
</div>
<div class="w-full bg-sam-gray-light h-2.5 rounded-full overflow-hidden">
<div class="bg-sam-red h-full rounded-full" style="width: 48%"></div>
</div>
</div>
</div>
</section>
<!-- Misconceptions Alert -->
<section class="mb-8">
<h3 class="font-headline-adult text-lg text-sam-navy mb-4">Identified Misconceptions</h3>
<div class="bg-white rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(27,58,107,0.08)] border border-red-100">
<div class="bg-red-50 p-4 flex gap-3 items-start border-b border-red-100">
<span class="material-symbols-outlined text-sam-red">warning</span>
<div>
<h4 class="font-bold text-sam-navy">Place Value Gap</h4>
<p class="text-caption text-sam-gray-dark">Alex is struggling with regrouping when subtracting three-digit numbers across zeros.</p>
</div>
</div>
<div class="p-4 bg-white">
<h5 class="text-xs font-bold text-sam-navy uppercase tracking-wider mb-2">Recommended Strategy</h5>
<p class="text-caption text-sam-gray-mid">Utilize base-ten blocks for visual subtraction. Focus on concrete-to-abstract transition.</p>
</div>
</div>
</section>
<!-- Sammy the Otter Suggestion -->
<section class="mb-8 mt-12 text-center">
<div class="relative inline-block">
<div class="bg-white p-4 rounded-2xl shadow-lg border border-sam-gray-light mb-4 text-left max-w-[280px]">
<p class="text-sm font-medium text-sam-navy">"Great job, Alex! You've mastered Whole Numbers. Let's work on Measurement next!"</p>
<!-- Speech bubble tail -->
<div class="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-sam-gray-light rotate-45"></div>
</div>
<img class="w-24 mx-auto" data-alt="cute playful otter mascot character called Sammy, wearing a small scholar cap, cartoon style with soft textures and bright colors" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4LqkD1-ZfDF9B5KWIqwruhJZUVjqbxCT4TOr7T9O75VkFAfadNNzMKAI2CAIKx-iaMeTKHw7p3qYYgY8DGHK3If2XKA1-k59oeXQHW6Y1yfit1bNBq9Fu4x09gyu2STq0Z-TBrV3WMZZrCqdJYxbkM-ByO7XlIzo6roY51n7pB3lnzqrvuIOX4CChhTLDpP5HCuUhgqn8EEfmDPvc7wOKBVQ7XK5qH9Zzk8KZRe2dR2NLQ-Ym6WHJkrPoY-F12xps9KD32t_jh_b4"/>
</div>
</section>
</main>
<!-- Footer -->
<footer class="bg-stone-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 w-full mt-auto mb-16">
<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center py-8 px-6">
<div class="font-bold text-slate-800 dark:text-slate-200 mb-4 md:mb-0 font-['Plus_Jakarta_Sans']">Atlas Assessment</div>
<div class="flex flex-wrap justify-center gap-4 mb-4 md:mb-0">
<a class="font-['Plus_Jakarta_Sans'] text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 hover:underline decoration-red-600 underline-offset-4" href="#">Privacy Policy</a>
<a class="font-['Plus_Jakarta_Sans'] text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 hover:underline decoration-red-600 underline-offset-4" href="#">Terms of Service</a>
<a class="font-['Plus_Jakarta_Sans'] text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 hover:underline decoration-red-600 underline-offset-4" href="#">Help Center</a>
<a class="font-['Plus_Jakarta_Sans'] text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 hover:underline decoration-red-600 underline-offset-4" href="#">Contact</a>
</div>
<div class="font-['Plus_Jakarta_Sans'] text-xs text-slate-500 dark:text-slate-400">© 2024 S.A.M Atlas Assessment. All rights reserved.</div>
</div>
</footer>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-white border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-xl">
<div class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-transform cursor-pointer">
<span class="material-symbols-outlined">home</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Home</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-transform cursor-pointer">
<span class="material-symbols-outlined">edit_document</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Assess</span>
</div>
<!-- Active Tab: Insights -->
<div class="flex flex-col items-center justify-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-1 active:scale-95 transition-transform cursor-pointer">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">bar_chart</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Insights</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-transform cursor-pointer">
<span class="material-symbols-outlined">person</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Profile</span>
</div>
</nav>
</body></html>

<!-- Module D - 6: Instructor Roster (Desktop) -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Instructor Student Roster | Atlas Assessment</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "tertiary-container": "#936f03",
                    "on-tertiary": "#ffffff",
                    "on-tertiary-container": "#fffbff",
                    "surface-container-low": "#f1f3ff",
                    "sam-navy": "#1B3A6B",
                    "on-surface": "#001a40",
                    "secondary-fixed-dim": "#ffb780",
                    "on-primary-container": "#fffbff",
                    "tertiary-fixed-dim": "#edc157",
                    "inverse-on-surface": "#edf0ff",
                    "on-tertiary-fixed": "#251a00",
                    "on-primary": "#ffffff",
                    "outline-variant": "#e4bebc",
                    "on-error": "#ffffff",
                    "error": "#ba1a1a",
                    "on-surface-variant": "#5b403f",
                    "surface-dim": "#cadaff",
                    "inverse-surface": "#0d2f60",
                    "sam-yellow": "#FFD166",
                    "on-error-container": "#93000a",
                    "sam-gray-dark": "#333333",
                    "surface-container": "#e8edff",
                    "primary-container": "#db313f",
                    "primary-fixed": "#ffdad8",
                    "on-secondary": "#ffffff",
                    "surface-container-high": "#e0e8ff",
                    "surface-container-lowest": "#ffffff",
                    "sam-gray-mid": "#777777",
                    "on-background": "#001a40",
                    "primary-fixed-dim": "#ffb3b1",
                    "surface-tint": "#bb152c",
                    "secondary": "#8e4e14",
                    "sam-red": "#E63946",
                    "error-container": "#ffdad6",
                    "on-primary-fixed": "#410007",
                    "inverse-primary": "#ffb3b1",
                    "surface-container-highest": "#d7e2ff",
                    "secondary-fixed": "#ffdcc4",
                    "secondary-container": "#ffab69",
                    "white": "#FFFFFF",
                    "on-secondary-fixed-variant": "#6f3800",
                    "sam-orange": "#F4A261",
                    "background": "#f9f9ff",
                    "tertiary-fixed": "#ffdf9b",
                    "surface-variant": "#d7e2ff",
                    "tertiary": "#755700",
                    "sam-cream": "#FFF8F0",
                    "on-secondary-fixed": "#2f1400",
                    "on-tertiary-fixed-variant": "#5b4300",
                    "surface-bright": "#f9f9ff",
                    "sam-gray-light": "#E5E5E5",
                    "sam-teal": "#06A77D",
                    "surface": "#f9f9ff",
                    "primary": "#b7102a",
                    "on-primary-fixed-variant": "#92001c",
                    "on-secondary-container": "#783d01",
                    "outline": "#8f6f6e"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "stack-lg": "32px",
                    "report-width": "880px",
                    "margin-desktop": "40px",
                    "gutter": "24px",
                    "margin-tablet": "32px",
                    "unit": "4px",
                    "stack-sm": "8px",
                    "container-max": "1440px",
                    "stack-md": "16px"
            },
            "fontFamily": {
                    "display-child": ["Plus Jakarta Sans"],
                    "math-numeral": ["Plus Jakarta Sans"],
                    "headline-adult": ["Inter"],
                    "caption": ["Inter"],
                    "body-regular": ["Inter"]
            },
            "fontSize": {
                    "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                    "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                    "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                    "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                    "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body {
            background-color: #FFF8F0; /* sam-cream foundation */
        }
    </style>
</head>
<body class="font-body-regular text-on-surface antialiased">
<!-- TopAppBar -->
<header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm font-['Plus_Jakarta_Sans'] text-sm antialiased fixed top-0 z-50 w-full flex justify-between items-center px-6 h-16">
<div class="flex items-center gap-4">
<span class="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Atlas Assessment</span>
</div>
<div class="flex items-center gap-6">
<div class="relative hidden md:block">
<input class="pl-10 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-[#E63946] focus:border-transparent outline-none transition-all w-64" placeholder="Search assessments..." type="text"/>
<span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
</div>
<div class="flex items-center gap-3">
<button class="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 rounded-full">
<span class="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<button class="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 rounded-full">
<span class="material-symbols-outlined" data-icon="help_outline">help_outline</span>
</button>
<div class="h-8 w-8 rounded-full overflow-hidden border border-slate-200">
<img alt="Instructor Profile Avatar" data-alt="close up professional headshot of a friendly educator smiling warmly, soft studio lighting, blurred classroom background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1acgtf94Wu793egCXK8VK6umemLw_lyPSdvR7DthJ1FS880kPrp4_S6Wr5mn_d0TWBCJv-lh2dpoXtN3haVywZwg1nmeCtxhc-JhWQo4XXusZvofKVbF27yRE-XWIYjsgSilawDm4sZwr5nW2IcCcA_LG9fQvA3yodFLE-0Jc5wZBlV_ZDqqdyKBCdQCA93vVFc1dTCypEuw2-LfbwdshClGZCPQTFtF6xo6tx2jhFzo6-d8SeEQi7NMJhcdYtKu8-GAuGjlAThjQ"/>
</div>
</div>
</div>
</header>
<!-- SideNavBar -->
<nav class="bg-slate-50 dark:bg-slate-950 h-screen w-64 fixed left-0 top-0 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full pt-20 pb-6 z-40">
<div class="px-6 mb-8">
<div class="flex items-center gap-3 mb-2">
<div class="w-8 h-8 bg-[#E63946] rounded-lg flex items-center justify-center text-white font-bold">A</div>
<h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Instructor Portal</h2>
</div>
<p class="text-[14px] font-medium text-slate-500 dark:text-slate-400">Diagnostic Dashboard</p>
</div>
<div class="flex-1 space-y-1 px-3">
<a class="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 text-[#E63946] border-r-4 border-[#E63946] shadow-sm font-['Plus_Jakarta_Sans'] text-[14px] font-medium transition-all duration-200 ease-in-out" href="#">
<span class="material-symbols-outlined" data-icon="group">group</span>
<span>Student Roster</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 font-['Plus_Jakarta_Sans'] text-[14px] font-medium transition-all duration-200 ease-in-out" href="#">
<span class="material-symbols-outlined" data-icon="analytics">analytics</span>
<span>Cohort Analytics</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 font-['Plus_Jakarta_Sans'] text-[14px] font-medium transition-all duration-200 ease-in-out" href="#">
<span class="material-symbols-outlined" data-icon="assessment">assessment</span>
<span>Diagnostic Reports</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 font-['Plus_Jakarta_Sans'] text-[14px] font-medium transition-all duration-200 ease-in-out" href="#">
<span class="material-symbols-outlined" data-icon="menu_book">menu_book</span>
<span>Resources</span>
</a>
</div>
<div class="mt-auto pt-6 space-y-1 border-t border-slate-200 dark:border-slate-800 px-3">
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 font-['Plus_Jakarta_Sans'] text-[14px] font-medium transition-all duration-200 ease-in-out" href="#">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
<span>Settings</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 font-['Plus_Jakarta_Sans'] text-[14px] font-medium transition-all duration-200 ease-in-out" href="#">
<span class="material-symbols-outlined" data-icon="contact_support">contact_support</span>
<span>Support</span>
</a>
</div>
</nav>
<!-- Main Content Area -->
<main class="ml-64 pt-24 px-8 pb-12">
<div class="max-w-report-width mx-auto">
<!-- Header Section -->
<div class="flex justify-between items-end mb-8">
<div>
<h1 class="font-headline-adult text-headline-adult text-sam-navy mb-2">Student Roster</h1>
<p class="text-sam-gray-mid font-body-regular">Manage student enrollments and track real-time assessment progress for Grade 3 - Maplewood Elementary.</p>
</div>
<button class="bg-sam-red hover:bg-primary-container text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-md active:opacity-80">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">person_add</span>
                    Add Student
                </button>
</div>
<!-- Dashboard Stats Bento Grid -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
<div class="bg-white p-6 rounded-2xl shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-slate-100">
<p class="text-caption font-caption text-sam-gray-mid mb-1">Total Students</p>
<p class="text-3xl font-bold text-sam-navy">28</p>
<div class="mt-2 flex items-center text-sam-teal text-sm font-medium">
<span class="material-symbols-outlined text-sm">trending_up</span>
<span>+2 this month</span>
</div>
</div>
<div class="bg-white p-6 rounded-2xl shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-slate-100">
<p class="text-caption font-caption text-sam-gray-mid mb-1">Assessment Complete</p>
<p class="text-3xl font-bold text-sam-teal">18</p>
<div class="mt-2 w-full bg-slate-100 h-1.5 rounded-full">
<div class="bg-sam-teal h-full w-[64%] rounded-full"></div>
</div>
</div>
<div class="bg-white p-6 rounded-2xl shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-slate-100">
<p class="text-caption font-caption text-sam-gray-mid mb-1">In Progress</p>
<p class="text-3xl font-bold text-sam-orange">7</p>
<div class="mt-2 w-full bg-slate-100 h-1.5 rounded-full">
<div class="bg-sam-orange h-full w-[25%] rounded-full"></div>
</div>
</div>
<div class="bg-white p-6 rounded-2xl shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-slate-100">
<p class="text-caption font-caption text-sam-gray-mid mb-1">Average Score</p>
<p class="text-3xl font-bold text-sam-navy">74%</p>
<div class="mt-2 flex items-center text-sam-red text-sm font-medium">
<span class="material-symbols-outlined text-sm">trending_down</span>
<span>-3% vs last cohort</span>
</div>
</div>
</div>
<!-- Roster Table Container -->
<div class="bg-white rounded-2xl shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-slate-100 overflow-hidden">
<div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
<div class="flex items-center gap-4">
<div class="relative">
<input class="pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-1 focus:ring-sam-red outline-none" placeholder="Filter roster..." type="text"/>
<span class="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-sm">filter_list</span>
</div>
<button class="text-sm font-medium text-sam-navy hover:text-sam-red flex items-center gap-1 transition-colors">
<span>Status: All</span>
<span class="material-symbols-outlined text-xs">keyboard_arrow_down</span>
</button>
</div>
<button class="p-2 hover:bg-slate-100 rounded-full transition-colors">
<span class="material-symbols-outlined text-slate-400">more_vert</span>
</button>
</div>
<table class="w-full text-left border-collapse">
<thead>
<tr class="bg-slate-50/50 text-caption font-caption text-sam-gray-mid uppercase tracking-wider">
<th class="px-6 py-4 font-semibold">Student Name</th>
<th class="px-6 py-4 font-semibold">Assigned Date</th>
<th class="px-6 py-4 font-semibold">Status</th>
<th class="px-6 py-4 font-semibold text-right">Performance</th>
<th class="px-6 py-4 font-semibold text-center">Action</th>
</tr>
</thead>
<tbody class="divide-y divide-slate-100">
<!-- Student Row 1 -->
<tr class="hover:bg-slate-50/80 transition-colors group">
<td class="px-6 py-4">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">AB</div>
<div>
<p class="font-semibold text-sam-navy">Alex Bennett</p>
<p class="text-xs text-sam-gray-mid">ID: #AM-3842</p>
</div>
</div>
</td>
<td class="px-6 py-4 text-sm text-sam-gray-dark">Oct 12, 2023</td>
<td class="px-6 py-4">
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-sam-teal">
                                    Complete
                                </span>
</td>
<td class="px-6 py-4 text-right">
<span class="font-bold text-sam-navy">92%</span>
<div class="w-24 ml-auto mt-1 bg-slate-100 h-1 rounded-full">
<div class="bg-sam-teal h-full w-[92%] rounded-full"></div>
</div>
</td>
<td class="px-6 py-4 text-center">
<button class="text-sam-navy hover:text-sam-red p-1 rounded-md transition-colors">
<span class="material-symbols-outlined">visibility</span>
</button>
</td>
</tr>
<!-- Student Row 2 -->
<tr class="hover:bg-slate-50/80 transition-colors group">
<td class="px-6 py-4">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border border-orange-200">CC</div>
<div>
<p class="font-semibold text-sam-navy">Chloe Chen</p>
<p class="text-xs text-sam-gray-mid">ID: #AM-3855</p>
</div>
</div>
</td>
<td class="px-6 py-4 text-sm text-sam-gray-dark">Oct 14, 2023</td>
<td class="px-6 py-4">
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-sam-orange">
                                    In Progress
                                </span>
</td>
<td class="px-6 py-4 text-right">
<span class="text-xs text-sam-gray-mid italic">8 / 20 items</span>
<div class="w-24 ml-auto mt-1 bg-slate-100 h-1 rounded-full">
<div class="bg-sam-orange h-full w-[40%] rounded-full"></div>
</div>
</td>
<td class="px-6 py-4 text-center">
<button class="text-sam-navy hover:text-sam-red p-1 rounded-md transition-colors">
<span class="material-symbols-outlined">edit</span>
</button>
</td>
</tr>
<!-- Student Row 3 -->
<tr class="hover:bg-slate-50/80 transition-colors group">
<td class="px-6 py-4">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold border border-purple-200">DL</div>
<div>
<p class="font-semibold text-sam-navy">David Lu</p>
<p class="text-xs text-sam-gray-mid">ID: #AM-3901</p>
</div>
</div>
</td>
<td class="px-6 py-4 text-sm text-sam-gray-dark">Oct 15, 2023</td>
<td class="px-6 py-4">
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-sam-gray-mid">
                                    Not Started
                                </span>
</td>
<td class="px-6 py-4 text-right">
<span class="text-xs text-slate-300">--</span>
</td>
<td class="px-6 py-4 text-center">
<button class="text-sam-navy hover:text-sam-red p-1 rounded-md transition-colors">
<span class="material-symbols-outlined">send</span>
</button>
</td>
</tr>
<!-- Student Row 4 -->
<tr class="hover:bg-slate-50/80 transition-colors group">
<td class="px-6 py-4">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold border border-red-200">ER</div>
<div>
<p class="font-semibold text-sam-navy">Emma Rodriguez</p>
<p class="text-xs text-sam-gray-mid">ID: #AM-3912</p>
</div>
</div>
</td>
<td class="px-6 py-4 text-sm text-sam-gray-dark">Oct 11, 2023</td>
<td class="px-6 py-4">
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-sam-teal">
                                    Complete
                                </span>
</td>
<td class="px-6 py-4 text-right">
<span class="font-bold text-sam-navy">65%</span>
<div class="w-24 ml-auto mt-1 bg-slate-100 h-1 rounded-full">
<div class="bg-sam-orange h-full w-[65%] rounded-full"></div>
</div>
</td>
<td class="px-6 py-4 text-center">
<button class="text-sam-navy hover:text-sam-red p-1 rounded-md transition-colors">
<span class="material-symbols-outlined">visibility</span>
</button>
</td>
</tr>
<!-- Student Row 5 -->
<tr class="hover:bg-slate-50/80 transition-colors group">
<td class="px-6 py-4">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold border border-yellow-200">JM</div>
<div>
<p class="font-semibold text-sam-navy">James Miller</p>
<p class="text-xs text-sam-gray-mid">ID: #AM-3950</p>
</div>
</div>
</td>
<td class="px-6 py-4 text-sm text-sam-gray-dark">Oct 15, 2023</td>
<td class="px-6 py-4">
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-sam-orange">
                                    In Progress
                                </span>
</td>
<td class="px-6 py-4 text-right">
<span class="text-xs text-sam-gray-mid italic">19 / 20 items</span>
<div class="w-24 ml-auto mt-1 bg-slate-100 h-1 rounded-full">
<div class="bg-sam-teal h-full w-[95%] rounded-full"></div>
</div>
</td>
<td class="px-6 py-4 text-center">
<button class="text-sam-navy hover:text-sam-red p-1 rounded-md transition-colors">
<span class="material-symbols-outlined">edit</span>
</button>
</td>
</tr>
</tbody>
</table>
<div class="px-6 py-4 border-t border-slate-100 flex justify-between items-center text-caption font-caption text-sam-gray-mid">
<p>Showing 5 of 28 students</p>
<div class="flex gap-2">
<button class="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" disabled="">
<span class="material-symbols-outlined text-sm align-middle">chevron_left</span>
</button>
<button class="px-3 py-1.5 bg-sam-navy text-white rounded-lg">1</button>
<button class="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">2</button>
<button class="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">3</button>
<button class="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
<span class="material-symbols-outlined text-sm align-middle">chevron_right</span>
</button>
</div>
</div>
</div>
<!-- Mascot Callout -->
<div class="mt-10 flex items-center gap-6 p-6 bg-white rounded-3xl border border-sam-cream shadow-sm relative overflow-hidden">
<div class="absolute right-0 top-0 w-32 h-32 bg-sam-cream rounded-full -mr-16 -mt-16 opacity-50"></div>
<div class="w-24 h-24 flex-shrink-0">
<img alt="Sammy the Otter Mascot" class="w-full h-full object-contain" data-alt="a friendly cartoon otter character wearing a red bowtie, waving cheerfully, clean vector style, bright colors" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgp0ZFbqLtDs9frmOGNuHtX-f9HpikkZ6P5dI0jJr8ZdmU97_PIWDns5Hz6pfC8hKglnTf6ljiOoyr2wKXZCyKXPrAEH83dz2qktjuvrDiaLWixVpM04yZ0BYYZCFunlObOCBywOSJKfxDIHmgLRvgJssLqsbLnN_LP_Pv8_un0JIcTYOufN0cmLrp1NwyDwZmxoxKHUYpaAMQ8byKCPPfZYYurpVM0MAJRVJiGdOUxcnFKgneZ2webgy-BoDLkr1mQdJudKkta9cD"/>
</div>
<div class="flex-1 relative z-10">
<p class="font-headline-adult text-lg text-sam-navy mb-1">Great progress with the Grade 3 cohort!</p>
<p class="text-sam-gray-mid font-body-regular">It looks like most students have completed their initial Number Sense diagnostic. You can now generate the <a class="text-sam-red font-semibold hover:underline" href="#">Strategic Growth Report</a> for this group.</p>
</div>
</div>
</div>
</main>
</body></html>

<!-- Module D - 7: Instructor Roster - Empty (Desktop) -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Atlas Assessment - Instructor Roster</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:wght@500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "tertiary-container": "#936f03",
                    "on-tertiary": "#ffffff",
                    "on-tertiary-container": "#fffbff",
                    "surface-container-low": "#f1f3ff",
                    "sam-navy": "#1B3A6B",
                    "on-surface": "#001a40",
                    "secondary-fixed-dim": "#ffb780",
                    "on-primary-container": "#fffbff",
                    "tertiary-fixed-dim": "#edc157",
                    "inverse-on-surface": "#edf0ff",
                    "on-tertiary-fixed": "#251a00",
                    "on-primary": "#ffffff",
                    "outline-variant": "#e4bebc",
                    "on-error": "#ffffff",
                    "error": "#ba1a1a",
                    "on-surface-variant": "#5b403f",
                    "surface-dim": "#cadaff",
                    "inverse-surface": "#0d2f60",
                    "sam-yellow": "#FFD166",
                    "on-error-container": "#93000a",
                    "sam-gray-dark": "#333333",
                    "surface-container": "#e8edff",
                    "primary-container": "#db313f",
                    "primary-fixed": "#ffdad8",
                    "on-secondary": "#ffffff",
                    "surface-container-high": "#e0e8ff",
                    "surface-container-lowest": "#ffffff",
                    "sam-gray-mid": "#777777",
                    "on-background": "#001a40",
                    "primary-fixed-dim": "#ffb3b1",
                    "surface-tint": "#bb152c",
                    "secondary": "#8e4e14",
                    "sam-red": "#E63946",
                    "error-container": "#ffdad6",
                    "on-primary-fixed": "#410007",
                    "inverse-primary": "#ffb3b1",
                    "surface-container-highest": "#d7e2ff",
                    "secondary-fixed": "#ffdcc4",
                    "secondary-container": "#ffab69",
                    "white": "#FFFFFF",
                    "on-secondary-fixed-variant": "#6f3800",
                    "sam-orange": "#F4A261",
                    "background": "#f9f9ff",
                    "tertiary-fixed": "#ffdf9b",
                    "surface-variant": "#d7e2ff",
                    "tertiary": "#755700",
                    "sam-cream": "#FFF8F0",
                    "on-secondary-fixed": "#2f1400",
                    "on-tertiary-fixed-variant": "#5b4300",
                    "surface-bright": "#f9f9ff",
                    "sam-gray-light": "#E5E5E5",
                    "sam-teal": "#06A77D",
                    "surface": "#f9f9ff",
                    "primary": "#b7102a",
                    "on-primary-fixed-variant": "#92001c",
                    "on-secondary-container": "#783d01",
                    "outline": "#8f6f6e"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "stack-lg": "32px",
                    "report-width": "880px",
                    "margin-desktop": "40px",
                    "gutter": "24px",
                    "margin-tablet": "32px",
                    "unit": "4px",
                    "stack-sm": "8px",
                    "container-max": "1440px",
                    "stack-md": "16px"
            },
            "fontFamily": {
                    "display-child": ["Plus Jakarta Sans"],
                    "math-numeral": ["Plus Jakarta Sans"],
                    "headline-adult": ["Inter"],
                    "caption": ["Inter"],
                    "body-regular": ["Inter"]
            },
            "fontSize": {
                    "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                    "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                    "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                    "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                    "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
    </style>
</head>
<body class="bg-sam-cream font-body-regular text-on-surface antialiased">
<!-- TopAppBar Shell -->
<nav class="bg-white dark:bg-slate-900 font-['Plus_Jakarta_Sans'] text-sm antialiased docked full-width top-0 z-50 border-b border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center w-full px-6 h-16 fixed">
<div class="flex items-center gap-8">
<span class="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Atlas Assessment</span>
<div class="hidden md:flex gap-6">
<a class="text-[#E63946] font-bold transition-all" href="#">Student Roster</a>
<a class="text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" href="#">Cohort Analytics</a>
<a class="text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" href="#">Resources</a>
</div>
</div>
<div class="flex items-center gap-4">
<div class="relative hidden sm:block">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
<input class="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-[#E63946]" placeholder="Search roster..." type="text"/>
</div>
<button class="p-2 text-slate-500 hover:bg-slate-50 rounded-full">
<span class="material-symbols-outlined">notifications</span>
</button>
<button class="p-2 text-slate-500 hover:bg-slate-50 rounded-full">
<span class="material-symbols-outlined">help_outline</span>
</button>
<img alt="Instructor Profile Avatar" class="w-8 h-8 rounded-full border-2 border-slate-200" data-alt="close-up portrait of a professional male instructor with a friendly smile, clean lighting, blurred office background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzDRW_UZyVOn1kFRnZVW2kJnt8YnHfkxTd5kdNHC2EOFyFhzBvqdlYobOuyrsowrQZ97KQ69vPx6siuNso6uu7z8QEN_KT-RF_9LLaq-EaNEhvPAEC3ZNHW-rrHSR56-s8c9Lr36c3XJnc-LgF2ZGK4GZD-tC8WsZCSXqGsauMe5RD49Y_fS3k18aH1ApQWjlIPnNolcdE34s8t_A4TlN1ycgICkbVXdzS69DlBEiadLYF2qquv2ZFm642-CnFGBz0Ify2Q0covbv4"/>
</div>
</nav>
<div class="flex pt-16">
<!-- SideNavBar Shell -->
<aside class="bg-slate-50 dark:bg-slate-950 font-['Plus_Jakarta_Sans'] text-[14px] font-medium h-screen w-64 fixed left-0 top-0 border-r border-slate-200 dark:border-slate-800 flat no-shadows flex flex-col h-full pt-20 pb-6 hidden md:flex">
<div class="px-6 mb-8">
<div class="flex items-center gap-3 mb-2">
<div class="w-10 h-10 bg-[#E63946] rounded-xl flex items-center justify-center text-white font-bold">A</div>
<div>
<h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Instructor Portal</h2>
<p class="text-xs text-slate-500">Diagnostic Dashboard</p>
</div>
</div>
</div>
<nav class="flex-1 space-y-1 px-4">
<a class="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 text-[#E63946] border-r-4 border-[#E63946] shadow-sm transition-all" href="#">
<span class="material-symbols-outlined">group</span>
<span>Student Roster</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all" href="#">
<span class="material-symbols-outlined">analytics</span>
<span>Cohort Analytics</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all" href="#">
<span class="material-symbols-outlined">assessment</span>
<span>Diagnostic Reports</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all" href="#">
<span class="material-symbols-outlined">menu_book</span>
<span>Resources</span>
</a>
</nav>
<div class="px-4 space-y-1 border-t border-slate-200 dark:border-slate-800 pt-4">
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all" href="#">
<span class="material-symbols-outlined">settings</span>
<span>Settings</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all" href="#">
<span class="material-symbols-outlined">contact_support</span>
<span>Support</span>
</a>
</div>
</aside>
<!-- Main Content Canvas -->
<main class="flex-1 md:ml-64 p-8">
<div class="max-w-report-width mx-auto">
<!-- Header Actions -->
<div class="flex justify-between items-end mb-12">
<div>
<h1 class="font-headline-adult text-headline-adult text-sam-navy mb-1">Student Roster</h1>
<p class="font-body-regular text-body-regular text-sam-gray-mid">Manage your classes and individual student progress.</p>
</div>
<button class="bg-sam-red text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-md hover:opacity-90 transition-all active:scale-95">
<span class="material-symbols-outlined">person_add</span>
<span>Add First Student</span>
</button>
</div>
<!-- Empty State Bento Grid -->
<div class="grid grid-cols-12 gap-gutter">
<!-- Main Hero Empty State -->
<div class="col-span-12 lg:col-span-8 bg-white rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-sam-gray-light">
<div class="relative mb-8">
<div class="w-48 h-48 bg-sam-cream rounded-full flex items-center justify-center relative">
<img alt="Empty Slate Illustration" class="w-32 h-32 object-contain" data-alt="expressive whimsical illustration of a friendly otter mascot holding an empty clipboard with colorful math symbols floating around, soft 3d render style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAY_OyRdrioBofuua6jLiMJ95l32betIBFhHHpQugwE37a7RMkMRERqIEXyLdpUd6x_5eA2QLovT2KEPMaZM320lAeTk3KTlu69DJk1kOMMATA3Lblo86CiiwFHfSL6OTPTyVSrMHSPl-xpcVOWaFunKU_Fu1_NRm6-KwzW0j1mRV15fXmhc3SShGNVQvfHPDGWOcSS4qSKNuWkj2tvDjlY045cX3A4COFh3dxrBx1nVEyNzDGMFTf1Ce0Ewgb4S3dZ6Pgl-vb0Tfe0"/>
</div>
<div class="absolute -bottom-2 -right-2 w-12 h-12 bg-sam-yellow rounded-full flex items-center justify-center shadow-lg">
<span class="material-symbols-outlined text-sam-navy">waving_hand</span>
</div>
</div>
<h2 class="font-display-child text-display-child text-sam-navy mb-4">Your Classroom is Quiet!</h2>
<p class="text-sam-gray-dark max-w-md mx-auto mb-8 leading-relaxed">
                            It looks like you haven't added any students to your roster yet. Once you add your cohort, you'll be able to track diagnostic progress, view heatmaps, and generate personalized reports.
                        </p>
<div class="flex gap-4">
<button class="bg-sam-red text-white px-8 py-3 rounded-full font-bold shadow-lg hover:brightness-110 transition-all">
                                Import Class List
                            </button>
<button class="bg-white border-2 border-sam-navy text-sam-navy px-8 py-3 rounded-full font-bold hover:bg-sam-cream transition-all">
                                Watch Tutorial
                            </button>
</div>
</div>
<!-- Side Actions / Tips -->
<div class="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
<div class="bg-sam-navy text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group">
<div class="relative z-10">
<span class="material-symbols-outlined text-sam-yellow mb-2 text-3xl">lightbulb</span>
<h3 class="font-headline-adult text-lg mb-2">Getting Started</h3>
<p class="text-sm text-slate-300 mb-4 leading-relaxed">The best way to begin is by assigning the "Baseline Diagnostics" to your new students.</p>
<a class="text-sam-yellow font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all" href="#">
                                    Browse Assessments <span class="material-symbols-outlined text-sm">arrow_forward</span>
</a>
</div>
<div class="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-all">
<span class="material-symbols-outlined text-9xl">school</span>
</div>
</div>
<div class="bg-white p-6 rounded-2xl shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-sam-gray-light">
<h3 class="font-headline-adult text-base text-sam-navy mb-4 flex items-center gap-2">
<span class="material-symbols-outlined text-sam-teal">check_circle</span>
                                Setup Checklist
                            </h3>
<ul class="space-y-4">
<li class="flex items-center gap-3 text-sm text-sam-gray-mid">
<div class="w-5 h-5 rounded-full border-2 border-sam-gray-light flex-shrink-0"></div>
<span>Create your first cohort</span>
</li>
<li class="flex items-center gap-3 text-sm text-sam-gray-mid">
<div class="w-5 h-5 rounded-full border-2 border-sam-gray-light flex-shrink-0"></div>
<span>Add students manually or via CSV</span>
</li>
<li class="flex items-center gap-3 text-sm text-sam-gray-mid">
<div class="w-5 h-5 rounded-full border-2 border-sam-gray-light flex-shrink-0"></div>
<span>Schedule a Diagnostic Session</span>
</li>
<li class="flex items-center gap-3 text-sm text-sam-gray-mid">
<div class="w-5 h-5 rounded-full border-2 border-sam-gray-light flex-shrink-0"></div>
<span>Review Instructor resources</span>
</li>
</ul>
</div>
</div>
<!-- Secondary Insights Empty State -->
<div class="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-gutter mt-4">
<div class="bg-white/50 border-2 border-dashed border-sam-gray-light p-6 rounded-2xl flex flex-col items-center text-center">
<span class="material-symbols-outlined text-sam-gray-mid mb-3 text-4xl">group_work</span>
<span class="font-headline-adult text-sm text-sam-navy">Cohort Analytics</span>
<p class="text-xs text-sam-gray-mid mt-1">Data will populate after the first assessment</p>
</div>
<div class="bg-white/50 border-2 border-dashed border-sam-gray-light p-6 rounded-2xl flex flex-col items-center text-center">
<span class="material-symbols-outlined text-sam-gray-mid mb-3 text-4xl">trending_up</span>
<span class="font-headline-adult text-sm text-sam-navy">Growth Tracking</span>
<p class="text-xs text-sam-gray-mid mt-1">Monitor long-term student progress trends</p>
</div>
<div class="bg-white/50 border-2 border-dashed border-sam-gray-light p-6 rounded-2xl flex flex-col items-center text-center">
<span class="material-symbols-outlined text-sam-gray-mid mb-3 text-4xl">warning</span>
<span class="font-headline-adult text-sm text-sam-navy">Misconception Alerts</span>
<p class="text-xs text-sam-gray-mid mt-1">Identify early learning gaps automatically</p>
</div>
</div>
</div>
</div>
</main>
</div>
<!-- Mobile Navigation Shell -->
<nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around items-center h-16 px-4">
<a class="flex flex-col items-center text-[#E63946]" href="#">
<span class="material-symbols-outlined">group</span>
<span class="text-[10px] mt-1 font-bold">Roster</span>
</a>
<a class="flex flex-col items-center text-slate-400" href="#">
<span class="material-symbols-outlined">analytics</span>
<span class="text-[10px] mt-1">Analytics</span>
</a>
<div class="relative -top-6">
<button class="w-14 h-14 bg-sam-red rounded-full text-white shadow-xl flex items-center justify-center">
<span class="material-symbols-outlined text-3xl">add</span>
</button>
</div>
<a class="flex flex-col items-center text-slate-400" href="#">
<span class="material-symbols-outlined">assessment</span>
<span class="text-[10px] mt-1">Reports</span>
</a>
<a class="flex flex-col items-center text-slate-400" href="#">
<span class="material-symbols-outlined">menu_book</span>
<span class="text-[10px] mt-1">Resources</span>
</a>
</nav>
</body></html>

<!-- Module D - 8: Instructor Roster (Mobile) -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Instructor Roster - Atlas Assessment</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:wght@500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "tertiary-container": "#936f03",
                        "on-tertiary": "#ffffff",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "sam-navy": "#1B3A6B",
                        "on-surface": "#001a40",
                        "secondary-fixed-dim": "#ffb780",
                        "on-primary-container": "#fffbff",
                        "tertiary-fixed-dim": "#edc157",
                        "inverse-on-surface": "#edf0ff",
                        "on-tertiary-fixed": "#251a00",
                        "on-primary": "#ffffff",
                        "outline-variant": "#e4bebc",
                        "on-error": "#ffffff",
                        "error": "#ba1a1a",
                        "on-surface-variant": "#5b403f",
                        "surface-dim": "#cadaff",
                        "inverse-surface": "#0d2f60",
                        "sam-yellow": "#FFD166",
                        "on-error-container": "#93000a",
                        "sam-gray-dark": "#333333",
                        "surface-container": "#e8edff",
                        "primary-container": "#db313f",
                        "primary-fixed": "#ffdad8",
                        "on-secondary": "#ffffff",
                        "surface-container-high": "#e0e8ff",
                        "surface-container-lowest": "#ffffff",
                        "sam-gray-mid": "#777777",
                        "on-background": "#001a40",
                        "primary-fixed-dim": "#ffb3b1",
                        "surface-tint": "#bb152c",
                        "secondary": "#8e4e14",
                        "sam-red": "#E63946",
                        "error-container": "#ffdad6",
                        "on-primary-fixed": "#410007",
                        "inverse-primary": "#ffb3b1",
                        "surface-container-highest": "#d7e2ff",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "white": "#FFFFFF",
                        "on-secondary-fixed-variant": "#6f3800",
                        "sam-orange": "#F4A261",
                        "background": "#f9f9ff",
                        "tertiary-fixed": "#ffdf9b",
                        "surface-variant": "#d7e2ff",
                        "tertiary": "#755700",
                        "sam-cream": "#FFF8F0",
                        "on-secondary-fixed": "#2f1400",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "surface-bright": "#f9f9ff",
                        "sam-gray-light": "#E5E5E5",
                        "sam-teal": "#06A77D",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-primary-fixed-variant": "#92001c",
                        "on-secondary-container": "#783d01",
                        "outline": "#8f6f6e"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "stack-lg": "32px",
                        "report-width": "880px",
                        "margin-desktop": "40px",
                        "gutter": "24px",
                        "margin-tablet": "32px",
                        "unit": "4px",
                        "stack-sm": "8px",
                        "container-max": "1440px",
                        "stack-md": "16px"
                    },
                    "fontFamily": {
                        "display-child": ["Plus Jakarta Sans"],
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "caption": ["Inter"],
                        "body-regular": ["Inter"]
                    },
                    "fontSize": {
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
                    }
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body {
            background-color: #FFF8F0; /* sam-cream foundation */
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="min-h-screen flex flex-col font-body-regular text-body-regular text-on-surface">
<!-- TopAppBar -->
<header class="bg-white dark:bg-slate-900 sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center w-full px-6 py-4">
<div class="text-xl font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans']">Atlas Assessment</div>
<div class="flex items-center gap-4">
<button class="cursor-pointer active:opacity-80 text-slate-600 dark:text-slate-400">
<span class="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<div class="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
<img alt="Instructor profile avatar" class="w-full h-full object-cover" data-alt="professional headshot of a female educator smiling warmly in a bright modern office setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC667d9Fl1zUAHY42Wnydp30PX97jdMnl6Do0QdBihuEcSUKH4ELwPXz9cdMnYOIMATmxtGIDXyPeyRwLJtHEiiIyBxIyUgkHu0qHwsaErD2TwdT49CHUdNLYee3W0gAX6BCmqKlR9VEk_VAt1d1if1jZxnQTZzUymSBQTr6n045gSExk4bY-03Kwph7DZjg2B4c5RKkcQmSyAP28sHIJlhW6Z3-YErOau8kSKva_MSbz9RX8N26NgRXzD0OfJad8xkmOj0rNRW3a9e"/>
</div>
</div>
</header>
<!-- Content Canvas -->
<main class="flex-1 pb-24">
<!-- Dashboard Header -->
<section class="px-6 pt-8 pb-4">
<h1 class="font-headline-adult text-headline-adult text-sam-navy mb-2">Student Roster</h1>
<p class="font-body-regular text-body-regular text-sam-gray-dark">Manage your K-4 mathematics students and track assessment progress.</p>
</section>
<!-- Search & Filter Area -->
<section class="px-6 mb-6">
<div class="bg-white rounded-xl shadow-sm p-2 flex items-center border border-sam-gray-light">
<span class="material-symbols-outlined text-sam-gray-mid px-2" data-icon="search">search</span>
<input class="w-full border-none focus:ring-0 text-sm font-body-regular py-2" placeholder="Search students..." type="text"/>
<button class="bg-sam-cream p-2 rounded-lg text-sam-navy">
<span class="material-symbols-outlined text-xl" data-icon="filter_list">filter_list</span>
</button>
</div>
</section>
<!-- Roster Bento Grid / List -->
<section class="px-6 space-y-4">
<!-- Student Card 1 -->
<div class="bg-white rounded-xl p-4 shadow-[0_4px_12px_rgba(27,58,107,0.08)] border-l-4 border-sam-teal">
<div class="flex justify-between items-start mb-3">
<div class="flex items-center gap-3">
<div class="w-12 h-12 rounded-full bg-sam-cream flex items-center justify-center border border-sam-gray-light overflow-hidden">
<img alt="Student avatar" class="w-full h-full object-cover" data-alt="close up portrait of a cheerful young boy with curly hair in a classroom setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEDlvt3_74J48cJDVG829pitr-rnmfsSaiIVEt4yltGy0vs84ll8bCP4owvqCLHlH5prHqMu08WKsHKvE1QtMBerRZ3NkMl9awFta-vNOwgg8tOuDVzoZFIUawgP71A2kiscyQ4u3Ac4cOhmuDGIX2p7hX3vf3KRAfDsZ0wcnTBfBckFyztJgZdWNou8xJ_wh2Wrut71eytL2wzGqhX2rWy7rxeKt-tz68ol3f3dCiYkkbTNO_T1EeViM5n13Jz4AorPDD5JAACF-6"/>
</div>
<div>
<h3 class="font-semibold text-sam-navy">Leo Archer</h3>
<span class="font-caption text-caption text-sam-gray-mid">Grade 2 • Primary A</span>
</div>
</div>
<span class="bg-teal-50 text-sam-teal text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Complete</span>
</div>
<div class="grid grid-cols-2 gap-4 border-t border-stone-50 pt-3">
<div>
<p class="text-[10px] text-sam-gray-mid uppercase font-bold tracking-tight">Last Score</p>
<p class="text-xl font-math-numeral text-sam-navy">88%</p>
</div>
<div class="flex flex-col items-end">
<button class="text-sam-red font-semibold text-sm flex items-center gap-1 active:scale-95 transition-transform">
                            View Report
                            <span class="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span>
</button>
</div>
</div>
</div>
<!-- Student Card 2 -->
<div class="bg-white rounded-xl p-4 shadow-[0_4px_12px_rgba(27,58,107,0.08)] border-l-4 border-sam-orange">
<div class="flex justify-between items-start mb-3">
<div class="flex items-center gap-3">
<div class="w-12 h-12 rounded-full bg-sam-cream flex items-center justify-center border border-sam-gray-light overflow-hidden">
<img alt="Student avatar" class="w-full h-full object-cover" data-alt="close up portrait of a young girl with braids smiling at the camera" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDWvELnOLz6Kf-E4mknlF_vSsOMt50jkaEuPCD2DDdwATpG_bHrFdu7MDc99xqjxmHQ8hY_uEidRyzozecNytwAYd_3DXRGgPL-6egdMiz0DWMSD3IivS5bgl0YYnLoq3wnfIkq7y6kpbbu2yQ6cTTSZvU99honAoBI5zyTWLtZ5bexZHCZZvC5wLidWdfakJeAKXedlNqArVPfycpz7wuNIYFRdus_akYTsV2lqLQDpaPUsjW9nQ07fZtojm85BQtP3bxAOHUDlGE"/>
</div>
<div>
<h3 class="font-semibold text-sam-navy">Maya Patel</h3>
<span class="font-caption text-caption text-sam-gray-mid">Grade 1 • Junior B</span>
</div>
</div>
<span class="bg-orange-50 text-sam-orange text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">In Progress</span>
</div>
<div class="grid grid-cols-1 gap-2 border-t border-stone-50 pt-3">
<div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
<div class="bg-sam-orange h-full w-[65%] rounded-full"></div>
</div>
<div class="flex justify-between items-center">
<p class="text-[10px] text-sam-gray-mid">12/18 Questions</p>
<button class="text-sam-navy font-semibold text-sm flex items-center gap-1 active:scale-95 transition-transform">
                            Resume
                            <span class="material-symbols-outlined text-sm" data-icon="play_arrow">play_arrow</span>
</button>
</div>
</div>
</div>
<!-- Student Card 3 -->
<div class="bg-white rounded-xl p-4 shadow-[0_4px_12px_rgba(27,58,107,0.08)] border-l-4 border-sam-gray-light">
<div class="flex justify-between items-start mb-3">
<div class="flex items-center gap-3">
<div class="w-12 h-12 rounded-full bg-sam-cream flex items-center justify-center border border-sam-gray-light overflow-hidden text-sam-gray-mid">
<span class="material-symbols-outlined text-3xl" data-icon="person">person</span>
</div>
<div>
<h3 class="font-semibold text-sam-navy">Lucas Grant</h3>
<span class="font-caption text-caption text-sam-gray-mid">Grade 3 • Primary C</span>
</div>
</div>
<span class="bg-slate-50 text-sam-gray-mid text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Pending</span>
</div>
<div class="flex justify-between items-center border-t border-stone-50 pt-3">
<p class="text-xs text-sam-gray-mid italic">No assessment data available</p>
<button class="bg-sam-red text-white font-semibold text-sm px-4 py-1.5 rounded-full active:scale-95 transition-transform">
                        Assign
                    </button>
</div>
</div>
<!-- Student Card 4 -->
<div class="bg-white rounded-xl p-4 shadow-[0_4px_12px_rgba(27,58,107,0.08)] border-l-4 border-sam-teal">
<div class="flex justify-between items-start mb-3">
<div class="flex items-center gap-3">
<div class="w-12 h-12 rounded-full bg-sam-cream flex items-center justify-center border border-sam-gray-light overflow-hidden">
<img alt="Student avatar" class="w-full h-full object-cover" data-alt="portrait of a young elementary school student smiling shyly" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBx9YbEe_lb-jNn9NUXifgTfS95AVyIx6m-0_9fm0dyWPHihRz5gb1Xg8wrmv0L33BwTueqqCn-SDZM5vWej1iGwUUUC-GSP7HNtuDEv17kno3wzqf-DwU42fagOxy9tfF8BUP5mIOehwrKWFCm3sk5HkXyFUsUjI1frchoemQ-jLbk2HWqf8kU4jTuMH1hjV2gyVQoX0bLeeHvuu906M1rmPlJDWR0h4zIAvbZbcA-8kiz_X7bQ6GRQICinlhwfQIA9eR7abxqx_ft"/>
</div>
<div>
<h3 class="font-semibold text-sam-navy">Chloe Wu</h3>
<span class="font-caption text-caption text-sam-gray-mid">Grade 4 • Master A</span>
</div>
</div>
<span class="bg-teal-50 text-sam-teal text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Complete</span>
</div>
<div class="grid grid-cols-2 gap-4 border-t border-stone-50 pt-3">
<div>
<p class="text-[10px] text-sam-gray-mid uppercase font-bold tracking-tight">Last Score</p>
<p class="text-xl font-math-numeral text-sam-navy">94%</p>
</div>
<div class="flex flex-col items-end">
<button class="text-sam-red font-semibold text-sm flex items-center gap-1 active:scale-95 transition-transform">
                            View Report
                            <span class="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span>
</button>
</div>
</div>
</div>
</section>
<!-- Add Student FAB -->
<button class="fixed bottom-24 right-6 w-14 h-14 bg-sam-red text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40">
<span class="material-symbols-outlined text-3xl" data-icon="person_add">person_add</span>
</button>
<!-- Footer -->
<footer class="bg-stone-50 dark:bg-slate-950 w-full border-t border-slate-200 dark:border-slate-800 mt-12 mb-8">
<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center py-8 px-6 space-y-4 md:space-y-0">
<div class="font-bold text-slate-800 dark:text-slate-200 font-['Plus_Jakarta_Sans']">© 2024 S.A.M Atlas Assessment. All rights reserved.</div>
<nav class="flex flex-wrap justify-center gap-4">
<a class="font-['Plus_Jakarta_Sans'] text-sm text-slate-500 hover:text-slate-800 transition-all duration-200 underline decoration-red-600 underline-offset-4" href="#">Privacy Policy</a>
<a class="font-['Plus_Jakarta_Sans'] text-sm text-slate-500 hover:text-slate-800 transition-all duration-200 underline decoration-red-600 underline-offset-4" href="#">Terms of Service</a>
</nav>
</div>
</footer>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-xl">
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-transform hover:bg-slate-50 dark:hover:bg-slate-800" href="#">
<span class="material-symbols-outlined" data-icon="home">home</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Home</span>
</a>
<a class="flex flex-col items-center justify-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-1 active:scale-95 transition-transform" href="#">
<span class="material-symbols-outlined" data-icon="edit_document">edit_document</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Assess</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-transform hover:bg-slate-50 dark:hover:bg-slate-800" href="#">
<span class="material-symbols-outlined" data-icon="bar_chart">bar_chart</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Insights</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-transform hover:bg-slate-50 dark:hover:bg-slate-800" href="#">
<span class="material-symbols-outlined" data-icon="person">person</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Profile</span>
</a>
</nav>
</body></html>

<!-- Module D - 10: Instructor Report (Mobile) -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:wght@500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "tertiary-container": "#936f03",
                        "on-tertiary": "#ffffff",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "sam-navy": "#1B3A6B",
                        "on-surface": "#001a40",
                        "secondary-fixed-dim": "#ffb780",
                        "on-primary-container": "#fffbff",
                        "tertiary-fixed-dim": "#edc157",
                        "inverse-on-surface": "#edf0ff",
                        "on-tertiary-fixed": "#251a00",
                        "on-primary": "#ffffff",
                        "outline-variant": "#e4bebc",
                        "on-error": "#ffffff",
                        "error": "#ba1a1a",
                        "on-surface-variant": "#5b403f",
                        "surface-dim": "#cadaff",
                        "inverse-surface": "#0d2f60",
                        "sam-yellow": "#FFD166",
                        "on-error-container": "#93000a",
                        "sam-gray-dark": "#333333",
                        "surface-container": "#e8edff",
                        "primary-container": "#db313f",
                        "primary-fixed": "#ffdad8",
                        "on-secondary": "#ffffff",
                        "surface-container-high": "#e0e8ff",
                        "surface-container-lowest": "#ffffff",
                        "sam-gray-mid": "#777777",
                        "on-background": "#001a40",
                        "primary-fixed-dim": "#ffb3b1",
                        "surface-tint": "#bb152c",
                        "secondary": "#8e4e14",
                        "sam-red": "#E63946",
                        "error-container": "#ffdad6",
                        "on-primary-fixed": "#410007",
                        "inverse-primary": "#ffb3b1",
                        "surface-container-highest": "#d7e2ff",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "white": "#FFFFFF",
                        "on-secondary-fixed-variant": "#6f3800",
                        "sam-orange": "#F4A261",
                        "background": "#f9f9ff",
                        "tertiary-fixed": "#ffdf9b",
                        "surface-variant": "#d7e2ff",
                        "tertiary": "#755700",
                        "sam-cream": "#FFF8F0",
                        "on-secondary-fixed": "#2f1400",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "surface-bright": "#f9f9ff",
                        "sam-gray-light": "#E5E5E5",
                        "sam-teal": "#06A77D",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-primary-fixed-variant": "#92001c",
                        "on-secondary-container": "#783d01",
                        "outline": "#8f6f6e"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "stack-lg": "32px",
                        "report-width": "880px",
                        "margin-desktop": "40px",
                        "gutter": "24px",
                        "margin-tablet": "32px",
                        "unit": "4px",
                        "stack-sm": "8px",
                        "container-max": "1440px",
                        "stack-md": "16px"
                    },
                    "fontFamily": {
                        "display-child": ["Plus Jakarta Sans"],
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "caption": ["Inter"],
                        "body-regular": ["Inter"]
                    },
                    "fontSize": {
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
                    }
                }
            }
        }
    </script>
<style>
        .radar-grid {
            background-image: radial-gradient(circle, #E5E5E5 1px, transparent 1px);
            background-size: 40px 40px;
        }
        .custom-shadow {
            box-shadow: 0px 4px 12px rgba(27, 58, 107, 0.08);
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream font-body-regular text-sam-gray-dark min-h-screen flex flex-col">
<!-- Top AppBar (Adult Shell) -->
<header class="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
<div class="flex justify-between items-center w-full px-6 py-4">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-red-600">arrow_back</span>
<h1 class="text-xl font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans']">Atlas Assessment</h1>
</div>
<div class="flex items-center gap-4">
<span class="material-symbols-outlined text-slate-600 dark:text-slate-400 cursor-pointer">notifications</span>
<div class="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
<img alt="Instructor Profile" data-alt="close-up portrait of a professional female teacher smiling warmly in a bright office setting with soft natural light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKsSluuLuW3DkLAuufoTsYqaREz7ypmUhAOwM5ZOI95pIikquZ63IzxdWKiTvzLCcF3dqg2ostutRTjeAerEFH0Gw7eV1_QTjUJj18VgEGF6F3Rrh8WKcyx6hO-8vMC3GKf19-L1M_PY8q-g7ZaCe_pLDsqmZWdDjlSsXE42l54bHY8CyvLi5VKd8IYiT8FkZym3yT7TP4TuuywCAIbKvMwisM7I3pFpxVDGmKNGNWJ057E0022d_CD6PVPQNCAcGq3GxeR1VpC1Xq"/>
</div>
</div>
</div>
</header>
<main class="flex-grow pb-24">
<!-- Student Header Card -->
<section class="p-6">
<div class="bg-white rounded-xl p-6 custom-shadow border border-sam-gray-light flex items-center gap-4 mb-8">
<div class="w-16 h-16 rounded-2xl bg-sam-yellow flex items-center justify-center">
<span class="material-symbols-outlined text-sam-navy text-4xl" data-weight="fill">child_care</span>
</div>
<div>
<p class="font-caption text-sam-gray-mid">Individual Report</p>
<h2 class="font-headline-adult text-sam-navy">Leo Takahashi</h2>
<div class="flex items-center gap-2 mt-1">
<span class="px-2 py-0.5 bg-sam-teal/10 text-sam-teal text-xs font-bold rounded-full">Grade 2</span>
<span class="px-2 py-0.5 bg-sam-orange/10 text-sam-orange text-xs font-bold rounded-full">Primary Level</span>
</div>
</div>
</div>
<!-- Dashboard Grid -->
<div class="grid grid-cols-1 gap-6">
<!-- Radar Chart Container -->
<div class="bg-white rounded-xl p-6 custom-shadow border border-sam-gray-light">
<div class="flex justify-between items-start mb-6">
<div>
<h3 class="font-headline-adult text-sam-navy text-lg">Skill Proficiency</h3>
<p class="font-caption text-sam-gray-mid">Performance across math domains</p>
</div>
<span class="material-symbols-outlined text-sam-gray-mid">info</span>
</div>
<!-- Simplified SVG Radar Chart -->
<div class="relative aspect-square w-full max-w-[280px] mx-auto flex items-center justify-center">
<svg class="w-full h-full" viewbox="0 0 200 200">
<!-- Background Circles -->
<circle cx="100" cy="100" fill="none" r="90" stroke="#E5E5E5" stroke-width="1"></circle>
<circle cx="100" cy="100" fill="none" r="60" stroke="#E5E5E5" stroke-width="1"></circle>
<circle cx="100" cy="100" fill="none" r="30" stroke="#E5E5E5" stroke-width="1"></circle>
<!-- Axes -->
<line stroke="#E5E5E5" stroke-width="1" x1="100" x2="100" y1="10" y2="190"></line>
<line stroke="#E5E5E5" stroke-width="1" x1="10" x2="190" y1="100" y2="100"></line>
<line stroke="#E5E5E5" stroke-width="1" x1="36" x2="164" y1="36" y2="164"></line>
<line stroke="#E5E5E5" stroke-width="1" x1="36" x2="164" y1="164" y2="36"></line>
<!-- Data Polygon -->
<polygon fill="rgba(230, 57, 70, 0.15)" points="100,30 150,60 170,100 140,140 100,160 60,140 30,100 50,60" stroke="#E63946" stroke-width="2"></polygon>
<!-- Data Points -->
<circle cx="100" cy="30" fill="#E63946" r="4"></circle>
<circle cx="150" cy="60" fill="#E63946" r="4"></circle>
<circle cx="170" cy="100" fill="#E63946" r="4"></circle>
<circle cx="140" cy="140" fill="#E63946" r="4"></circle>
<circle cx="100" cy="160" fill="#E63946" r="4"></circle>
<circle cx="60" cy="140" fill="#E63946" r="4"></circle>
<circle cx="30" cy="100" fill="#E63946" r="4"></circle>
<circle cx="50" cy="60" fill="#E63946" r="4"></circle>
</svg>
<!-- Labels (Absolute Positioned for clarity) -->
<div class="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-sam-navy uppercase tracking-tighter">Number Sense</div>
<div class="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-sam-navy uppercase tracking-tighter">Logic</div>
<div class="absolute top-1/2 right-0 -translate-y-1/2 text-[10px] font-bold text-sam-navy uppercase tracking-tighter rotate-90 origin-right pr-2">Geometry</div>
<div class="absolute top-1/2 left-0 -translate-y-1/2 text-[10px] font-bold text-sam-navy uppercase tracking-tighter -rotate-90 origin-left pl-2">Algebra</div>
</div>
<div class="mt-8 grid grid-cols-2 gap-4">
<div class="flex items-center gap-2">
<span class="w-3 h-3 rounded-full bg-sam-red"></span>
<span class="text-xs font-medium">Actual Level</span>
</div>
<div class="flex items-center gap-2 opacity-40">
<span class="w-3 h-3 rounded-full bg-sam-gray-mid"></span>
<span class="text-xs font-medium">Peer Average</span>
</div>
</div>
</div>
<!-- Misconception Highlight -->
<div class="bg-white rounded-xl p-6 custom-shadow border border-sam-gray-light border-l-4 border-l-sam-orange">
<div class="flex items-center gap-3 mb-3">
<span class="material-symbols-outlined text-sam-orange">warning</span>
<h4 class="font-bold text-sam-navy">Key Misconception</h4>
</div>
<p class="text-sm text-sam-gray-dark leading-relaxed">
                        Leo frequently confuses "regrouping" with "borrowing" when working with multi-digit subtraction, specifically when zero is in the tens place.
                    </p>
<div class="mt-4 pt-4 border-t border-sam-gray-light flex justify-between items-center">
<span class="text-xs font-bold text-sam-navy">Recommended Action</span>
<button class="text-xs font-bold text-sam-red flex items-center gap-1">
                            View Exercise <span class="material-symbols-outlined text-sm">chevron_right</span>
</button>
</div>
</div>
<!-- Strategic Progress Bento Grid (Small) -->
<div class="grid grid-cols-2 gap-4">
<div class="bg-white p-4 rounded-xl custom-shadow border border-sam-gray-light flex flex-col justify-between">
<span class="material-symbols-outlined text-sam-teal mb-2">timer</span>
<div>
<p class="text-2xl font-bold text-sam-navy">14m</p>
<p class="text-[10px] text-sam-gray-mid uppercase font-bold tracking-wider">Avg Response Time</p>
</div>
</div>
<div class="bg-white p-4 rounded-xl custom-shadow border border-sam-gray-light flex flex-col justify-between">
<span class="material-symbols-outlined text-sam-red mb-2">trending_up</span>
<div>
<p class="text-2xl font-bold text-sam-navy">+12%</p>
<p class="text-[10px] text-sam-gray-mid uppercase font-bold tracking-wider">Monthly Growth</p>
</div>
</div>
</div>
<!-- Detailed Strand Chart (Simplified for mobile) -->
<div class="bg-white rounded-xl p-6 custom-shadow border border-sam-gray-light">
<h3 class="font-bold text-sam-navy mb-4">Detailed Breakdown</h3>
<div class="space-y-4">
<div class="space-y-1">
<div class="flex justify-between text-xs font-bold">
<span>Operations</span>
<span>85%</span>
</div>
<div class="h-2 w-full bg-sam-gray-light rounded-full overflow-hidden">
<div class="h-full bg-sam-teal rounded-full w-[85%]"></div>
</div>
</div>
<div class="space-y-1">
<div class="flex justify-between text-xs font-bold">
<span>Measurement</span>
<span>62%</span>
</div>
<div class="h-2 w-full bg-sam-gray-light rounded-full overflow-hidden">
<div class="h-full bg-sam-orange rounded-full w-[62%]"></div>
</div>
</div>
<div class="space-y-1">
<div class="flex justify-between text-xs font-bold">
<span>Data Handling</span>
<span>45%</span>
</div>
<div class="h-2 w-full bg-sam-gray-light rounded-full overflow-hidden">
<div class="h-full bg-sam-red rounded-full w-[45%]"></div>
</div>
</div>
</div>
</div>
</div>
</section>
<!-- Footer Shell -->
<footer class="bg-stone-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 mt-auto">
<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center py-8 px-6">
<p class="font-['Plus_Jakarta_Sans'] text-sm text-slate-500 dark:text-slate-400 text-center">© 2024 S.A.M Atlas Assessment. All rights reserved.</p>
<div class="flex gap-4 mt-4 md:mt-0">
<span class="text-slate-500 text-sm hover:text-slate-800 underline decoration-red-600 underline-offset-4 cursor-pointer transition-all duration-200">Privacy Policy</span>
<span class="text-slate-500 text-sm hover:text-slate-800 underline decoration-red-600 underline-offset-4 cursor-pointer transition-all duration-200">Terms of Service</span>
</div>
</div>
</footer>
</main>
<!-- Bottom Navigation Bar (Mobile) -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-white shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-xl md:hidden">
<div class="flex flex-col items-center justify-center text-slate-500 active:scale-95 transition-transform">
<span class="material-symbols-outlined">home</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Home</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-500 active:scale-95 transition-transform">
<span class="material-symbols-outlined">edit_document</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Assess</span>
</div>
<div class="flex flex-col items-center justify-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-1 active:scale-95 transition-transform">
<span class="material-symbols-outlined">bar_chart</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Insights</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-500 active:scale-95 transition-transform">
<span class="material-symbols-outlined">person</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Profile</span>
</div>
</nav>
</body></html>

<!-- Module D - 9: Instructor Individual Report (Desktop) -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Instructor Individual Student Report - Atlas Assessment</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&amp;family=Plus+Jakarta+Sans:wght@600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "tertiary-container": "#936f03",
                    "on-tertiary": "#ffffff",
                    "on-tertiary-container": "#fffbff",
                    "surface-container-low": "#f1f3ff",
                    "sam-navy": "#1B3A6B",
                    "on-surface": "#001a40",
                    "secondary-fixed-dim": "#ffb780",
                    "on-primary-container": "#fffbff",
                    "tertiary-fixed-dim": "#edc157",
                    "inverse-on-surface": "#edf0ff",
                    "on-tertiary-fixed": "#251a00",
                    "on-primary": "#ffffff",
                    "outline-variant": "#e4bebc",
                    "on-error": "#ffffff",
                    "error": "#ba1a1a",
                    "on-surface-variant": "#5b403f",
                    "surface-dim": "#cadaff",
                    "inverse-surface": "#0d2f60",
                    "sam-yellow": "#FFD166",
                    "on-error-container": "#93000a",
                    "sam-gray-dark": "#333333",
                    "surface-container": "#e8edff",
                    "primary-container": "#db313f",
                    "primary-fixed": "#ffdad8",
                    "on-secondary": "#ffffff",
                    "surface-container-high": "#e0e8ff",
                    "surface-container-lowest": "#ffffff",
                    "sam-gray-mid": "#777777",
                    "on-background": "#001a40",
                    "primary-fixed-dim": "#ffb3b1",
                    "surface-tint": "#bb152c",
                    "secondary": "#8e4e14",
                    "sam-red": "#E63946",
                    "error-container": "#ffdad6",
                    "on-primary-fixed": "#410007",
                    "inverse-primary": "#ffb3b1",
                    "surface-container-highest": "#d7e2ff",
                    "secondary-fixed": "#ffdcc4",
                    "secondary-container": "#ffab69",
                    "white": "#FFFFFF",
                    "on-secondary-fixed-variant": "#6f3800",
                    "sam-orange": "#F4A261",
                    "background": "#f9f9ff",
                    "tertiary-fixed": "#ffdf9b",
                    "surface-variant": "#d7e2ff",
                    "tertiary": "#755700",
                    "sam-cream": "#FFF8F0",
                    "on-secondary-fixed": "#2f1400",
                    "on-tertiary-fixed-variant": "#5b4300",
                    "surface-bright": "#f9f9ff",
                    "sam-gray-light": "#E5E5E5",
                    "sam-teal": "#06A77D",
                    "surface": "#f9f9ff",
                    "primary": "#b7102a",
                    "on-primary-fixed-variant": "#92001c",
                    "on-secondary-container": "#783d01",
                    "outline": "#8f6f6e"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "stack-lg": "32px",
                    "report-width": "880px",
                    "margin-desktop": "40px",
                    "gutter": "24px",
                    "margin-tablet": "32px",
                    "unit": "4px",
                    "stack-sm": "8px",
                    "container-max": "1440px",
                    "stack-md": "16px"
            },
            "fontFamily": {
                    "display-child": ["Plus Jakarta Sans"],
                    "math-numeral": ["Plus Jakarta Sans"],
                    "headline-adult": ["Inter"],
                    "caption": ["Inter"],
                    "body-regular": ["Inter"]
            },
            "fontSize": {
                    "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                    "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                    "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                    "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                    "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body {
            background-color: #FFF8F0; /* sam-cream foundation */
        }
    </style>
</head>
<body class="font-body-regular text-on-surface antialiased">
<!-- TopAppBar -->
<header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm docked full-width top-0 z-50 flex justify-between items-center w-full px-6 h-16 fixed">
<div class="flex items-center gap-4">
<span class="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans']">Atlas Assessment</span>
</div>
<div class="flex items-center gap-4">
<button class="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-full">
<span class="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<button class="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-full">
<span class="material-symbols-outlined" data-icon="help_outline">help_outline</span>
</button>
<div class="h-8 w-8 rounded-full bg-sam-gray-light overflow-hidden">
<img alt="Instructor Profile Avatar" class="h-full w-full object-cover" data-alt="professional headshot of a friendly female teacher in a brightly lit modern office setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIyFRvEYOwiu0gN5gmMMCV-BZyCbHXJG2nnZJZuGF5kGUJnidssuViirCo-IphG-uj3AZe8EOgkL6eZyDPrtfotk1pAfWnX60UkoIBwP53PoUbmuNgMOxhr04mZhGOBNV5JD3X5ibbA99O7RJ6f-ryx1l_5HhDTHYqtOmaXaYHnoZDvA1yecm6uQyt9aImE_AyQjyF_sPAABGAUxWIb9bScv60bgkHfkNPSboMlWCn1O58z89vAYMpThUsHo9SvkFTLOgvtmI6vY29"/>
</div>
</div>
</header>
<!-- SideNavBar -->
<nav class="bg-slate-50 dark:bg-slate-950 h-screen w-64 fixed left-0 top-0 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full pt-20 pb-6 z-40">
<div class="px-6 mb-8">
<h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-['Plus_Jakarta_Sans']">Instructor Portal</h2>
<p class="text-[14px] font-medium text-slate-500">Diagnostic Dashboard</p>
</div>
<div class="flex-grow space-y-1">
<a class="flex items-center px-6 py-3 bg-white dark:bg-slate-900 text-[#E63946] border-r-4 border-[#E63946] shadow-sm transition-all duration-200" href="#">
<span class="material-symbols-outlined mr-3" data-icon="group">group</span>
<span class="font-['Plus_Jakarta_Sans'] text-[14px] font-medium">Student Roster</span>
</a>
<a class="flex items-center px-6 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-200" href="#">
<span class="material-symbols-outlined mr-3" data-icon="analytics">analytics</span>
<span class="font-['Plus_Jakarta_Sans'] text-[14px] font-medium">Cohort Analytics</span>
</a>
<a class="flex items-center px-6 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-200" href="#">
<span class="material-symbols-outlined mr-3" data-icon="assessment">assessment</span>
<span class="font-['Plus_Jakarta_Sans'] text-[14px] font-medium">Diagnostic Reports</span>
</a>
<a class="flex items-center px-6 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-200" href="#">
<span class="material-symbols-outlined mr-3" data-icon="menu_book">menu_book</span>
<span class="font-['Plus_Jakarta_Sans'] text-[14px] font-medium">Resources</span>
</a>
</div>
<div class="mt-auto space-y-1">
<a class="flex items-center px-6 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-200" href="#">
<span class="material-symbols-outlined mr-3" data-icon="settings">settings</span>
<span class="font-['Plus_Jakarta_Sans'] text-[14px] font-medium">Settings</span>
</a>
<a class="flex items-center px-6 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-200" href="#">
<span class="material-symbols-outlined mr-3" data-icon="contact_support">contact_support</span>
<span class="font-['Plus_Jakarta_Sans'] text-[14px] font-medium">Support</span>
</a>
</div>
</nav>
<!-- Main Content Canvas -->
<main class="ml-64 pt-16 min-h-screen">
<div class="max-w-[880px] mx-auto py-10 px-gutter">
<!-- Breadcrumbs & Actions -->
<div class="flex justify-between items-center mb-8">
<div class="flex items-center text-sam-gray-mid">
<a class="hover:text-sam-navy transition-colors" href="#">Student Roster</a>
<span class="material-symbols-outlined text-[18px] mx-2" data-icon="chevron_right">chevron_right</span>
<span class="text-sam-navy font-semibold">Maya Thompson</span>
</div>
<div class="flex gap-stack-sm">
<button class="px-4 py-2 bg-white border border-sam-navy text-sam-navy rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all">
<span class="material-symbols-outlined text-[20px]" data-icon="download">download</span>
                        Download PDF
                    </button>
<button class="px-4 py-2 bg-sam-red text-white rounded-xl font-semibold flex items-center gap-2 hover:opacity-90 transition-all shadow-sm">
<span class="material-symbols-outlined text-[20px]" data-icon="share">share</span>
                        Share Report
                    </button>
</div>
</div>
<!-- Student Summary Header -->
<div class="bg-white rounded-[24px] p-8 mb-stack-lg shadow-[0px_4px_12px_rgba(27,58,107,0.08)] flex items-start gap-8">
<div class="h-24 w-24 rounded-[20px] bg-sam-cream overflow-hidden border-4 border-white shadow-inner">
<img alt="Student Profile Picture" class="w-full h-full object-cover" data-alt="close-up portrait of a smiling young student with curly hair, wearing a colorful yellow t-shirt against a simple soft blue background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCZ6bY87EEHC_OJAbZJ6-wVx7Dpk8_7fJYXZtxWCWhztiNYRwRlsfLQCT5lij86uyqKS7pCrsojmRDaHnt4bbJj2lVXmqDc5jl_oErfvXv83HBWq5aDQGEH4t2cgix3uPQh5nxbzqPq0NY7CKRltuEnNOhO966_b3HnMw3JHFAccYG7USTo51T5fmBXHCfmeX0drJay5murfX4oyA10tdqCVCHInurna2qc7rdCYpmz3gWFYRE8FYXAPqdK7TubfwZdLODJhiPy0l3"/>
</div>
<div class="flex-grow">
<div class="flex justify-between items-start">
<div>
<h1 class="font-headline-adult text-headline-adult text-sam-navy mb-1">Maya Thompson</h1>
<p class="text-sam-gray-mid flex items-center gap-2">
<span class="bg-surface-container px-3 py-1 rounded-full text-caption font-caption text-on-surface">Grade 3</span>
<span>•</span>
<span>ID: #SAM-2024-0082</span>
</p>
</div>
<div class="text-right">
<p class="text-caption font-caption text-sam-gray-mid uppercase tracking-wider mb-1">Overall Proficiency</p>
<span class="text-display-child font-display-child text-sam-teal">84%</span>
</div>
</div>
</div>
</div>
<!-- Bento Grid of Metrics -->
<div class="grid grid-cols-12 gap-6 mb-stack-lg">
<!-- Accuracy Card -->
<div class="col-span-4 bg-white rounded-[24px] p-6 shadow-[0px_4px_12px_rgba(27,58,107,0.08)]">
<div class="flex items-center gap-3 mb-4">
<span class="material-symbols-outlined text-sam-orange" data-icon="check_circle">check_circle</span>
<h3 class="font-headline-adult text-[18px] text-sam-navy">Accuracy</h3>
</div>
<div class="flex items-end gap-2">
<span class="text-math-numeral font-math-numeral">21/25</span>
<span class="text-caption font-caption text-sam-teal mb-2">+12% vs last</span>
</div>
</div>
<!-- Time Taken Card -->
<div class="col-span-4 bg-white rounded-[24px] p-6 shadow-[0px_4px_12px_rgba(27,58,107,0.08)]">
<div class="flex items-center gap-3 mb-4">
<span class="material-symbols-outlined text-sam-teal" data-icon="timer">timer</span>
<h3 class="font-headline-adult text-[18px] text-sam-navy">Pace</h3>
</div>
<div class="flex items-end gap-2">
<span class="text-math-numeral font-math-numeral">14m 20s</span>
<span class="text-caption font-caption text-sam-gray-mid mb-2">Steady flow</span>
</div>
</div>
<!-- Confidence Score -->
<div class="col-span-4 bg-white rounded-[24px] p-6 shadow-[0px_4px_12px_rgba(27,58,107,0.08)]">
<div class="flex items-center gap-3 mb-4">
<span class="material-symbols-outlined text-sam-red" data-icon="bolt">bolt</span>
<h3 class="font-headline-adult text-[18px] text-sam-navy">Confidence</h3>
</div>
<div class="flex items-end gap-2">
<span class="text-math-numeral font-math-numeral">High</span>
<span class="text-caption font-caption text-sam-gray-mid mb-2">Low hesitance</span>
</div>
</div>
</div>
<!-- Strand Performance Chart -->
<section class="bg-white rounded-[24px] p-8 mb-stack-lg shadow-[0px_4px_12px_rgba(27,58,107,0.08)]">
<h2 class="font-headline-adult text-headline-adult text-sam-navy mb-8">Performance by Strand</h2>
<div class="space-y-6">
<!-- Strand 1 -->
<div>
<div class="flex justify-between mb-2">
<span class="font-semibold text-sam-navy">Number Sense &amp; Operations</span>
<span class="font-bold text-sam-teal">92%</span>
</div>
<div class="w-full h-4 bg-sam-cream rounded-full overflow-hidden">
<div class="h-full bg-gradient-to-r from-sam-teal to-[#14c093] rounded-full" style="width: 92%"></div>
</div>
</div>
<!-- Strand 2 -->
<div>
<div class="flex justify-between mb-2">
<span class="font-semibold text-sam-navy">Algebraic Thinking</span>
<span class="font-bold text-sam-orange">75%</span>
</div>
<div class="w-full h-4 bg-sam-cream rounded-full overflow-hidden">
<div class="h-full bg-gradient-to-r from-sam-orange to-[#f18e3c] rounded-full" style="width: 75%"></div>
</div>
</div>
<!-- Strand 3 -->
<div>
<div class="flex justify-between mb-2">
<span class="font-semibold text-sam-navy">Geometry &amp; Space</span>
<span class="font-bold text-sam-red">64%</span>
</div>
<div class="w-full h-4 bg-sam-cream rounded-full overflow-hidden">
<div class="h-full bg-gradient-to-r from-sam-red to-[#d02c3a] rounded-full" style="width: 64%"></div>
</div>
</div>
</div>
</section>
<!-- Pedagogical Notes & Misconceptions -->
<section class="mb-stack-lg">
<div class="flex items-center gap-3 mb-6">
<span class="material-symbols-outlined text-sam-navy text-3xl" data-icon="psychology">psychology</span>
<h2 class="font-headline-adult text-headline-adult text-sam-navy">Diagnostic Pedagogical Notes</h2>
</div>
<div class="grid grid-cols-2 gap-6">
<!-- Misconception 1 -->
<div class="bg-white border-2 border-transparent hover:border-sam-orange transition-all rounded-[20px] p-6 shadow-[0px_4px_12px_rgba(27,58,107,0.08)]">
<div class="flex items-start gap-4 mb-4">
<div class="p-3 bg-secondary-fixed rounded-xl">
<span class="material-symbols-outlined text-on-secondary-container" data-icon="warning">warning</span>
</div>
<div>
<h4 class="font-bold text-sam-navy">Regrouping Error</h4>
<p class="text-caption font-caption text-sam-gray-mid">Subtraction with zeros</p>
</div>
</div>
<p class="text-body-regular text-sam-gray-dark mb-4">Maya consistently forgets to adjust the hundreds place when borrowing across a zero. She treats 0 as 10 without decrementing the adjacent digit.</p>
<div class="bg-sam-cream p-3 rounded-lg border border-dashed border-sam-orange">
<p class="text-caption font-bold text-sam-orange mb-1">Recommended Action:</p>
<p class="text-caption font-caption">Use base-10 blocks to visually demonstrate "trading" across multiple columns.</p>
</div>
</div>
<!-- Misconception 2 -->
<div class="bg-white border-2 border-transparent hover:border-sam-teal transition-all rounded-[20px] p-6 shadow-[0px_4px_12px_rgba(27,58,107,0.08)]">
<div class="flex items-start gap-4 mb-4">
<div class="p-3 bg-surface-container rounded-xl">
<span class="material-symbols-outlined text-sam-navy" data-icon="lightbulb">lightbulb</span>
</div>
<div>
<h4 class="font-bold text-sam-navy">Mental Fluency</h4>
<p class="text-caption font-caption text-sam-gray-mid">Additive strategies</p>
</div>
</div>
<p class="text-body-regular text-sam-gray-dark mb-4">Strong use of compensation strategies for single-digit addition. Maya identifies "near doubles" (7+8 as 7+7+1) with 95% accuracy and zero latency.</p>
<div class="bg-sam-cream p-3 rounded-lg border border-dashed border-sam-teal">
<p class="text-caption font-bold text-sam-teal mb-1">Next Milestone:</p>
<p class="text-caption font-caption">Introduce basic multiplication concepts through repeated addition and array modeling.</p>
</div>
</div>
</div>
</section>
<!-- Learning Journey Progress -->
<section class="bg-white rounded-[24px] p-8 shadow-[0px_4px_12px_rgba(27,58,107,0.08)]">
<div class="flex justify-between items-center mb-10">
<h2 class="font-headline-adult text-headline-adult text-sam-navy">Next Steps Journey</h2>
<span class="text-caption font-caption text-sam-gray-mid italic">Based on S.A.M. Methodology</span>
</div>
<div class="relative">
<!-- Connection Line -->
<div class="absolute top-1/2 left-0 w-full h-1 bg-sam-gray-light -translate-y-1/2"></div>
<div class="relative flex justify-between">
<!-- Step 1 -->
<div class="flex flex-col items-center">
<div class="w-12 h-12 bg-sam-teal text-white rounded-full flex items-center justify-center relative z-10 ring-8 ring-white shadow-md">
<span class="material-symbols-outlined" data-icon="check">check</span>
</div>
<span class="mt-4 font-bold text-sam-navy">Current Level</span>
<span class="text-caption font-caption text-sam-teal">Mastered</span>
</div>
<!-- Step 2 (Active) -->
<div class="flex flex-col items-center">
<div class="w-12 h-12 bg-sam-red text-white rounded-full flex items-center justify-center relative z-10 ring-8 ring-white shadow-lg animate-pulse">
<span class="material-symbols-outlined" data-icon="edit">edit</span>
</div>
<span class="mt-4 font-bold text-sam-navy">3-Digit Regrouping</span>
<span class="text-caption font-caption text-sam-red">Up Next</span>
</div>
<!-- Step 3 -->
<div class="flex flex-col items-center">
<div class="w-12 h-12 bg-white border-4 border-sam-gray-light text-sam-gray-mid rounded-full flex items-center justify-center relative z-10 ring-8 ring-white shadow-sm">
<span class="material-symbols-outlined" data-icon="lock">lock</span>
</div>
<span class="mt-4 font-bold text-sam-gray-mid">Intro to Arrays</span>
<span class="text-caption font-caption text-sam-gray-mid">Locked</span>
</div>
<!-- Step 4 -->
<div class="flex flex-col items-center">
<div class="w-12 h-12 bg-white border-4 border-sam-gray-light text-sam-gray-mid rounded-full flex items-center justify-center relative z-10 ring-8 ring-white shadow-sm">
<span class="material-symbols-outlined" data-icon="flag">flag</span>
</div>
<span class="mt-4 font-bold text-sam-gray-mid">Grade 3 Exit</span>
<span class="text-caption font-caption text-sam-gray-mid">Milestone</span>
</div>
</div>
</div>
<div class="mt-12 bg-sam-cream rounded-2xl p-6 flex gap-6 items-center">
<img alt="Sammy the Otter mascot" class="h-20 w-20 object-contain" data-alt="a cute cartoon otter character with large friendly eyes, wearing a red educational vest and holding a pencil, rendered in a soft 3D digital illustration style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDqk9tYA6YgAZbCES70J21TIE4262jpoaJn35zXxpmIXMOOGvPRyHdzBMdGCK0Ql26ch6jrxzEn_0FzI3RjP0tupw3TTk3EC3BRzjjDOJmkjb290lV2AW4GhYciQgfKGFIcBkuZjYXRU8FJfVBkkzHfi2bCW7wEbeE147xbrqY1EG-1G7J-NBzwZKzRJjkJ7GeBIs0KWKbhkh1fhs2E2NS-49_usRVm1tzR5IJcI_1wffb2G-cctSQT2hKZKX0nwQ7Q8BjKWBqG-mr"/>
<div>
<h4 class="font-bold text-sam-navy text-lg">Sammy's Suggestion</h4>
<p class="text-body-regular text-sam-gray-dark italic">"Maya is showing great spirit! Focusing on her place value logic this week will unlock so many new adventures in Grade 4 math!"</p>
</div>
</div>
</section>
</div>
</main>
</body></html>

<!-- Module D - 11: Instructor Cohort View (Desktop) -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:wght@500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "tertiary-container": "#936f03",
                        "on-tertiary": "#ffffff",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "sam-navy": "#1B3A6B",
                        "on-surface": "#001a40",
                        "secondary-fixed-dim": "#ffb780",
                        "on-primary-container": "#fffbff",
                        "tertiary-fixed-dim": "#edc157",
                        "inverse-on-surface": "#edf0ff",
                        "on-tertiary-fixed": "#251a00",
                        "on-primary": "#ffffff",
                        "outline-variant": "#e4bebc",
                        "on-error": "#ffffff",
                        "error": "#ba1a1a",
                        "on-surface-variant": "#5b403f",
                        "surface-dim": "#cadaff",
                        "inverse-surface": "#0d2f60",
                        "sam-yellow": "#FFD166",
                        "on-error-container": "#93000a",
                        "sam-gray-dark": "#333333",
                        "surface-container": "#e8edff",
                        "primary-container": "#db313f",
                        "primary-fixed": "#ffdad8",
                        "on-secondary": "#ffffff",
                        "surface-container-high": "#e0e8ff",
                        "surface-container-lowest": "#ffffff",
                        "sam-gray-mid": "#777777",
                        "on-background": "#001a40",
                        "primary-fixed-dim": "#ffb3b1",
                        "surface-tint": "#bb152c",
                        "secondary": "#8e4e14",
                        "sam-red": "#E63946",
                        "error-container": "#ffdad6",
                        "on-primary-fixed": "#410007",
                        "inverse-primary": "#ffb3b1",
                        "surface-container-highest": "#d7e2ff",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "white": "#FFFFFF",
                        "on-secondary-fixed-variant": "#6f3800",
                        "sam-orange": "#F4A261",
                        "background": "#f9f9ff",
                        "tertiary-fixed": "#ffdf9b",
                        "surface-variant": "#d7e2ff",
                        "tertiary": "#755700",
                        "sam-cream": "#FFF8F0",
                        "on-secondary-fixed": "#2f1400",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "surface-bright": "#f9f9ff",
                        "sam-gray-light": "#E5E5E5",
                        "sam-teal": "#06A77D",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-primary-fixed-variant": "#92001c",
                        "on-secondary-container": "#783d01",
                        "outline": "#8f6f6e"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "stack-lg": "32px",
                        "report-width": "880px",
                        "margin-desktop": "40px",
                        "gutter": "24px",
                        "margin-tablet": "32px",
                        "unit": "4px",
                        "stack-sm": "8px",
                        "container-max": "1440px",
                        "stack-md": "16px"
                    },
                    "fontFamily": {
                        "display-child": ["Plus Jakarta Sans"],
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "caption": ["Inter"],
                        "body-regular": ["Inter"]
                    },
                    "fontSize": {
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
                    }
                }
            }
        }
    </script>
<style>
        body { background-color: #FFF8F0; }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
    </style>
</head>
<body class="font-body-regular text-on-surface antialiased">
<!-- TopAppBar -->
<header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm fixed top-0 w-full z-50 h-16 flex justify-between items-center px-6 font-['Plus_Jakarta_Sans'] text-sm antialiased">
<div class="flex items-center gap-4">
<span class="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Atlas Assessment</span>
</div>
<div class="flex items-center gap-6">
<div class="relative hidden md:block">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
<input class="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-[#E63946] w-64" placeholder="Search cohorts..." type="text"/>
</div>
<div class="flex items-center gap-4 text-slate-600 dark:text-slate-400">
<button class="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors p-2 rounded-full">
<span class="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<button class="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors p-2 rounded-full">
<span class="material-symbols-outlined" data-icon="help_outline">help_outline</span>
</button>
<div class="w-8 h-8 rounded-full bg-sam-navy overflow-hidden">
<img alt="Instructor Profile Avatar" class="w-full h-full object-cover" data-alt="professional portrait of a friendly female instructor in a clean modern office setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuADjhYhI9B7kklL0nO9OSuBjD96yM0oZS7JjjS-l0XHMeTrQWIiLHzqx_qgUBsbQtWAcMLvhYo8vbhjesWA2RJ3PHzWGdY1xU0VTkZBCGxoRXAI4ZOn9FI5JdcFBlLgszfoWBpTOycjh3oKtAm9l51sQ8WFb87hmxS-laGnA33zrBYn0lVV79kKwTBEKw4gMFiHT7bYyBZObeZheIxbBN-HspraCjzzRIH24yLSnC8YyfaEcmf4DOtum9ZW8R00l7pzEAKiNuPHL8_2"/>
</div>
</div>
</div>
</header>
<!-- SideNavBar -->
<aside class="bg-slate-50 dark:bg-slate-950 h-screen w-64 fixed left-0 top-0 border-r border-slate-200 dark:border-slate-800 flex flex-col pt-20 pb-6 transition-all duration-200 ease-in-out">
<div class="px-6 mb-8">
<div class="flex items-center gap-3 mb-1">
<div class="w-8 h-8 bg-[#E63946] rounded-lg flex items-center justify-center">
<span class="material-symbols-outlined text-white text-lg" data-icon="school">school</span>
</div>
<h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Instructor Portal</h2>
</div>
<p class="text-xs text-slate-500 font-['Plus_Jakarta_Sans'] font-medium">Diagnostic Dashboard</p>
</div>
<nav class="flex-1 px-4 space-y-1">
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all font-['Plus_Jakarta_Sans'] text-[14px] font-medium" href="#">
<span class="material-symbols-outlined" data-icon="group">group</span>
<span>Student Roster</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 text-[#E63946] border-r-4 border-[#E63946] shadow-sm rounded-xl font-['Plus_Jakarta_Sans'] text-[14px] font-bold" href="#">
<span class="material-symbols-outlined" data-icon="analytics" style="font-variation-settings: 'FILL' 1;">analytics</span>
<span>Cohort Analytics</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all font-['Plus_Jakarta_Sans'] text-[14px] font-medium" href="#">
<span class="material-symbols-outlined" data-icon="assessment">assessment</span>
<span>Diagnostic Reports</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all font-['Plus_Jakarta_Sans'] text-[14px] font-medium" href="#">
<span class="material-symbols-outlined" data-icon="menu_book">menu_book</span>
<span>Resources</span>
</a>
</nav>
<div class="px-4 border-t border-slate-200 dark:border-slate-800 pt-4 space-y-1">
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 rounded-xl transition-all font-['Plus_Jakarta_Sans'] text-[14px] font-medium" href="#">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
<span>Settings</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 rounded-xl transition-all font-['Plus_Jakarta_Sans'] text-[14px] font-medium" href="#">
<span class="material-symbols-outlined" data-icon="contact_support">contact_support</span>
<span>Support</span>
</a>
</div>
</aside>
<!-- Main Content -->
<main class="ml-64 pt-20 p-8 min-h-screen">
<div class="max-w-[1200px] mx-auto">
<!-- Header Section -->
<div class="flex justify-between items-end mb-8">
<div>
<nav class="flex gap-2 text-sm text-sam-gray-mid mb-2 font-caption">
<span>Cohorts</span>
<span>/</span>
<span class="text-sam-navy">Grade 4 - Autumn Intensive</span>
</nav>
<h1 class="font-headline-adult text-headline-adult text-sam-navy">Cohort Analytics: Grade 4 Red</h1>
<p class="text-sam-gray-mid font-body-regular">24 Students • Last activity 2 hours ago</p>
</div>
<div class="flex gap-3">
<button class="bg-white border border-sam-navy text-sam-navy px-6 py-2 rounded-xl font-body-regular hover:bg-slate-50 transition-all flex items-center gap-2">
<span class="material-symbols-outlined text-sm" data-icon="download">download</span>
                        Export CSV
                    </button>
<button class="bg-sam-red text-white px-6 py-2 rounded-xl font-body-regular hover:opacity-90 transition-all flex items-center gap-2">
<span class="material-symbols-outlined text-sm" data-icon="add">add</span>
                        New Assessment
                    </button>
</div>
</div>
<!-- Bento Grid Analytics -->
<div class="grid grid-cols-12 gap-6 mb-8">
<!-- Hero Metric: Proficiency -->
<div class="col-span-12 lg:col-span-8 bg-white rounded-3xl p-8 shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-sam-gray-light flex flex-col md:flex-row gap-8">
<div class="flex-1">
<h3 class="text-sam-navy font-bold text-lg mb-6">Overall Cohort Proficiency</h3>
<div class="relative h-48 w-full">
<!-- Custom SVG Chart Simulation -->
<div class="absolute bottom-0 left-0 w-full h-full flex items-end justify-between px-2">
<div class="w-10 bg-sam-teal/20 rounded-t-lg h-[40%] flex flex-col justify-end items-center pb-2 relative group">
<div class="w-10 bg-sam-teal rounded-t-lg h-full"></div>
<span class="absolute -top-8 text-xs font-bold text-sam-teal opacity-0 group-hover:opacity-100">42%</span>
<span class="text-[10px] text-sam-gray-mid mt-2 absolute top-full">Mon</span>
</div>
<div class="w-10 bg-sam-teal/20 rounded-t-lg h-[55%] flex flex-col justify-end items-center pb-2 relative group">
<div class="w-10 bg-sam-teal rounded-t-lg h-full"></div>
<span class="absolute -top-8 text-xs font-bold text-sam-teal opacity-0 group-hover:opacity-100">55%</span>
<span class="text-[10px] text-sam-gray-mid mt-2 absolute top-full">Tue</span>
</div>
<div class="w-10 bg-sam-teal/20 rounded-t-lg h-[78%] flex flex-col justify-end items-center pb-2 relative group">
<div class="w-10 bg-sam-teal rounded-t-lg h-full"></div>
<span class="absolute -top-8 text-xs font-bold text-sam-teal opacity-0 group-hover:opacity-100">78%</span>
<span class="text-[10px] text-sam-gray-mid mt-2 absolute top-full">Wed</span>
</div>
<div class="w-10 bg-sam-teal/20 rounded-t-lg h-[62%] flex flex-col justify-end items-center pb-2 relative group">
<div class="w-10 bg-sam-teal rounded-t-lg h-full"></div>
<span class="absolute -top-8 text-xs font-bold text-sam-teal opacity-0 group-hover:opacity-100">62%</span>
<span class="text-[10px] text-sam-gray-mid mt-2 absolute top-full">Thu</span>
</div>
<div class="w-10 bg-sam-teal/20 rounded-t-lg h-[85%] flex flex-col justify-end items-center pb-2 relative group">
<div class="w-10 bg-sam-teal rounded-t-lg h-full"></div>
<span class="absolute -top-8 text-xs font-bold text-sam-teal opacity-0 group-hover:opacity-100">85%</span>
<span class="text-[10px] text-sam-gray-mid mt-2 absolute top-full">Fri</span>
</div>
</div>
</div>
</div>
<div class="w-full md:w-48 flex flex-col justify-center border-t md:border-t-0 md:border-l border-sam-gray-light pt-6 md:pt-0 md:pl-8">
<div class="mb-4">
<p class="text-sam-gray-mid text-xs uppercase tracking-wider font-bold">Avg Score</p>
<p class="text-4xl font-display-child text-sam-navy">74%</p>
<p class="text-sam-teal text-xs flex items-center gap-1 mt-1">
<span class="material-symbols-outlined text-sm" data-icon="trending_up">trending_up</span>
                                +12% from last wk
                            </p>
</div>
<div>
<p class="text-sam-gray-mid text-xs uppercase tracking-wider font-bold">Completion</p>
<p class="text-4xl font-display-child text-sam-navy">92%</p>
<p class="text-sam-gray-mid text-xs mt-1">22/24 students</p>
</div>
</div>
</div>
<!-- Mascot Insight Card -->
<div class="col-span-12 lg:col-span-4 bg-sam-navy rounded-3xl p-6 text-white relative overflow-hidden shadow-lg flex flex-col justify-between">
<div class="relative z-10">
<div class="flex items-center gap-2 mb-4 bg-white/10 w-fit px-3 py-1 rounded-full">
<span class="material-symbols-outlined text-sam-yellow text-sm" data-icon="lightbulb" style="font-variation-settings: 'FILL' 1;">lightbulb</span>
<span class="text-[10px] font-bold uppercase tracking-widest">Sammy's Insight</span>
</div>
<h4 class="text-lg font-bold mb-2">Multi-step word problems need attention!</h4>
<p class="text-sm text-slate-300">8 students are struggling with Grade 4 Module 3. Try focusing on visualization techniques this week.</p>
</div>
<div class="relative z-10 mt-6 flex justify-between items-end">
<button class="text-xs bg-white text-sam-navy px-4 py-2 rounded-lg font-bold hover:bg-sam-cream transition-colors">View Lesson Plan</button>
<div class="w-24 h-24 bg-white/5 rounded-full absolute -right-4 -bottom-4"></div>
</div>
<!-- Mascot Placeholder -->
<img alt="Sammy the Otter" class="absolute right-[-20px] bottom-[-20px] w-32 h-32 object-contain opacity-50 mix-blend-screen" data-alt="a friendly cartoon otter mascot wearing glasses and holding a pencil, bright and encouraging art style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAe321TAtCH60qkVbHSS7h4aolLgN73AF0Aj3Y1BXoovb0fDo3wpwYmo7S63YQG5DT--oTu5gJeVb42YJQKxDtokv6Mw-N16D2_VLbchLxnytnC79bjlnfXDZs7UP277muDSm-Za3pYj0xxE3ib3HOGQu4cnaaMP1GRi8k-BHO38xg4RhLIiQ-oCxDzKzV58UDd-plpIyNn8ty5ZQo5rZtSZgg5IdGiNf9Fzmsh1D98eRCY26JoWwfjieif6fM7c499FaotVZjm4vWq"/>
</div>
<!-- Learning Strands Grid -->
<div class="col-span-12 bg-white rounded-3xl p-8 shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-sam-gray-light">
<div class="flex justify-between items-center mb-8">
<h3 class="text-sam-navy font-bold text-lg">Strand Performance</h3>
<div class="flex gap-2">
<span class="flex items-center gap-2 text-xs text-sam-gray-mid"><span class="w-3 h-3 rounded-sm bg-sam-teal"></span> Proficient</span>
<span class="flex items-center gap-2 text-xs text-sam-gray-mid"><span class="w-3 h-3 rounded-sm bg-sam-orange"></span> Developing</span>
<span class="flex items-center gap-2 text-xs text-sam-gray-mid"><span class="w-3 h-3 rounded-sm bg-sam-red"></span> Critical</span>
</div>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
<!-- Strand 1 -->
<div>
<div class="flex justify-between text-sm mb-2">
<span class="font-bold text-sam-navy">Number Sense &amp; Operations</span>
<span class="text-sam-gray-mid">82% Mastery</span>
</div>
<div class="h-3 w-full bg-sam-gray-light rounded-full overflow-hidden flex">
<div class="h-full bg-sam-teal w-[82%]"></div>
</div>
</div>
<!-- Strand 2 -->
<div>
<div class="flex justify-between text-sm mb-2">
<span class="font-bold text-sam-navy">Fractions &amp; Decimals</span>
<span class="text-sam-gray-mid">45% Mastery</span>
</div>
<div class="h-3 w-full bg-sam-gray-light rounded-full overflow-hidden flex">
<div class="h-full bg-sam-red w-[45%]"></div>
</div>
</div>
<!-- Strand 3 -->
<div>
<div class="flex justify-between text-sm mb-2">
<span class="font-bold text-sam-navy">Geometry &amp; Space</span>
<span class="text-sam-gray-mid">68% Mastery</span>
</div>
<div class="h-3 w-full bg-sam-gray-light rounded-full overflow-hidden flex">
<div class="h-full bg-sam-orange w-[68%]"></div>
</div>
</div>
<!-- Strand 4 -->
<div>
<div class="flex justify-between text-sm mb-2">
<span class="font-bold text-sam-navy">Word Problem Logic</span>
<span class="text-sam-gray-mid">51% Mastery</span>
</div>
<div class="h-3 w-full bg-sam-gray-light rounded-full overflow-hidden flex">
<div class="h-full bg-sam-orange w-[51%]"></div>
</div>
</div>
</div>
</div>
<!-- Student Leaderboard/At Risk -->
<div class="col-span-12 lg:col-span-7 bg-white rounded-3xl p-8 shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-sam-gray-light">
<div class="flex justify-between items-center mb-6">
<h3 class="text-sam-navy font-bold text-lg">Student Progress Overview</h3>
<button class="text-sam-red text-sm font-bold flex items-center gap-1">
                            View All <span class="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span>
</button>
</div>
<div class="space-y-4">
<!-- Student Row -->
<div class="flex items-center gap-4 p-3 rounded-2xl hover:bg-sam-cream transition-all border border-transparent hover:border-sam-gray-light">
<div class="w-10 h-10 rounded-full bg-sam-orange/20 flex items-center justify-center font-bold text-sam-orange">AB</div>
<div class="flex-1">
<p class="text-sm font-bold text-sam-navy">Aiden Bennett</p>
<p class="text-xs text-sam-gray-mid">4 Assessments Completed</p>
</div>
<div class="text-right">
<p class="text-sm font-bold text-sam-teal">94%</p>
<span class="px-2 py-0.5 bg-sam-teal/10 text-sam-teal text-[10px] font-bold rounded-full uppercase">Master</span>
</div>
</div>
<!-- Student Row -->
<div class="flex items-center gap-4 p-3 rounded-2xl hover:bg-sam-cream transition-all border border-transparent hover:border-sam-gray-light">
<div class="w-10 h-10 rounded-full bg-sam-navy/10 flex items-center justify-center font-bold text-sam-navy">CM</div>
<div class="flex-1">
<p class="text-sm font-bold text-sam-navy">Chloe Martinez</p>
<p class="text-xs text-sam-gray-mid">3 Assessments Completed</p>
</div>
<div class="text-right">
<p class="text-sm font-bold text-sam-orange">62%</p>
<span class="px-2 py-0.5 bg-sam-orange/10 text-sam-orange text-[10px] font-bold rounded-full uppercase">Rising</span>
</div>
</div>
<!-- Student Row -->
<div class="flex items-center gap-4 p-3 rounded-2xl hover:bg-sam-cream transition-all border border-transparent hover:border-sam-gray-light">
<div class="w-10 h-10 rounded-full bg-sam-red/10 flex items-center justify-center font-bold text-sam-red">JH</div>
<div class="flex-1">
<p class="text-sm font-bold text-sam-navy">James Harrison</p>
<p class="text-xs text-sam-gray-mid">2 Assessments Completed</p>
</div>
<div class="text-right">
<p class="text-sm font-bold text-sam-red">38%</p>
<span class="px-2 py-0.5 bg-sam-red/10 text-sam-red text-[10px] font-bold rounded-full uppercase">Support</span>
</div>
</div>
</div>
</div>
<!-- Recent Activity/Misconceptions -->
<div class="col-span-12 lg:col-span-5 bg-white rounded-3xl p-8 shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-sam-gray-light">
<h3 class="text-sam-navy font-bold text-lg mb-6">Common Misconceptions</h3>
<div class="space-y-4">
<div class="bg-sam-cream p-4 rounded-2xl border border-sam-orange/20">
<div class="flex items-start gap-3">
<div class="p-2 bg-sam-orange rounded-xl">
<span class="material-symbols-outlined text-white text-sm" data-icon="warning">warning</span>
</div>
<div>
<h5 class="text-sm font-bold text-sam-navy">Fraction Denominators</h5>
<p class="text-xs text-sam-gray-mid mt-1">Students are adding denominators instead of finding commonality. 42% of cohort affected.</p>
</div>
</div>
</div>
<div class="bg-sam-cream p-4 rounded-2xl border border-sam-navy/10">
<div class="flex items-start gap-3">
<div class="p-2 bg-sam-navy rounded-xl">
<span class="material-symbols-outlined text-white text-sm" data-icon="history_edu">history_edu</span>
</div>
<div>
<h5 class="text-sm font-bold text-sam-navy">Regrouping Errors</h5>
<p class="text-xs text-sam-gray-mid mt-1">Difficulty maintaining place value in 3-digit subtraction. 18% of cohort affected.</p>
</div>
</div>
</div>
<div class="mt-4 pt-4 border-t border-sam-gray-light">
<button class="w-full py-3 border-2 border-dashed border-sam-navy/20 rounded-xl text-sam-navy text-sm font-bold hover:bg-sam-navy/5 transition-all">
                                Generate Intervention Group
                            </button>
</div>
</div>
</div>
</div>
</div>
</main>
<!-- FAB -->
<button class="fixed bottom-8 right-8 w-16 h-16 bg-sam-red text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40">
<span class="material-symbols-outlined text-3xl" data-icon="rocket_launch" style="font-variation-settings: 'FILL' 1;">rocket_launch</span>
</button>
</body></html>

<!-- Module D - 12: Instructor Cohort View (Mobile) -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:wght@500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "tertiary-container": "#936f03",
                        "on-tertiary": "#ffffff",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "sam-navy": "#1B3A6B",
                        "on-surface": "#001a40",
                        "secondary-fixed-dim": "#ffb780",
                        "on-primary-container": "#fffbff",
                        "tertiary-fixed-dim": "#edc157",
                        "inverse-on-surface": "#edf0ff",
                        "on-tertiary-fixed": "#251a00",
                        "on-primary": "#ffffff",
                        "outline-variant": "#e4bebc",
                        "on-error": "#ffffff",
                        "error": "#ba1a1a",
                        "on-surface-variant": "#5b403f",
                        "surface-dim": "#cadaff",
                        "inverse-surface": "#0d2f60",
                        "sam-yellow": "#FFD166",
                        "on-error-container": "#93000a",
                        "sam-gray-dark": "#333333",
                        "surface-container": "#e8edff",
                        "primary-container": "#db313f",
                        "primary-fixed": "#ffdad8",
                        "on-secondary": "#ffffff",
                        "surface-container-high": "#e0e8ff",
                        "surface-container-lowest": "#ffffff",
                        "sam-gray-mid": "#777777",
                        "on-background": "#001a40",
                        "primary-fixed-dim": "#ffb3b1",
                        "surface-tint": "#bb152c",
                        "secondary": "#8e4e14",
                        "sam-red": "#E63946",
                        "error-container": "#ffdad6",
                        "on-primary-fixed": "#410007",
                        "inverse-primary": "#ffb3b1",
                        "surface-container-highest": "#d7e2ff",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "white": "#FFFFFF",
                        "on-secondary-fixed-variant": "#6f3800",
                        "sam-orange": "#F4A261",
                        "background": "#f9f9ff",
                        "tertiary-fixed": "#ffdf9b",
                        "surface-variant": "#d7e2ff",
                        "tertiary": "#755700",
                        "sam-cream": "#FFF8F0",
                        "on-secondary-fixed": "#2f1400",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "surface-bright": "#f9f9ff",
                        "sam-gray-light": "#E5E5E5",
                        "sam-teal": "#06A77D",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-primary-fixed-variant": "#92001c",
                        "on-secondary-container": "#783d01",
                        "outline": "#8f6f6e"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "stack-lg": "32px",
                        "report-width": "880px",
                        "margin-desktop": "40px",
                        "gutter": "24px",
                        "margin-tablet": "32px",
                        "unit": "4px",
                        "stack-sm": "8px",
                        "container-max": "1440px",
                        "stack-md": "16px"
                    },
                    "fontFamily": {
                        "display-child": ["Plus Jakarta Sans"],
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "caption": ["Inter"],
                        "body-regular": ["Inter"]
                    },
                    "fontSize": {
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
                    }
                }
            }
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body {
            background-color: #FFF8F0; /* sam-cream foundation */
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="flex flex-col min-h-screen text-on-surface">
<!-- TopAppBar -->
<header class="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-sm flex justify-between items-center w-full px-6 py-4">
<div class="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">Atlas Assessment</div>
<div class="flex items-center gap-4">
<span class="material-symbols-outlined text-slate-600 cursor-pointer" data-icon="notifications">notifications</span>
<div class="w-8 h-8 rounded-full bg-sam-navy overflow-hidden">
<img alt="Instructor Profile" class="w-full h-full object-cover" data-alt="close-up portrait of a professional male instructor with a warm smile in a modern educational office setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuABkUWesZ97ApNz3c3NVGNUuW2MYx-FJS3ffFdGAqRzjlNqMbuDuNcUXW8eBu53bIBluW76lYKofDohG2HMwUa0V1BfUzRXYtn_sw4prhPwSyTXn8hE2bjA27szgxCpxdhp01UWbdGCLZwuYFi6pS5oCTJCTtdmffd53cKjotnAEABT5K4_pKwHeO0kU4mrvKGK43doll-zWGO1xZZfGsbqo87rHNuTgZZe77DW8F_I7q5fVNKZwHJNbs4uSr8XgQ3n_qEutcVwcmID"/>
</div>
</div>
</header>
<main class="flex-grow p-4 md:p-8 max-w-report-width mx-auto w-full">
<!-- Dashboard Header & Selector -->
<div class="mb-6 flex flex-col gap-2">
<h1 class="font-headline-adult text-headline-adult text-sam-navy">Cohort Overview</h1>
<div class="flex items-center gap-2 text-sam-gray-mid">
<span class="font-caption text-caption">Grade 4 • Advanced Mathematics</span>
<span class="material-symbols-outlined text-sm" data-icon="expand_more">expand_more</span>
</div>
</div>
<!-- Metric Grid (Bento Style) -->
<div class="grid grid-cols-2 gap-4 mb-8">
<div class="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(27,58,107,0.08)] flex flex-col gap-1 border border-transparent">
<span class="text-sam-gray-mid font-caption text-caption">Completion</span>
<div class="flex items-baseline gap-1">
<span class="text-2xl font-bold text-sam-navy">84%</span>
<span class="text-sam-teal font-bold text-xs">+12%</span>
</div>
<div class="w-full bg-slate-100 h-1.5 rounded-full mt-2">
<div class="bg-sam-teal h-full rounded-full w-[84%]"></div>
</div>
</div>
<div class="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(27,58,107,0.08)] flex flex-col gap-1">
<span class="text-sam-gray-mid font-caption text-caption">Avg. Score</span>
<div class="flex items-baseline gap-1">
<span class="text-2xl font-bold text-sam-navy">72</span>
<span class="text-sam-gray-mid font-caption text-xs">/100</span>
</div>
<span class="text-sam-orange text-xs font-medium">Needs Attention</span>
</div>
</div>
<!-- Strand Mastery Bars -->
<section class="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(27,58,107,0.08)] mb-8">
<h2 class="font-headline-adult text-lg text-sam-navy mb-4">Strand Performance</h2>
<div class="space-y-4">
<div>
<div class="flex justify-between mb-1">
<span class="font-caption text-caption text-sam-gray-dark">Number Sense</span>
<span class="font-caption text-caption font-bold text-sam-navy">92%</span>
</div>
<div class="w-full bg-slate-100 h-3 rounded-full">
<div class="bg-gradient-to-r from-sam-teal to-emerald-400 h-full rounded-full w-[92%]"></div>
</div>
</div>
<div>
<div class="flex justify-between mb-1">
<span class="font-caption text-caption text-sam-gray-dark">Geometry &amp; Space</span>
<span class="font-caption text-caption font-bold text-sam-navy">64%</span>
</div>
<div class="w-full bg-slate-100 h-3 rounded-full">
<div class="bg-gradient-to-r from-sam-orange to-amber-400 h-full rounded-full w-[64%]"></div>
</div>
</div>
<div>
<div class="flex justify-between mb-1">
<span class="font-caption text-caption text-sam-gray-dark">Logic &amp; Patterns</span>
<span class="font-caption text-caption font-bold text-sam-navy">48%</span>
</div>
<div class="w-full bg-slate-100 h-3 rounded-full">
<div class="bg-gradient-to-r from-sam-red to-rose-400 h-full rounded-full w-[48%]"></div>
</div>
</div>
</div>
</section>
<!-- Student Quick List -->
<section class="mb-20">
<div class="flex justify-between items-center mb-4">
<h2 class="font-headline-adult text-lg text-sam-navy">Recent Activity</h2>
<button class="text-sam-red font-caption text-caption font-bold">View All</button>
</div>
<div class="space-y-3">
<!-- Student Card -->
<div class="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 border-l-4 border-sam-teal">
<div class="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
<img alt="Student" class="w-full h-full object-cover" data-alt="close-up of a smiling young boy wearing a school uniform, high quality photography with soft natural lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsx56fUIgfCCl55jJd9otpJ7qnWa3NP4G6krIA1m_CALl7weZwhJM7lamu6CpC2j4rX-gEGRYE8R3DBM_LPCAfZmJIlctccsyPvZGV_i8vSa22Bn4VHFO1T-_lveP4Sz7qR3Lf2cfDPPjsFy8uJ69-U4QwPN5KGjqObO6H4VkwLLQlp4KE67-2CUQlyfXP_vjQmX_P0jC35XTloGRvqUhXLmGA-HvrEVRVZMhdNR_Drrd9RWzvg0wD9dYgZC8kt4fQR7C1fDdWWNYS"/>
</div>
<div class="flex-grow">
<h3 class="font-body-regular font-bold text-sam-navy">Leo Chen</h3>
<p class="font-caption text-xs text-sam-gray-mid">Completed 'Fraction Basics'</p>
</div>
<div class="text-right">
<span class="block text-sam-teal font-bold text-lg">98</span>
<span class="text-[10px] text-sam-gray-mid uppercase tracking-wider">A+</span>
</div>
</div>
<!-- Student Card -->
<div class="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 border-l-4 border-sam-orange">
<div class="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
<img alt="Student" class="w-full h-full object-cover" data-alt="close-up of a young girl with a thoughtful expression, wearing a school uniform, high quality photography with warm bright lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDTtxhqo9mc9tmunzneJD_aeLlZk_xUwEOJ49F-lnExV5Pvfq6RrTgFwipndD4iHctNg9adA6zsyXRc1vwQkIJ16lT2sXFCgYlHiVIGRWbLqM9iuXUBFOsgNyVMK1kLRuUs_7rJicsk3r7D29D9NOupAV7q4bMfOi9RtkDdJrwijXF89ksyvAA5-PKyR57eCVy3UivAWlKw2YHum7xoxAGkuTFltWULODxtcnEfWcFwV_3ecz6J3mp3ifgnbYwI63vBdmofrwbJC1u"/>
</div>
<div class="flex-grow">
<h3 class="font-body-regular font-bold text-sam-navy">Maya Patel</h3>
<p class="font-caption text-xs text-sam-gray-mid">In Progress: Spatial Logic</p>
</div>
<div class="text-right">
<span class="block text-sam-orange font-bold text-lg">72</span>
<span class="text-[10px] text-sam-gray-mid uppercase tracking-wider">B-</span>
</div>
</div>
<!-- Student Card -->
<div class="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 border-l-4 border-sam-red">
<div class="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
<img alt="Student" class="w-full h-full object-cover" data-alt="close-up of a young boy smiling broadly, wearing a casual school shirt, high quality photography with vibrant classroom background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_eRyh8Y8Dh7hiq4Uqa7L_dfVU0QZUDdCHVFiEeD8EswLVwEGDoNz26Of4yR7hWd1uMqG3yw61sEPAwtIuykHV_58gaxaxdpNiToZ5gtW0nQeZa47plVouYm8NsDTeT6p1MXDSUn6aWoYXDaDGlT_yA-NhPUJm26VqMMR6PHgtQIxYtdK0zV4kjb6mivPyARapk5_cPzjDvy1WW7HUam_ZuGD0e5cSz-SPS7_e1Gn8ZloGLmXTSJ7jKd4Rry4ZPDXHMz8LoZLqUR99"/>
</div>
<div class="flex-grow">
<h3 class="font-body-regular font-bold text-sam-navy">James Wilson</h3>
<p class="font-caption text-xs text-sam-gray-mid">Flagged: Calculation Error</p>
</div>
<div class="text-right">
<span class="block text-sam-red font-bold text-lg">45</span>
<span class="text-[10px] text-sam-gray-mid uppercase tracking-wider">FAIL</span>
</div>
</div>
</div>
</section>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(27,58,107,0.08)]">
<div class="flex flex-col items-center justify-center text-slate-500 active:scale-95 transition-transform hover:bg-slate-50">
<span class="material-symbols-outlined" data-icon="home">home</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Home</span>
</div>
<div class="flex flex-col items-center justify-center text-red-600 bg-red-50 rounded-xl px-3 py-1 active:scale-95 transition-transform">
<span class="material-symbols-outlined" data-icon="edit_document">edit_document</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Assess</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-500 active:scale-95 transition-transform hover:bg-slate-50">
<span class="material-symbols-outlined" data-icon="bar_chart">bar_chart</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Insights</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-500 active:scale-95 transition-transform hover:bg-slate-50">
<span class="material-symbols-outlined" data-icon="person">person</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Profile</span>
</div>
</nav>
<!-- Footer (Standard adult shell, but mobile version) -->
<footer class="bg-stone-50 border-t border-slate-200 mt-auto pb-24">
<div class="max-w-7xl mx-auto flex flex-col justify-center items-center py-8 px-6 text-center">
<div class="font-bold text-slate-800 mb-4 font-['Plus_Jakarta_Sans']">S.A.M Atlas</div>
<div class="flex flex-wrap justify-center gap-4 mb-4">
<a class="text-slate-500 font-['Plus_Jakarta_Sans'] text-sm hover:text-slate-800 transition-all hover:underline decoration-red-600 underline-offset-4" href="#">Terms</a>
<a class="text-slate-500 font-['Plus_Jakarta_Sans'] text-sm hover:text-slate-800 transition-all hover:underline decoration-red-600 underline-offset-4" href="#">Privacy</a>
<a class="text-slate-500 font-['Plus_Jakarta_Sans'] text-sm hover:text-slate-800 transition-all hover:underline decoration-red-600 underline-offset-4" href="#">Help</a>
</div>
<p class="font-['Plus_Jakarta_Sans'] text-sm text-slate-500">© 2024 S.A.M Atlas Assessment. All rights reserved.</p>
</div>
</footer>
</body></html>
