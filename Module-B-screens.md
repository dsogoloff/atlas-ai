<!-- Module B - 2: K-4 Practice Question -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600&amp;family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "sam-yellow": "#FFD166",
                        "surface-bright": "#f9f9ff",
                        "surface-container-highest": "#d7e2ff",
                        "surface-container-high": "#e0e8ff",
                        "tertiary-container": "#936f03",
                        "sam-red": "#E63946",
                        "on-primary-container": "#fffbff",
                        "on-surface": "#001a40",
                        "tertiary-fixed": "#ffdf9b",
                        "tertiary": "#755700",
                        "secondary-fixed-dim": "#ffb780",
                        "on-tertiary-fixed": "#251a00",
                        "surface-tint": "#bb152c",
                        "sam-gray-light": "#E5E5E5",
                        "on-secondary": "#ffffff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-tertiary": "#ffffff",
                        "inverse-on-surface": "#edf0ff",
                        "sam-teal": "#06A77D",
                        "on-primary": "#ffffff",
                        "error-container": "#ffdad6",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-secondary-container": "#783d01",
                        "background": "#f9f9ff",
                        "error": "#ba1a1a",
                        "sam-cream": "#FFF8F0",
                        "white": "#FFFFFF",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-primary-fixed-variant": "#92001c",
                        "sam-gray-mid": "#777777",
                        "inverse-primary": "#ffb3b1",
                        "on-error-container": "#93000a",
                        "on-background": "#001a40",
                        "primary-container": "#db313f",
                        "on-secondary-fixed-variant": "#6f3800",
                        "surface-dim": "#cadaff",
                        "secondary": "#8e4e14",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "primary-fixed-dim": "#ffb3b1",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "sam-navy": "#1B3A6B",
                        "on-secondary-fixed": "#2f1400",
                        "surface-container-low": "#f1f3ff",
                        "on-surface-variant": "#5b403f",
                        "surface-container": "#e8edff",
                        "sam-orange": "#F4A261",
                        "on-error": "#ffffff",
                        "on-primary-fixed": "#410007",
                        "primary-fixed": "#ffdad8",
                        "on-tertiary-container": "#fffbff",
                        "sam-gray-dark": "#333333",
                        "outline-variant": "#e4bebc",
                        "inverse-surface": "#0d2f60",
                        "surface-variant": "#d7e2ff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "caption": ["Inter"],
                        "headline-adult": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "body-regular": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
                    }
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            display: inline-block;
            line-height: 1;
            text-transform: none;
            letter-spacing: normal;
            word-wrap: normal;
            white-space: nowrap;
            direction: ltr;
        }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .assessment-canvas {
            min-height: calc(100vh - 140px);
        }
        .answer-tile {
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .answer-tile:active {
            transform: scale(0.92);
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream font-body-regular text-on-background selection:bg-sam-red/20 overflow-x-hidden">
<!-- TopAppBar -->
<header class="bg-[#fdfcf8] dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none docked full-width top-0 sticky z-50">
<div class="flex items-center justify-between px-6 py-4 w-full">
<div class="flex items-center gap-4">
<button class="text-[#E63946] dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors rounded-full p-2 flex items-center justify-center">
<span class="material-symbols-outlined" data-icon="arrow_back">arrow_back</span>
</button>
<h1 class="text-2xl font-black text-[#1b3a6b] dark:text-white tracking-tight font-['Plus_Jakarta_Sans']">S.A.M.</h1>
</div>
<!-- Progress Journey Map (Custom Component) -->
<div class="hidden md:flex items-center gap-3">
<div class="flex items-center">
<div class="w-4 h-4 rounded-full bg-sam-teal shadow-sm"></div>
<div class="w-12 h-1.5 bg-sam-teal"></div>
<div class="w-8 h-8 rounded-full bg-sam-red border-4 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">2</div>
<div class="w-12 h-1.5 bg-sam-gray-light"></div>
<div class="w-4 h-4 rounded-full bg-sam-gray-light"></div>
</div>
<span class="font-math-numeral text-caption text-sam-gray-mid">2 / 10</span>
</div>
<div class="flex items-center gap-2">
<div class="bg-sam-yellow/20 px-3 py-1 rounded-full flex items-center gap-2">
<span class="material-symbols-outlined text-sam-yellow" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="font-bold text-sam-navy">120</span>
</div>
</div>
</div>
</header>
<main class="assessment-canvas flex flex-col items-center justify-center px-4 py-8 max-w-6xl mx-auto">
<!-- Question Section -->
<div class="w-full flex flex-col lg:flex-row items-center justify-center gap-12 mb-12">
<!-- Mascot Sidebar -->
<div class="flex flex-col items-center gap-4 order-2 lg:order-1">
<div class="relative">
<!-- Speech Bubble -->
<div class="absolute -top-16 -right-12 bg-white p-4 rounded-2xl shadow-lg border-2 border-sam-gray-light max-w-[200px] after:content-[''] after:absolute after:bottom-[-12px] after:left-10 after:border-l-[12px] after:border-l-transparent after:border-r-[12px] after:border-r-transparent after:border-t-[12px] after:border-t-white">
<p class="text-sam-navy font-bold text-center leading-tight">Count them carefully!</p>
</div>
<!-- Mascot Image -->
<img alt="Dachshund mascot in a thinking pose" class="w-48 h-48 object-contain" data-alt="adorable cartoon dachshund mascot wearing small glasses, sitting in a thinking pose with one paw on chin, playful educational style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBREivXHAnLO3NbuwNSMi0DHeTvZO4s3rkqi9yHjF9y2MO_GdtPTV7cTIocbn4IHanXc1yhDfRCeP7oaZttYkBeyg81kmT_EzbKugZqp8kDCMqEjVyrRgi_7dwveKgNmKVlcrX6EoKF5CfSh-9kvsJXG6qFQRyZ-CA5spO2-XqO5GgIxbjYhgePVhQtnkP6UzPZ6yj26c7UYatB_so8AuAglcMvA9Aq-A4Sdg2KVS1_nK3UdUob551OIVPdTq2wJEsENTuRb8uLhDPV"/>
</div>
</div>
<!-- Main Content Area -->
<div class="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left order-1 lg:order-2">
<h2 class="font-display-child text-display-child text-sam-navy mb-10">How many apples do you see?</h2>
<!-- Visual Aid -->
<div class="bg-white p-10 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 border-sam-gray-light flex flex-wrap justify-center gap-8 w-full max-w-md">
<div class="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
<span class="material-symbols-outlined text-6xl text-sam-red" style="font-variation-settings: 'FILL' 1;">nutrition</span>
</div>
<div class="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
<span class="material-symbols-outlined text-6xl text-sam-red" style="font-variation-settings: 'FILL' 1;">nutrition</span>
</div>
<div class="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
<span class="material-symbols-outlined text-6xl text-sam-red" style="font-variation-settings: 'FILL' 1;">nutrition</span>
</div>
</div>
</div>
</div>
<!-- Answer Grid -->
<div class="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
<!-- Answer Tile 2 -->
<button class="answer-tile group bg-white border-4 border-sam-gray-light hover:border-sam-orange rounded-[24px] py-8 flex flex-col items-center justify-center shadow-sm">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-orange transition-colors">2</span>
</button>
<!-- Answer Tile 3 (Target Selection State) -->
<button class="answer-tile group bg-white border-4 border-sam-red ring-4 ring-sam-red/10 rounded-[24px] py-8 flex flex-col items-center justify-center shadow-md scale-[1.02]">
<span class="font-math-numeral text-math-numeral text-sam-red">3</span>
<div class="absolute -top-3 -right-3 bg-sam-red text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
<span class="material-symbols-outlined text-lg font-bold">check</span>
</div>
</button>
<!-- Answer Tile 4 -->
<button class="answer-tile group bg-white border-4 border-sam-gray-light hover:border-sam-orange rounded-[24px] py-8 flex flex-col items-center justify-center shadow-sm">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-orange transition-colors">4</span>
</button>
<!-- Answer Tile 5 -->
<button class="answer-tile group bg-white border-4 border-sam-gray-light hover:border-sam-orange rounded-[24px] py-8 flex flex-col items-center justify-center shadow-sm">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-orange transition-colors">5</span>
</button>
</div>
</main>
<!-- Footer Controls -->
<div class="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 px-6 py-6 flex items-center justify-between z-40">
<button class="text-sam-navy font-bold flex items-center gap-2 hover:bg-sam-gray-light/30 px-4 py-2 rounded-xl transition-all">
<span class="material-symbols-outlined">help</span>
<span class="hidden sm:inline">I need help</span>
</button>
<button class="bg-sam-red text-white font-bold text-lg px-12 py-4 rounded-2xl shadow-[0_4px_0_#b7102a] active:shadow-none active:translate-y-[4px] transition-all flex items-center gap-2">
            CHECK ANSWER
            <span class="material-symbols-outlined">arrow_forward</span>
</button>
<div class="w-24 hidden sm:block"></div> <!-- Spacer for balance -->
</div>
<!-- BottomNavBar (Suppressed for focused assessment task as per mandate) -->
<!-- The BottomNavBar is hidden here because this is a 'Task-Focused' screen -->
</body></html>

<!-- Module B - 1: K-4 Welcome -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Welcome to S.A.M. Atlas</title>
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
                        "sam-yellow": "#FFD166",
                        "surface-bright": "#f9f9ff",
                        "surface-container-highest": "#d7e2ff",
                        "surface-container-high": "#e0e8ff",
                        "tertiary-container": "#936f03",
                        "sam-red": "#E63946",
                        "on-primary-container": "#fffbff",
                        "on-surface": "#001a40",
                        "tertiary-fixed": "#ffdf9b",
                        "tertiary": "#755700",
                        "secondary-fixed-dim": "#ffb780",
                        "on-tertiary-fixed": "#251a00",
                        "surface-tint": "#bb152c",
                        "sam-gray-light": "#E5E5E5",
                        "on-secondary": "#ffffff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-tertiary": "#ffffff",
                        "inverse-on-surface": "#edf0ff",
                        "sam-teal": "#06A77D",
                        "on-primary": "#ffffff",
                        "error-container": "#ffdad6",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-secondary-container": "#783d01",
                        "background": "#f9f9ff",
                        "error": "#ba1a1a",
                        "sam-cream": "#FFF8F0",
                        "white": "#FFFFFF",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-primary-fixed-variant": "#92001c",
                        "sam-gray-mid": "#777777",
                        "inverse-primary": "#ffb3b1",
                        "on-error-container": "#93000a",
                        "on-background": "#001a40",
                        "primary-container": "#db313f",
                        "on-secondary-fixed-variant": "#6f3800",
                        "surface-dim": "#cadaff",
                        "secondary": "#8e4e14",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "primary-fixed-dim": "#ffb3b1",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "sam-navy": "#1B3A6B",
                        "on-secondary-fixed": "#2f1400",
                        "surface-container-low": "#f1f3ff",
                        "on-surface-variant": "#5b403f",
                        "surface-container": "#e8edff",
                        "sam-orange": "#F4A261",
                        "on-error": "#ffffff",
                        "on-primary-fixed": "#410007",
                        "primary-fixed": "#ffdad8",
                        "on-tertiary-container": "#fffbff",
                        "sam-gray-dark": "#333333",
                        "outline-variant": "#e4bebc",
                        "inverse-surface": "#0d2f60",
                        "surface-variant": "#d7e2ff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "margin-desktop": "40px",
                        "unit": "4px",
                        "container-max": "1440px",
                        "margin-tablet": "32px",
                        "stack-sm": "8px",
                        "gutter": "24px",
                        "report-width": "880px",
                        "stack-lg": "32px",
                        "stack-md": "16px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "caption": ["Inter"],
                        "headline-adult": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "body-regular": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
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
        .speech-bubble::after {
            content: '';
            position: absolute;
            bottom: -20px;
            left: 10%;
            border-width: 20px 20px 0 0;
            border-style: solid;
            border-color: #FFFFFF transparent transparent transparent;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen flex flex-col font-body-regular text-on-surface">
<!-- Top Navigation (Shell Implementation) -->
<header class="bg-[#fdfcf8] dark:bg-slate-950 shadow-sm dark:shadow-none border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-6 py-4 w-full top-0">
<div class="flex items-center gap-4">
<span class="material-symbols-outlined text-slate-400 cursor-pointer" data-icon="arrow_back">arrow_back</span>
<span class="text-2xl font-black text-[#1b3a6b] dark:text-white tracking-tight">S.A.M.</span>
</div>
<div class="flex items-center gap-2">
<div class="h-10 w-10 bg-sam-yellow rounded-full flex items-center justify-center border-2 border-white shadow-sm">
<span class="material-symbols-outlined text-sam-navy" data-icon="person">person</span>
</div>
</div>
</header>
<main class="flex-grow flex items-center justify-center px-4 py-8">
<div class="max-w-[1200px] w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
<!-- Mascot & Speech Bubble Section -->
<div class="flex flex-col items-center md:items-start order-2 md:order-1">
<div class="relative mb-12">
<!-- Speech Bubble -->
<div class="speech-bubble bg-white rounded-3xl p-8 shadow-[0_8px_24px_rgba(27,58,107,0.08)] max-w-sm border-2 border-sam-gray-light relative">
<p class="font-display-child text-display-child text-sam-navy">Hi! I'm Sammy! What's your name?</p>
</div>
</div>
<!-- Sammy Mascot -->
<div class="w-64 md:w-80 lg:w-96 transform hover:scale-105 transition-transform duration-500">
<img alt="Sammy the friendly dachshund mascot" class="w-full h-auto drop-shadow-xl" data-alt="A cheerful, cartoon dachshund wearing a small graduation cap, waving enthusiastically with a friendly smile, vibrant colors, soft 3D render style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuARDp2ubGpZ221A-hSTGGU09lW8yjFMeHeOMdc7u3ifV6Gq0_bT1g3JyXsqQ1IN4R_5qnWqgHSV48XHnOTt_mg6e64qpKLvv1742Y9cDuh7zFmUn7R9W8hKgZCX3sxjYhcNuFUGLry7C4w5qjGI7czPHw0f0xOkZlxSiY3fOfw9g7_YEy63kVqsMaG1mEjOOEn076IMVky5TC9ksVsH0nRyiqoWhY-PKHD-RDnkN0hQ5r1ewECMbJ6iqRnbtdUNRK2rGnXh5sltq9s_"/>
</div>
</div>
<!-- Interaction Section -->
<div class="bg-white rounded-[32px] p-10 md:p-14 shadow-[0_12px_40px_rgba(27,58,107,0.06)] border border-sam-gray-light order-1 md:order-2">
<div class="space-y-10">
<div class="space-y-4">
<h1 class="font-display-child text-display-child text-sam-navy">Welcome to Atlas!</h1>
<p class="font-body-regular text-body-regular text-sam-gray-dark opacity-80">Let's start our mathematical adventure today.</p>
</div>
<div class="space-y-6">
<label class="block font-caption text-caption text-sam-navy ml-2" for="student-name">Type your name here</label>
<input class="w-full bg-surface-container-low border-2 border-sam-gray-light rounded-2xl px-6 py-6 text-2xl font-math-numeral text-sam-navy focus:border-sam-red focus:ring-0 transition-all placeholder:text-sam-gray-mid" id="student-name" placeholder="E.g. Charlie" type="text"/>
<button class="w-full bg-sam-red text-white font-display-child text-2xl py-6 rounded-2xl shadow-[0_6px_0_#b7102a] hover:translate-y-[2px] hover:shadow-[0_4px_0_#b7102a] active:translate-y-[6px] active:shadow-none transition-all flex items-center justify-center gap-3">
                            That's me!
                            <span class="material-symbols-outlined" data-icon="rocket_launch">rocket_launch</span>
</button>
</div>
<div class="pt-6 border-t border-sam-gray-light flex items-center justify-between">
<div class="flex -space-x-2">
<div class="w-10 h-10 rounded-full border-2 border-white bg-sam-yellow"></div>
<div class="w-10 h-10 rounded-full border-2 border-white bg-sam-teal"></div>
<div class="w-10 h-10 rounded-full border-2 border-white bg-sam-orange"></div>
</div>
<p class="font-caption text-caption text-sam-gray-mid">12,400 kids learning today!</p>
</div>
</div>
</div>
</div>
</main>
<!-- Visual Accents (Playful Dots) -->
<div class="fixed top-20 right-10 w-24 h-24 bg-sam-yellow opacity-20 rounded-full blur-2xl -z-10"></div>
<div class="fixed bottom-20 left-10 w-32 h-32 bg-sam-teal opacity-10 rounded-full blur-3xl -z-10"></div>
<div class="fixed top-1/2 left-1/4 w-16 h-16 bg-sam-red opacity-10 rounded-full blur-xl -z-10"></div>
<!-- Bottom Navigation (Shell Implementation - Suppressed for focus screen as per UX goal, but placeholder structure provided if needed) -->
<!-- Navigation suppressed to prioritize the onboarding content canvas -->
</body></html>

<!-- Module B - 3: K-4 MC Question -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>S.A.M. Assessment - Question</title>
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
                    "sam-yellow": "#FFD166",
                    "surface-bright": "#f9f9ff",
                    "surface-container-highest": "#d7e2ff",
                    "surface-container-high": "#e0e8ff",
                    "tertiary-container": "#936f03",
                    "sam-red": "#E63946",
                    "on-primary-container": "#fffbff",
                    "on-surface": "#001a40",
                    "tertiary-fixed": "#ffdf9b",
                    "tertiary": "#755700",
                    "secondary-fixed-dim": "#ffb780",
                    "on-tertiary-fixed": "#251a00",
                    "surface-tint": "#bb152c",
                    "sam-gray-light": "#E5E5E5",
                    "on-secondary": "#ffffff",
                    "tertiary-fixed-dim": "#edc157",
                    "on-tertiary": "#ffffff",
                    "inverse-on-surface": "#edf0ff",
                    "sam-teal": "#06A77D",
                    "on-primary": "#ffffff",
                    "error-container": "#ffdad6",
                    "surface": "#f9f9ff",
                    "primary": "#b7102a",
                    "on-secondary-container": "#783d01",
                    "background": "#f9f9ff",
                    "error": "#ba1a1a",
                    "sam-cream": "#FFF8F0",
                    "white": "#FFFFFF",
                    "on-tertiary-fixed-variant": "#5b4300",
                    "on-primary-fixed-variant": "#92001c",
                    "sam-gray-mid": "#777777",
                    "inverse-primary": "#ffb3b1",
                    "on-error-container": "#93000a",
                    "on-background": "#001a40",
                    "primary-container": "#db313f",
                    "on-secondary-fixed-variant": "#6f3800",
                    "surface-dim": "#cadaff",
                    "secondary": "#8e4e14",
                    "secondary-fixed": "#ffdcc4",
                    "secondary-container": "#ffab69",
                    "primary-fixed-dim": "#ffb3b1",
                    "outline": "#8f6f6e",
                    "surface-container-lowest": "#ffffff",
                    "sam-navy": "#1B3A6B",
                    "on-secondary-fixed": "#2f1400",
                    "surface-container-low": "#f1f3ff",
                    "on-surface-variant": "#5b403f",
                    "surface-container": "#e8edff",
                    "sam-orange": "#F4A261",
                    "on-error": "#ffffff",
                    "on-primary-fixed": "#410007",
                    "primary-fixed": "#ffdad8",
                    "on-tertiary-container": "#fffbff",
                    "sam-gray-dark": "#333333",
                    "outline-variant": "#e4bebc",
                    "inverse-surface": "#0d2f60",
                    "surface-variant": "#d7e2ff"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "margin-desktop": "40px",
                    "unit": "4px",
                    "container-max": "1440px",
                    "margin-tablet": "32px",
                    "stack-sm": "8px",
                    "gutter": "24px",
                    "report-width": "880px",
                    "stack-lg": "32px",
                    "stack-md": "16px"
            },
            "fontFamily": {
                    "math-numeral": ["Plus Jakarta Sans"],
                    "caption": ["Inter"],
                    "headline-adult": ["Inter"],
                    "display-child": ["Plus Jakarta Sans"],
                    "body-regular": ["Inter"]
            },
            "fontSize": {
                    "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                    "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                    "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                    "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
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
        .touch-target {
            min-width: 88px;
            min-height: 88px;
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
<body class="min-h-screen flex flex-col font-body-regular text-on-background overflow-hidden">
<!-- TopAppBar -->
<header class="bg-[#fdfcf8] dark:bg-slate-950 flex items-center justify-between px-6 py-4 w-full border-b border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none sticky top-0 z-50">
<div class="flex items-center gap-4">
<button class="hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors p-2 rounded-full Active:opacity-80 Active:scale-95 transition-all">
<span class="material-symbols-outlined text-[#E63946] dark:text-red-400" data-icon="arrow_back">arrow_back</span>
</button>
<h1 class="text-2xl font-black text-[#1b3a6b] dark:text-white tracking-tight font-['Plus_Jakarta_Sans']">S.A.M.</h1>
</div>
<div class="flex items-center gap-3">
<!-- Progress Trail Concept -->
<div class="flex items-center gap-1.5 bg-white px-4 py-2 rounded-full shadow-sm border border-sam-gray-light">
<div class="w-3 h-3 rounded-full bg-sam-teal"></div>
<div class="w-3 h-3 rounded-full bg-sam-teal"></div>
<div class="w-3 h-3 rounded-full bg-sam-red ring-4 ring-red-50"></div>
<div class="w-3 h-3 rounded-full bg-sam-gray-light"></div>
<div class="w-3 h-3 rounded-full bg-sam-gray-light"></div>
<span class="ml-2 font-caption text-sam-navy font-bold">3 / 10</span>
</div>
</div>
</header>
<!-- Main Assessment Canvas -->
<main class="flex-grow flex items-center justify-center p-gutter relative">
<!-- Focused Content Area -->
<div class="max-w-4xl w-full flex flex-col items-center gap-stack-lg">
<!-- Question Section -->
<div class="text-center mb-8">
<h2 class="font-display-child text-display-child text-sam-navy mb-4">What is 47 - 19?</h2>
<div class="h-1 w-24 bg-sam-yellow rounded-full mx-auto"></div>
</div>
<!-- Choice Grid (2x2) -->
<div class="grid grid-cols-2 gap-stack-md w-full max-w-2xl">
<!-- Tile 1: 28 (Correct) -->
<button class="bg-white border-2 border-sam-gray-light rounded-xl p-10 shadow-[0px_4px_12px_rgba(27,58,107,0.08)] hover:border-sam-navy hover:scale-105 active:scale-95 transition-all duration-200 group flex items-center justify-center">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">28</span>
</button>
<!-- Tile 2: 38 -->
<button class="bg-white border-2 border-sam-gray-light rounded-xl p-10 shadow-[0px_4px_12px_rgba(27,58,107,0.08)] hover:border-sam-navy hover:scale-105 active:scale-95 transition-all duration-200 group flex items-center justify-center">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">38</span>
</button>
<!-- Tile 3: 26 -->
<button class="bg-white border-2 border-sam-gray-light rounded-xl p-10 shadow-[0px_4px_12px_rgba(27,58,107,0.08)] hover:border-sam-navy hover:scale-105 active:scale-95 transition-all duration-200 group flex items-center justify-center">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">26</span>
</button>
<!-- Tile 4: 32 -->
<button class="bg-white border-2 border-sam-gray-light rounded-xl p-10 shadow-[0px_4px_12px_rgba(27,58,107,0.08)] hover:border-sam-navy hover:scale-105 active:scale-95 transition-all duration-200 group flex items-center justify-center">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">32</span>
</button>
</div>
</div>
<!-- Decorative Elements for Calm Atmosphere (Subtle gradients, no mascot) -->
<div class="absolute bottom-0 left-0 w-64 h-64 bg-sam-yellow opacity-10 blur-3xl -z-10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
<div class="absolute top-0 right-0 w-80 h-80 bg-sam-red opacity-5 blur-3xl -z-10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
</main>
<!-- Contextual Footer (Focus mode: No Nav Bar, just navigation aid if needed) -->
<footer class="p-6 flex justify-between items-center bg-white border-t border-gray-100">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-sam-orange" data-icon="lightbulb" style="font-variation-settings: 'FILL' 1;">lightbulb</span>
<span class="text-caption font-caption text-sam-gray-dark">Read carefully!</span>
</div>
<div class="flex items-center gap-4">
<button class="px-8 py-3 bg-sam-gray-light text-sam-navy font-bold rounded-xl active:scale-95 transition-transform">
                Skip
            </button>
<button class="px-10 py-3 bg-sam-red text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                Continue
                <span class="material-symbols-outlined" data-icon="chevron_right">chevron_right</span>
</button>
</div>
</footer>
<!-- BottomNavBar is suppressed as per UX Goal for focused journey -->
</body></html>

<!-- Module B - 4: K-4 Numeric Entry -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
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
                        "sam-yellow": "#FFD166",
                        "surface-bright": "#f9f9ff",
                        "surface-container-highest": "#d7e2ff",
                        "surface-container-high": "#e0e8ff",
                        "tertiary-container": "#936f03",
                        "sam-red": "#E63946",
                        "on-primary-container": "#fffbff",
                        "on-surface": "#001a40",
                        "tertiary-fixed": "#ffdf9b",
                        "tertiary": "#755700",
                        "secondary-fixed-dim": "#ffb780",
                        "on-tertiary-fixed": "#251a00",
                        "surface-tint": "#bb152c",
                        "sam-gray-light": "#E5E5E5",
                        "on-secondary": "#ffffff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-tertiary": "#ffffff",
                        "inverse-on-surface": "#edf0ff",
                        "sam-teal": "#06A77D",
                        "on-primary": "#ffffff",
                        "error-container": "#ffdad6",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-secondary-container": "#783d01",
                        "background": "#f9f9ff",
                        "error": "#ba1a1a",
                        "sam-cream": "#FFF8F0",
                        "white": "#FFFFFF",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-primary-fixed-variant": "#92001c",
                        "sam-gray-mid": "#777777",
                        "inverse-primary": "#ffb3b1",
                        "on-error-container": "#93000a",
                        "on-background": "#001a40",
                        "primary-container": "#db313f",
                        "on-secondary-fixed-variant": "#6f3800",
                        "surface-dim": "#cadaff",
                        "secondary": "#8e4e14",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "primary-fixed-dim": "#ffb3b1",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "sam-navy": "#1B3A6B",
                        "on-secondary-fixed": "#2f1400",
                        "surface-container-low": "#f1f3ff",
                        "on-surface-variant": "#5b403f",
                        "surface-container": "#e8edff",
                        "sam-orange": "#F4A261",
                        "on-error": "#ffffff",
                        "on-primary-fixed": "#410007",
                        "primary-fixed": "#ffdad8",
                        "on-tertiary-container": "#fffbff",
                        "sam-gray-dark": "#333333",
                        "outline-variant": "#e4bebc",
                        "inverse-surface": "#0d2f60",
                        "surface-variant": "#d7e2ff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "margin-desktop": "40px",
                        "unit": "4px",
                        "container-max": "1440px",
                        "margin-tablet": "32px",
                        "stack-sm": "8px",
                        "gutter": "24px",
                        "report-width": "880px",
                        "stack-lg": "32px",
                        "stack-md": "16px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "caption": ["Inter"],
                        "headline-adult": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "body-regular": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
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
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .tap-highlight-none { -webkit-tap-highlight-color: transparent; }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen flex flex-col font-body-regular overflow-hidden">
<!-- Top Navigation (Shell Implementation) -->
<header class="bg-[#fdfcf8] dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center justify-between px-6 py-4 w-full fixed top-0 z-50">
<div class="flex items-center gap-4">
<button class="text-[#E63946] dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors rounded-full p-2 active:opacity-80 active:scale-95">
<span class="material-symbols-outlined" data-icon="arrow_back">arrow_back</span>
</button>
<h1 class="text-2xl font-black text-[#1b3a6b] dark:text-white tracking-tight">S.A.M.</h1>
</div>
<!-- Progress Dots (Child Journey Concept) -->
<div class="flex items-center gap-3">
<div class="w-3 h-3 rounded-full bg-sam-teal shadow-sm"></div>
<div class="w-3 h-3 rounded-full bg-sam-teal shadow-sm"></div>
<div class="w-4 h-4 rounded-full bg-sam-red ring-4 ring-red-100 animate-pulse"></div>
<div class="w-3 h-3 rounded-full bg-sam-gray-light"></div>
<div class="w-3 h-3 rounded-full bg-sam-gray-light"></div>
</div>
<div class="w-10 h-10 rounded-full border-2 border-sam-navy p-0.5 overflow-hidden">
<img alt="User Profile" class="w-full h-full object-cover rounded-full" data-alt="close-up portrait of a friendly cartoon avatar icon with simple line art and vibrant colors" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCK7xGzfJTUkK_FdjaJc7HSfqJjAhhx-L5CyYcg8W__sMPOeA9HtI4dubsjFJDNlddIokkvsufY7neKZFgJuaR_NuEefd8dnAux--0xPzFZVDF3xcllB_Uq43RVTWYttjt55YifP_ea7giMdcrq5p2YzGhqJKZI13pe9Sh12BQmat-pTu72aBlLKGsXUVuLe-hKQkfTDlpfBO_gk5pSZPfR3qeX2NNXnq3ARDbLG_zi57ZX3f6OpLZpQ7WIic2TrwQsZZkWsCadqJ6X"/>
</div>
</header>
<!-- Main Content (Landscape Assessment Layout) -->
<main class="flex-1 flex flex-col items-center justify-center pt-24 pb-8 px-6 max-w-6xl mx-auto w-full">
<div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
<!-- Question Content Section -->
<div class="flex flex-col space-y-8">
<div class="bg-white rounded-[32px] p-8 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] relative overflow-hidden">
<!-- Accent Decoration -->
<div class="absolute top-0 right-0 w-24 h-24 bg-sam-yellow/10 rounded-bl-full"></div>
<div class="space-y-6 relative z-10">
<span class="inline-block px-4 py-1.5 bg-sam-yellow rounded-full text-sam-navy font-bold text-sm tracking-wide">STORY PROBLEM</span>
<p class="font-display-child text-display-child text-sam-navy">
                            Maya has <span class="text-sam-red underline decoration-4 underline-offset-4">24</span> stickers. She gives <span class="text-sam-red underline decoration-4 underline-offset-4">8</span> to her brother.
                        </p>
<p class="font-display-child text-display-child text-sam-navy italic">
                            How many does she have left?
                        </p>
</div>
</div>
<!-- Mascot Area -->
<div class="flex items-end gap-6 pl-4">
<img class="w-24 h-24 drop-shadow-lg" data-alt="a cute expressive cartoon otter character with large eyes wearing a small red academic cap smiling warmly" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGzCrhgeXWvesMdHbWBaM_YCDubAznjwEHU5E1ZuWtfgisELKlpLyalYqJKk1aTjciMCRfodNb7422U3gceUTzVdayjGYI2dFFnz-7HjmrEhPEoxel6lQkibkBuAe7JuF4hu82Ukvt3RFOhSjYk7Ktg9qcXm1D2sLoG2jjqSLlfPvzHlxWkIP9HLZ_N6N6iUPMcQoH8KU1BHSv2C5J__oth8GynM1iMN6Pi_Xul160D2ya_7UncW4z9eqTkU6fu8Ggskz3NKpumz5_"/>
<div class="bg-white border-2 border-sam-gray-light rounded-2xl rounded-bl-none p-4 relative shadow-sm max-w-xs">
<p class="text-sam-navy font-medium text-lg leading-snug">"You've got this! Think about taking away 8 from 24."</p>
</div>
</div>
</div>
<!-- Interaction Section (Number Pad) -->
<div class="flex flex-col items-center space-y-8">
<!-- Display Area -->
<div class="w-full max-w-[320px]">
<label class="block text-center text-sam-navy font-bold mb-3 uppercase tracking-widest text-sm">Your Answer</label>
<div class="w-full bg-white border-4 border-sam-gray-light rounded-2xl p-6 text-center shadow-inner h-28 flex items-center justify-center transition-all duration-200">
<span class="font-math-numeral text-math-numeral text-sam-navy tabular-nums" style="font-size: 64px;">16</span>
<div class="w-1 h-12 bg-sam-red ml-1 animate-pulse rounded-full"></div>
</div>
</div>
<!-- Custom Number Pad (Chunky Professional-Playful Design) -->
<div class="grid grid-cols-3 gap-4 w-full max-w-[400px]">
<!-- Row 1 -->
<button class="bg-white border-2 border-sam-gray-light h-20 rounded-2xl flex items-center justify-center font-math-numeral text-math-numeral text-sam-navy shadow-[0_4px_0_#E5E5E5] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">1</button>
<button class="bg-white border-2 border-sam-gray-light h-20 rounded-2xl flex items-center justify-center font-math-numeral text-math-numeral text-sam-navy shadow-[0_4px_0_#E5E5E5] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">2</button>
<button class="bg-white border-2 border-sam-gray-light h-20 rounded-2xl flex items-center justify-center font-math-numeral text-math-numeral text-sam-navy shadow-[0_4px_0_#E5E5E5] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">3</button>
<!-- Row 2 -->
<button class="bg-white border-2 border-sam-gray-light h-20 rounded-2xl flex items-center justify-center font-math-numeral text-math-numeral text-sam-navy shadow-[0_4px_0_#E5E5E5] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">4</button>
<button class="bg-white border-2 border-sam-gray-light h-20 rounded-2xl flex items-center justify-center font-math-numeral text-math-numeral text-sam-navy shadow-[0_4px_0_#E5E5E5] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">5</button>
<button class="bg-white border-2 border-sam-gray-light h-20 rounded-2xl flex items-center justify-center font-math-numeral text-math-numeral text-sam-navy shadow-[0_4px_0_#E5E5E5] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">6</button>
<!-- Row 3 -->
<button class="bg-white border-2 border-sam-gray-light h-20 rounded-2xl flex items-center justify-center font-math-numeral text-math-numeral text-sam-navy shadow-[0_4px_0_#E5E5E5] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">7</button>
<button class="bg-white border-2 border-sam-gray-light h-20 rounded-2xl flex items-center justify-center font-math-numeral text-math-numeral text-sam-navy shadow-[0_4px_0_#E5E5E5] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">8</button>
<button class="bg-white border-2 border-sam-gray-light h-20 rounded-2xl flex items-center justify-center font-math-numeral text-math-numeral text-sam-navy shadow-[0_4px_0_#E5E5E5] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">9</button>
<!-- Row 4 -->
<button class="bg-sam-gray-light h-20 rounded-2xl flex items-center justify-center text-sam-navy shadow-[0_4px_0_#CCCCCC] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">
<span class="material-symbols-outlined" data-icon="backspace" style="font-size: 32px;">backspace</span>
</button>
<button class="bg-white border-2 border-sam-gray-light h-20 rounded-2xl flex items-center justify-center font-math-numeral text-math-numeral text-sam-navy shadow-[0_4px_0_#E5E5E5] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">0</button>
<button class="bg-sam-teal h-20 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-[0_4px_0_#048C68] active:shadow-none active:translate-y-1 transition-all tap-highlight-none">
                        DONE
                    </button>
</div>
</div>
</div>
</main>
<!-- Bottom Navigation Bar (Shell Implementation) -->
<nav class="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.06)] rounded-t-2xl md:hidden">
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-3 py-1 hover:text-[#E63946] transition-colors active:scale-90 duration-150" href="#">
<span class="material-symbols-outlined" data-icon="home">home</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Home</span>
</a>
<a class="flex flex-col items-center justify-center text-[#E63946] bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-1 active:scale-90 duration-150" href="#">
<span class="material-symbols-outlined" data-icon="calculate" style="font-variation-settings: 'FILL' 1;">calculate</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Assessments</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-3 py-1 hover:text-[#E63946] transition-colors active:scale-90 duration-150" href="#">
<span class="material-symbols-outlined" data-icon="analytics">analytics</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Reports</span>
</a>
</nav>
<!-- Aesthetic Floating Elements (Background Textures) -->
<div class="fixed top-32 left-10 w-24 h-24 bg-sam-orange/10 rounded-full blur-2xl -z-10"></div>
<div class="fixed bottom-40 right-20 w-48 h-48 bg-sam-teal/10 rounded-full blur-3xl -z-10"></div>
</body></html>

<!-- Module B - 5: K-4 Drag & Drop -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>S.A.M. Assessment - Drag &amp; Drop</title>
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
                        "sam-yellow": "#FFD166",
                        "surface-bright": "#f9f9ff",
                        "surface-container-highest": "#d7e2ff",
                        "surface-container-high": "#e0e8ff",
                        "tertiary-container": "#936f03",
                        "sam-red": "#E63946",
                        "on-primary-container": "#fffbff",
                        "on-surface": "#001a40",
                        "tertiary-fixed": "#ffdf9b",
                        "tertiary": "#755700",
                        "secondary-fixed-dim": "#ffb780",
                        "on-tertiary-fixed": "#251a00",
                        "surface-tint": "#bb152c",
                        "sam-gray-light": "#E5E5E5",
                        "on-secondary": "#ffffff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-tertiary": "#ffffff",
                        "inverse-on-surface": "#edf0ff",
                        "sam-teal": "#06A77D",
                        "on-primary": "#ffffff",
                        "error-container": "#ffdad6",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-secondary-container": "#783d01",
                        "background": "#f9f9ff",
                        "error": "#ba1a1a",
                        "sam-cream": "#FFF8F0",
                        "white": "#FFFFFF",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-primary-fixed-variant": "#92001c",
                        "sam-gray-mid": "#777777",
                        "inverse-primary": "#ffb3b1",
                        "on-error-container": "#93000a",
                        "on-background": "#001a40",
                        "primary-container": "#db313f",
                        "on-secondary-fixed-variant": "#6f3800",
                        "surface-dim": "#cadaff",
                        "secondary": "#8e4e14",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "primary-fixed-dim": "#ffb3b1",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "sam-navy": "#1B3A6B",
                        "on-secondary-fixed": "#2f1400",
                        "surface-container-low": "#f1f3ff",
                        "on-surface-variant": "#5b403f",
                        "surface-container": "#e8edff",
                        "sam-orange": "#F4A261",
                        "on-error": "#ffffff",
                        "on-primary-fixed": "#410007",
                        "primary-fixed": "#ffdad8",
                        "on-tertiary-container": "#fffbff",
                        "sam-gray-dark": "#333333",
                        "outline-variant": "#e4bebc",
                        "inverse-surface": "#0d2f60",
                        "surface-variant": "#d7e2ff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "caption": ["Inter"],
                        "headline-adult": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "body-regular": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
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
        .pb-safe {
            padding-bottom: env(safe-area-inset-bottom);
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream font-body-regular text-on-background selection:bg-sam-red/20 overflow-x-hidden">
<!-- Top Navigation Bar -->
<header class="bg-[#fdfcf8] dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center justify-between px-6 py-4 w-full sticky top-0 z-50">
<div class="flex items-center gap-4">
<button class="text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors p-2 rounded-full active:opacity-80 active:scale-95">
<span class="material-symbols-outlined" data-icon="arrow_back">arrow_back</span>
</button>
<h1 class="text-2xl font-black text-[#1b3a6b] dark:text-white tracking-tight font-['Plus_Jakarta_Sans']">S.A.M.</h1>
</div>
<!-- Progress Dot Trail (Journey Map) -->
<div class="flex items-center gap-3">
<div class="h-3 w-3 rounded-full bg-sam-teal"></div>
<div class="h-1 w-8 rounded-full bg-sam-teal/20">
<div class="h-full w-full bg-sam-teal rounded-full"></div>
</div>
<div class="h-4 w-4 rounded-full border-2 border-sam-teal bg-white flex items-center justify-center">
<div class="h-1.5 w-1.5 rounded-full bg-sam-teal"></div>
</div>
<div class="h-1 w-8 rounded-full bg-sam-gray-light"></div>
<div class="h-3 w-3 rounded-full bg-sam-gray-light"></div>
</div>
<div class="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-sam-gray-light">
<span class="material-symbols-outlined text-sam-orange" data-icon="stars" style="font-variation-settings: 'FILL' 1;">stars</span>
<span class="font-display-child text-lg text-sam-navy">120</span>
</div>
</header>
<main class="max-w-[1200px] mx-auto px-6 py-8 min-h-[calc(100vh-160px)] flex flex-col items-center justify-center">
<!-- Question Prompt Area -->
<div class="text-center mb-12">
<h2 class="font-display-child text-display-child text-sam-navy mb-4">12 + ? = 30</h2>
<p class="font-body-regular text-headline-adult text-sam-gray-dark">Drag the right number into the bar.</p>
</div>
<!-- Interactive Bar Model Area -->
<div class="w-full max-w-4xl bg-white rounded-[32px] p-12 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light relative mb-16">
<div class="flex flex-col items-center w-full gap-8">
<!-- Top Bracket Label -->
<div class="relative w-full h-8 flex justify-center items-end">
<div class="absolute bottom-0 w-full h-[2px] bg-sam-navy/20"></div>
<div class="absolute -top-4 bg-white px-6 font-math-numeral text-math-numeral text-sam-navy">30</div>
</div>
<!-- The Bar Model -->
<div class="flex w-full h-24 rounded-2xl overflow-hidden border-4 border-white ring-4 ring-sam-navy/5">
<!-- Known Part -->
<div class="w-[40%] bg-sam-yellow flex items-center justify-center relative border-r-4 border-white">
<span class="font-math-numeral text-math-numeral text-sam-navy">12</span>
<div class="absolute -bottom-10 font-caption text-caption text-sam-gray-mid">Part A</div>
</div>
<!-- Target Drop Zone -->
<div class="w-[60%] bg-sam-cream border-2 border-dashed border-sam-red/40 flex items-center justify-center relative">
<div class="flex flex-col items-center gap-1 opacity-40">
<span class="material-symbols-outlined text-4xl text-sam-red" data-icon="touch_app">touch_app</span>
<span class="font-caption text-caption text-sam-red font-bold uppercase tracking-wider">Drop Here</span>
</div>
<div class="absolute -bottom-10 font-caption text-caption text-sam-gray-mid">Part B</div>
</div>
</div>
</div>
</div>
<!-- Draggable Number Tiles -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-3xl">
<!-- Tile 15 -->
<div class="group cursor-grab active:cursor-grabbing bg-white border-2 border-sam-gray-light p-8 rounded-[24px] flex items-center justify-center shadow-sm hover:border-sam-red hover:scale-105 active:scale-95 transition-all duration-200">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-red">15</span>
</div>
<!-- Tile 18 (Correct Answer) -->
<div class="group cursor-grab active:cursor-grabbing bg-white border-2 border-sam-gray-light p-8 rounded-[24px] flex items-center justify-center shadow-sm hover:border-sam-red hover:scale-105 active:scale-95 transition-all duration-200">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-red">18</span>
</div>
<!-- Tile 20 -->
<div class="group cursor-grab active:cursor-grabbing bg-white border-2 border-sam-gray-light p-8 rounded-[24px] flex items-center justify-center shadow-sm hover:border-sam-red hover:scale-105 active:scale-95 transition-all duration-200">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-red">20</span>
</div>
<!-- Tile 22 -->
<div class="group cursor-grab active:cursor-grabbing bg-white border-2 border-sam-gray-light p-8 rounded-[24px] flex items-center justify-center shadow-sm hover:border-sam-red hover:scale-105 active:scale-95 transition-all duration-200">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-red">22</span>
</div>
</div>
<!-- Mascot Placement (Sammy the Otter) -->
<div class="fixed bottom-24 right-12 hidden lg:flex items-end gap-4 pointer-events-none select-none">
<div class="bg-white p-6 rounded-[24px] rounded-br-none shadow-lg border border-sam-gray-light max-w-xs mb-12">
<p class="font-body-regular text-sam-navy leading-snug">You're doing great! Think about what number added to 12 makes 30. 🦦</p>
</div>
<img alt="Sammy the Otter mascot cheering" class="w-48 h-48 object-contain drop-shadow-xl" data-alt="Illustration of a friendly, playful cartoon otter wearing a small academic cap, smiling warmly and waving with a friendly expression." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQpXD1_IgGBPw8L9tZkFjyp4zekUbww24z_2zBqfg-n0ceVanln1mV9L5qcLpBwAJl3HoseapHVWLUTFE0AxghsFnDltL_fnKypZ_qQdIBLvJPGkTcx2hq9wFNXGmU3yr372o9Umlv5rlD0Ygk-_u-7q1DiEJFfLf1xtZfxgkIIRv4fRLNr_3-wWDpA68E5Bh_H5nUcvio7zZCn-CD2H8zI89_cJDPFAmQ882Zv0LlVhgIIEVr8Nc3qp2Le9zIMtzsXY_1grNt5sTv"/>
</div>
</main>
<!-- Bottom Navigation Bar -->
<footer class="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.06)] rounded-t-2xl">
<button class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-3 py-1 hover:text-[#E63946] transition-colors active:scale-90 duration-150">
<span class="material-symbols-outlined" data-icon="home">home</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Home</span>
</button>
<button class="flex flex-col items-center justify-center text-[#E63946] bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-1 hover:text-[#E63946] transition-colors active:scale-90 duration-150">
<span class="material-symbols-outlined" data-icon="calculate" style="font-variation-settings: 'FILL' 1;">calculate</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-bold">Assessments</span>
</button>
<button class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-3 py-1 hover:text-[#E63946] transition-colors active:scale-90 duration-150">
<span class="material-symbols-outlined" data-icon="analytics">analytics</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Reports</span>
</button>
</footer>
<!-- FAB: Only relevant on Home/Dashboard, typically suppressed on Detail/Assessment screens per instructions, but placeholder for structure -->
<!-- Suppressed on assessment screens as per "Shell Visibility & Relevance" rule -->
</body></html>

<!-- Module B - 7: K-4 Completion -->
<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600&amp;family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "sam-yellow": "#FFD166",
                        "surface-bright": "#f9f9ff",
                        "surface-container-highest": "#d7e2ff",
                        "surface-container-high": "#e0e8ff",
                        "tertiary-container": "#936f03",
                        "sam-red": "#E63946",
                        "on-primary-container": "#fffbff",
                        "on-surface": "#001a40",
                        "tertiary-fixed": "#ffdf9b",
                        "tertiary": "#755700",
                        "secondary-fixed-dim": "#ffb780",
                        "on-tertiary-fixed": "#251a00",
                        "surface-tint": "#bb152c",
                        "sam-gray-light": "#E5E5E5",
                        "on-secondary": "#ffffff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-tertiary": "#ffffff",
                        "inverse-on-surface": "#edf0ff",
                        "sam-teal": "#06A77D",
                        "on-primary": "#ffffff",
                        "error-container": "#ffdad6",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-secondary-container": "#783d01",
                        "background": "#f9f9ff",
                        "error": "#ba1a1a",
                        "sam-cream": "#FFF8F0",
                        "white": "#FFFFFF",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-primary-fixed-variant": "#92001c",
                        "sam-gray-mid": "#777777",
                        "inverse-primary": "#ffb3b1",
                        "on-error-container": "#93000a",
                        "on-background": "#001a40",
                        "primary-container": "#db313f",
                        "on-secondary-fixed-variant": "#6f3800",
                        "surface-dim": "#cadaff",
                        "secondary": "#8e4e14",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "primary-fixed-dim": "#ffb3b1",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "sam-navy": "#1B3A6B",
                        "on-secondary-fixed": "#2f1400",
                        "surface-container-low": "#f1f3ff",
                        "on-surface-variant": "#5b403f",
                        "surface-container": "#e8edff",
                        "sam-orange": "#F4A261",
                        "on-error": "#ffffff",
                        "on-primary-fixed": "#410007",
                        "primary-fixed": "#ffdad8",
                        "on-tertiary-container": "#fffbff",
                        "sam-gray-dark": "#333333",
                        "outline-variant": "#e4bebc",
                        "inverse-surface": "#0d2f60",
                        "surface-variant": "#d7e2ff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "margin-desktop": "40px",
                        "unit": "4px",
                        "container-max": "1440px",
                        "margin-tablet": "32px",
                        "stack-sm": "8px",
                        "gutter": "24px",
                        "report-width": "880px",
                        "stack-lg": "32px",
                        "stack-md": "16px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "caption": ["Inter"],
                        "headline-adult": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "body-regular": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
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
        .confetti-piece {
            position: absolute;
            width: 12px;
            height: 12px;
            opacity: 0.7;
            border-radius: 2px;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen overflow-hidden flex flex-direction-column">
<!-- Top Navigation Shell (Suppressed as per Transactional Rule, but keeping TopAppBar for Brand identity and "Close" equivalent) -->
<header class="flex items-center justify-between px-6 py-4 w-full bg-[#fdfcf8] shadow-sm z-10 border-b border-gray-100">
<div class="flex items-center gap-4">
<span class="material-symbols-outlined text-slate-500 hover:bg-gray-100 transition-colors p-2 rounded-full cursor-pointer">arrow_back</span>
<span class="text-2xl font-black text-[#1b3a6b] tracking-tight">S.A.M.</span>
</div>
<div class="flex items-center gap-2">
<div class="h-2 w-48 bg-sam-gray-light rounded-full overflow-hidden">
<div class="h-full bg-sam-teal w-full"></div>
</div>
<span class="font-caption text-caption text-sam-gray-mid">100%</span>
</div>
</header>
<!-- Main Content Canvas: Child Assessment Viewport -->
<main class="relative flex-1 flex flex-col items-center justify-center p-stack-lg max-w-container-max mx-auto w-full text-center overflow-hidden">
<!-- Decorative Confetti Background Elements -->
<div class="absolute inset-0 pointer-events-none">
<div class="confetti-piece bg-sam-red top-20 left-10 rotate-12"></div>
<div class="confetti-piece bg-sam-yellow top-40 left-1/4 -rotate-45"></div>
<div class="confetti-piece bg-sam-teal top-10 right-20 rotate-45"></div>
<div class="confetti-piece bg-sam-orange bottom-32 left-20 rotate-12"></div>
<div class="confetti-piece bg-sam-navy bottom-40 right-1/4 -rotate-12"></div>
<div class="confetti-piece bg-sam-red top-1/2 right-10 rotate-90"></div>
<div class="confetti-piece bg-sam-yellow bottom-10 right-20 -rotate-45"></div>
</div>
<!-- Completion Hero Section -->
<div class="z-20 flex flex-col items-center gap-stack-md">
<!-- Mascot: Sammy the Otter (Represented by IMAGE_74) -->
<div class="relative w-64 h-64 md:w-80 md:h-80 mb-stack-sm">
<div class="absolute inset-0 bg-sam-yellow opacity-10 rounded-full scale-110 blur-2xl"></div>
<img alt="a cheerful dachshund mascot wearing a small graduate cap performing a joyful victory dance with confetti in the background" class="w-full h-full object-contain relative z-20" data-alt="a cheerful cartoon dachshund wearing a colorful vest and a tiny graduate cap dancing happily with floating math symbols" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcOVQO6Jq8ZzvYtKofk7oRhIRDc0jQsPdBRU4NRHISdQyorAmM4nzrEZcl_3PcqSE1evd19VIeAZV53q6PfqBNQKXt3JnMmp4Sa6H9_gR-2MwD5rk1mIjhyxQFOsdvuOXdo-OY8Aq7m1kJktRLn6u15GBB-M26Dt-8eQDBdw-W4m0rBfly_RltKMR7TV4bcJGb2IE3a5b8y1GNJYTd1KIDvYIOiCdGsNuG2o_3BIcOmdBOsqszp66yTzxBOQqf9bz-td9mMz5fYY-o"/>
</div>
<!-- Headlines -->
<div class="space-y-unit">
<h1 class="font-display-child text-display-child text-sam-navy tracking-tight">All done! Amazing work!</h1>
<p class="font-headline-adult text-headline-adult text-sam-gray-dark opacity-80">Show this screen to your grown-up.</p>
</div>
<!-- Action Area -->
<div class="mt-stack-lg flex flex-col items-center gap-4">
<button class="bg-sam-red hover:bg-primary-container text-white px-12 py-6 rounded-xl font-display-child text-[28px] shadow-lg active:scale-95 transition-all flex items-center gap-3 border-b-4 border-b-[#92001c]">
                    Show My Grown-up
                    <span class="material-symbols-outlined text-[32px]">arrow_forward</span>
</button>
<p class="font-caption text-caption text-sam-gray-mid max-w-xs">
                    Great job! You've completed all your math challenges for today.
                </p>
</div>
</div>
<!-- Decorative Achievement Badge (Asymmetric Layout Detail) -->
<div class="absolute bottom-20 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-margin-desktop md:bottom-margin-desktop bg-white p-4 rounded-2xl shadow-sm border border-sam-gray-light flex items-center gap-4 rotate-[-2deg]">
<div class="w-12 h-12 bg-sam-teal rounded-full flex items-center justify-center text-white">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">stars</span>
</div>
<div class="text-left">
<p class="font-caption text-caption text-sam-gray-dark font-bold">New Badge!</p>
<p class="font-caption text-[12px] text-sam-gray-mid">Math Explorer Level 1</p>
</div>
</div>
</main>
<!-- Background Decoration Shell -->
<div class="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#FFF2E2] to-transparent pointer-events-none -z-10"></div>
<!-- Bottom Shell Suppressed for Transactional Completion Screen as per Destination Rule -->
</body></html>

<!-- Module B - 6: K-4 Encouragement -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>S.A.M. - Keep Going!</title>
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
                        "sam-yellow": "#FFD166",
                        "surface-bright": "#f9f9ff",
                        "surface-container-highest": "#d7e2ff",
                        "surface-container-high": "#e0e8ff",
                        "tertiary-container": "#936f03",
                        "sam-red": "#E63946",
                        "on-primary-container": "#fffbff",
                        "on-surface": "#001a40",
                        "tertiary-fixed": "#ffdf9b",
                        "tertiary": "#755700",
                        "secondary-fixed-dim": "#ffb780",
                        "on-tertiary-fixed": "#251a00",
                        "surface-tint": "#bb152c",
                        "sam-gray-light": "#E5E5E5",
                        "on-secondary": "#ffffff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-tertiary": "#ffffff",
                        "inverse-on-surface": "#edf0ff",
                        "sam-teal": "#06A77D",
                        "on-primary": "#ffffff",
                        "error-container": "#ffdad6",
                        "surface": "#f9f9ff",
                        "primary": "#b7102a",
                        "on-secondary-container": "#783d01",
                        "background": "#f9f9ff",
                        "error": "#ba1a1a",
                        "sam-cream": "#FFF8F0",
                        "white": "#FFFFFF",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-primary-fixed-variant": "#92001c",
                        "sam-gray-mid": "#777777",
                        "inverse-primary": "#ffb3b1",
                        "on-error-container": "#93000a",
                        "on-background": "#001a40",
                        "primary-container": "#db313f",
                        "on-secondary-fixed-variant": "#6f3800",
                        "surface-dim": "#cadaff",
                        "secondary": "#8e4e14",
                        "secondary-fixed": "#ffdcc4",
                        "secondary-container": "#ffab69",
                        "primary-fixed-dim": "#ffb3b1",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "sam-navy": "#1B3A6B",
                        "on-secondary-fixed": "#2f1400",
                        "surface-container-low": "#f1f3ff",
                        "on-surface-variant": "#5b403f",
                        "surface-container": "#e8edff",
                        "sam-orange": "#F4A261",
                        "on-error": "#ffffff",
                        "on-primary-fixed": "#410007",
                        "primary-fixed": "#ffdad8",
                        "on-tertiary-container": "#fffbff",
                        "sam-gray-dark": "#333333",
                        "outline-variant": "#e4bebc",
                        "inverse-surface": "#0d2f60",
                        "surface-variant": "#d7e2ff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "margin-desktop": "40px",
                        "unit": "4px",
                        "container-max": "1440px",
                        "margin-tablet": "32px",
                        "stack-sm": "8px",
                        "gutter": "24px",
                        "report-width": "880px",
                        "stack-lg": "32px",
                        "stack-md": "16px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "caption": ["Inter"],
                        "headline-adult": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "body-regular": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
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
        .confetti-pattern {
            background-image: radial-gradient(#FFD166 2px, transparent 2px), radial-gradient(#06A77D 2px, transparent 2px), radial-gradient(#E63946 2px, transparent 2px);
            background-size: 40px 40px;
            background-position: 0 0, 20px 20px, 10px 10px;
            opacity: 0.15;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen flex flex-col font-body-regular overflow-hidden">
<!-- Top Navigation Anchor - Suppressed visual but kept for structural consistency if needed, though hidden for this splash -->
<header class="hidden md:flex items-center justify-between px-6 py-4 w-full bg-[#fdfcf8] dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none z-10">
<div class="flex items-center gap-4">
<span class="material-symbols-outlined text-[#E63946] dark:text-red-400 cursor-pointer transition-all active:scale-95" data-icon="arrow_back">arrow_back</span>
<h1 class="text-2xl font-black text-[#1b3a6b] dark:text-white tracking-tight font-['Plus_Jakarta_Sans']">S.A.M.</h1>
</div>
</header>
<!-- Main Interstitial Canvas -->
<main class="flex-grow flex flex-col items-center justify-center relative p-gutter md:p-stack-lg">
<!-- Playful Background Decoration -->
<div class="absolute inset-0 confetti-pattern pointer-events-none"></div>
<!-- Large Background Shapes for Playfulness -->
<div class="absolute top-10 left-10 w-32 h-32 bg-sam-yellow/20 rounded-full blur-3xl"></div>
<div class="absolute bottom-20 right-10 w-48 h-48 bg-sam-teal/10 rounded-full blur-3xl"></div>
<div class="absolute top-1/2 left-1/4 w-16 h-16 bg-sam-red/10 rounded-lg rotate-12 blur-2xl"></div>
<div class="z-10 w-full max-w-4xl flex flex-col items-center">
<!-- Speech Bubble & Mascot Container -->
<div class="relative mb-stack-lg flex flex-col items-center">
<!-- Speech Bubble -->
<div class="relative bg-white p-stack-md md:p-8 rounded-[32px] shadow-lg border-4 border-sam-navy mb-8 max-w-sm md:max-w-md">
<p class="font-display-child text-display-child text-sam-navy text-center">
                        Whoa, you're flying through these! Keep it up!
                    </p>
<!-- Speech Bubble Tail -->
<div class="absolute -bottom-5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[24px] border-t-sam-navy"></div>
<div class="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[20px] border-t-white"></div>
</div>
<!-- Mascot: IMAGE_74 (Dachshund) -->
<div class="relative h-64 md:h-80 w-auto group">
<img alt="Dachshund mascot cheering" class="h-full w-auto object-contain drop-shadow-xl" data-alt="A cute, friendly dachshund cartoon mascot in a joyful cheering pose, standing on hind legs with paws up, bright and colorful educational style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZTPnU6YFJmwNtzUwUSceQAzqHUKatM2AkJdWdPLp0t5Z4rz-48HLxuMkK0N1jJPxVgludFGaRfEyjmPQIGAN0GvGHPQ1OkB1IUw6sB-8swLuSuoRmztjXGzPKM83ATLMBVkpTM_1s7_xcHuTB9ygjL-cB8RnOMiihQ9-CbYfHZ4fmkXJJYbD702B3sagENEn6lHxzlCMqaaLNCV4u1fxt_8y-vLg29ptYQF8j4qoHtfHr1zly1vl_fuD3xl6odnfxRN-hbFbrYtTW"/>
<!-- Decorative Stars around Mascot -->
<span class="absolute -top-4 -right-8 material-symbols-outlined text-sam-yellow text-5xl" data-icon="star" data-weight="fill" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="absolute top-1/2 -left-12 material-symbols-outlined text-sam-teal text-4xl" data-icon="auto_awesome" data-weight="fill" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
<span class="absolute bottom-4 -right-10 material-symbols-outlined text-sam-red text-3xl" data-icon="favorite" data-weight="fill" style="font-variation-settings: 'FILL' 1;">favorite</span>
</div>
</div>
<!-- Action Button -->
<div class="w-full flex justify-center mt-stack-md">
<button class="bg-sam-red text-white font-display-child text-display-child px-12 py-6 rounded-[24px] shadow-[0_8px_0_0_#b7102a] active:shadow-none active:translate-y-2 transition-all hover:scale-105 min-w-[320px] flex items-center justify-center gap-4">
                    Keep going
                    <span class="material-symbols-outlined text-5xl" data-icon="arrow_forward">arrow_forward</span>
</button>
</div>
<!-- Progress Milestone Context -->
<div class="mt-stack-lg flex items-center gap-stack-sm opacity-80 bg-white/50 px-6 py-3 rounded-full border border-sam-gray-light">
<span class="material-symbols-outlined text-sam-teal" data-icon="check_circle">check_circle</span>
<p class="font-caption text-caption text-sam-navy">You just completed the "Number Sense" section!</p>
</div>
</div>
</main>
<!-- Navigation Shell suppressed for transactional focus (Interstitial) -->
<!-- But if required, the BottomNavBar anchor structure would be here as per JSON rules. 
         Rule: "suppress the navigation shell if the page intent is: Success/Confirmation splash screens" -->
<!-- Optional Floating Mascot Accents for "Playful Celebration" -->
<div class="fixed bottom-10 left-10 hidden lg:block transform -rotate-12 group opacity-50">
<div class="bg-sam-orange p-4 rounded-2xl shadow-md text-white font-bold flex items-center gap-2">
<span class="material-symbols-outlined" data-icon="rocket_launch">rocket_launch</span>
            Fast!
        </div>
</div>
<div class="fixed top-20 right-20 hidden lg:block transform rotate-12 group opacity-50">
<div class="bg-sam-teal p-4 rounded-2xl shadow-md text-white font-bold flex items-center gap-2">
<span class="material-symbols-outlined" data-icon="celebration">celebration</span>
            Awesome!
        </div>
</div>
</body></html>
