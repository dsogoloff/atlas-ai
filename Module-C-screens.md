<!-- Module C - 1: 5-8 Welcome -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
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
                    "primary": "#b7102a",
                    "sam-cream": "#FFF8F0",
                    "surface-container-high": "#e0e8ff",
                    "secondary-container": "#ffab69",
                    "on-surface-variant": "#5b403f",
                    "surface": "#f9f9ff",
                    "on-tertiary-fixed-variant": "#5b4300",
                    "on-error-container": "#93000a",
                    "error": "#ba1a1a",
                    "outline-variant": "#e4bebc",
                    "tertiary-container": "#936f03",
                    "on-secondary-container": "#783d01",
                    "sam-navy": "#1B3A6B",
                    "on-background": "#001a40",
                    "surface-container-highest": "#d7e2ff",
                    "surface-dim": "#cadaff",
                    "tertiary-fixed-dim": "#edc157",
                    "on-error": "#ffffff",
                    "inverse-primary": "#ffb3b1",
                    "background": "#f9f9ff",
                    "on-secondary-fixed": "#2f1400",
                    "outline": "#8f6f6e",
                    "surface-container-lowest": "#ffffff",
                    "surface-bright": "#f9f9ff",
                    "on-tertiary-fixed": "#251a00",
                    "primary-fixed-dim": "#ffb3b1",
                    "secondary-fixed-dim": "#ffb780",
                    "sam-red": "#E63946",
                    "on-primary-fixed": "#410007",
                    "surface-tint": "#bb152c",
                    "sam-gray-mid": "#777777",
                    "on-primary-fixed-variant": "#92001c",
                    "on-tertiary": "#ffffff",
                    "surface-variant": "#d7e2ff",
                    "sam-yellow": "#FFD166",
                    "white": "#FFFFFF",
                    "on-secondary": "#ffffff",
                    "sam-orange": "#F4A261",
                    "on-surface": "#001a40",
                    "secondary": "#8e4e14",
                    "primary-fixed": "#ffdad8",
                    "surface-container": "#e8edff",
                    "error-container": "#ffdad6",
                    "on-tertiary-container": "#fffbff",
                    "surface-container-low": "#f1f3ff",
                    "primary-container": "#db313f",
                    "sam-gray-light": "#E5E5E5",
                    "on-primary": "#ffffff",
                    "tertiary-fixed": "#ffdf9b",
                    "inverse-on-surface": "#edf0ff",
                    "secondary-fixed": "#ffdcc4",
                    "inverse-surface": "#0d2f60",
                    "on-secondary-fixed-variant": "#6f3800",
                    "tertiary": "#755700",
                    "sam-gray-dark": "#333333",
                    "sam-teal": "#06A77D",
                    "on-primary-container": "#fffbff"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "stack-md": "16px",
                    "stack-lg": "32px",
                    "report-width": "880px",
                    "margin-tablet": "32px",
                    "unit": "4px",
                    "stack-sm": "8px",
                    "gutter": "24px",
                    "margin-desktop": "40px",
                    "container-max": "1440px"
            },
            "fontFamily": {
                    "math-numeral": ["Plus Jakarta Sans"],
                    "headline-adult": ["Inter"],
                    "body-regular": ["Inter"],
                    "display-child": ["Plus Jakarta Sans"],
                    "caption": ["Inter"]
            },
            "fontSize": {
                    "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                    "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                    "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                    "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                    "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}]
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
        body {
            -webkit-tap-highlight-color: transparent;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen flex flex-col font-body-regular text-on-surface">
<!-- TopAppBar -->
<header class="bg-stone-50 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 shadow-sm dark:shadow-none docked full-width top-0 z-50">
<div class="flex justify-between items-center w-full px-6 h-16">
<button class="flex items-center justify-center p-2 rounded-full hover:bg-red-50 dark:hover:bg-slate-800 transition-colors active:scale-95 duration-150">
<span class="material-symbols-outlined text-red-600 dark:text-red-500" data-icon="menu">menu</span>
</button>
<h1 class="font-['Plus_Jakarta_Sans'] font-bold text-lg text-red-600 dark:text-red-500 tracking-tight">S.A.M. Assessment</h1>
<div class="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border-2 border-white">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="Modern geometric portrait of a young student against a clean blue background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCM3cTRWZPbipRl8yYL6FzGBLSt3510gIDEfYJqCqTjjj_u8vMhl5HwqzOuHFIBVAwBo4Hpd-muTQsTX-wY8V_8loipj7puOO1FbzBbtjhr5a3Zb1ZxVLW4NznpRR4dVT0nr8YeBN4fbpST-Xorfaabf8uNwwAbBwzNqhh_QV-mmsrX1E7MmssmOV-MYUOWZfLZT1ZXJqTjCC7SsZqtoapKfSbXCr-m8-YYRSZVQ_RI5r7cF-NDOyfyfTm8y1H9kSuNlFwji415S_GL"/>
</div>
</div>
</header>
<!-- Main Content Area -->
<main class="flex-1 flex flex-col px-6 pt-8 pb-32 max-w-lg mx-auto w-full">
<!-- Welcome Hero -->
<div class="mb-stack-lg text-center">
<h2 class="font-display-child text-display-child text-sam-navy mb-4">
                Welcome to your mathematical journey, Alex!
            </h2>
<p class="text-body-regular text-on-surface-variant px-4">
                Ready to explore new dimensions? Choose your mission icon to begin.
            </p>
</div>
<!-- Avatar Selection Grid (Bento Style) -->
<div class="grid grid-cols-2 gap-4 mb-stack-lg">
<!-- Rocket - Featured Large -->
<div class="col-span-2 group">
<button class="w-full bg-white p-8 rounded-2xl shadow-[0_4px_12px_rgba(27,58,107,0.08)] border-2 border-transparent hover:border-sam-red transition-all duration-300 flex flex-col items-center text-center active:scale-[0.98]">
<div class="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-100 transition-colors">
<span class="material-symbols-outlined text-sam-red !text-6xl" data-icon="rocket_launch" style="font-variation-settings: 'FILL' 1;">rocket_launch</span>
</div>
<span class="font-display-child text-2xl text-sam-navy">Rocket</span>
<span class="text-caption text-sam-gray-mid">For high-speed learners</span>
</button>
</div>
<!-- Planet -->
<button class="bg-white p-6 rounded-2xl shadow-[0_4px_12px_rgba(27,58,107,0.08)] border-2 border-transparent hover:border-sam-red transition-all duration-300 flex flex-col items-center text-center active:scale-[0.98]">
<div class="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-3">
<span class="material-symbols-outlined text-sam-orange !text-4xl" data-icon="public" style="font-variation-settings: 'FILL' 1;">public</span>
</div>
<span class="font-display-child text-xl text-sam-navy">Planet</span>
</button>
<!-- Star -->
<button class="bg-white p-6 rounded-2xl shadow-[0_4px_12px_rgba(27,58,107,0.08)] border-2 border-transparent hover:border-sam-red transition-all duration-300 flex flex-col items-center text-center active:scale-[0.98]">
<div class="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mb-3">
<span class="material-symbols-outlined text-sam-yellow !text-4xl" data-icon="star" style="font-variation-settings: 'FILL' 1;">star</span>
</div>
<span class="font-display-child text-xl text-sam-navy">Star</span>
</button>
</div>
<!-- Journey Card - Goal Oriented -->
<div class="bg-sam-navy rounded-3xl p-6 text-white mb-stack-lg relative overflow-hidden">
<div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
<div class="relative z-10">
<div class="flex items-center gap-3 mb-2">
<span class="material-symbols-outlined text-sam-yellow" data-icon="auto_awesome">auto_awesome</span>
<span class="uppercase tracking-widest text-[10px] font-bold opacity-80">Next Goal</span>
</div>
<h3 class="font-display-child text-xl mb-1">Master Number Sense</h3>
<p class="text-caption opacity-70 mb-4">Complete 5 challenges to unlock the next level.</p>
<div class="w-full bg-white/20 h-2 rounded-full overflow-hidden">
<div class="bg-sam-yellow h-full w-1/3 rounded-full"></div>
</div>
</div>
</div>
<!-- CTA Action -->
<div class="mt-auto">
<button class="w-full bg-sam-red text-white py-5 rounded-2xl font-display-child text-xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3">
                Begin Journey
                <span class="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 pb-safe bg-white dark:bg-slate-900 border-t border-stone-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-2xl">
<!-- Journey (Active) -->
<a class="flex flex-col items-center justify-center text-red-600 dark:text-red-400 scale-110 transform transition-transform duration-200 ease-out" href="#">
<span class="material-symbols-outlined" data-icon="map" style="font-variation-settings: 'FILL' 1;">map</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Journey</span>
</a>
<!-- Practice -->
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 transition-colors" href="#">
<span class="material-symbols-outlined" data-icon="calculate">calculate</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Practice</span>
</a>
<!-- Reports -->
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 transition-colors" href="#">
<span class="material-symbols-outlined" data-icon="bar_chart">bar_chart</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Reports</span>
</a>
<!-- Settings -->
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 transition-colors" href="#">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Settings</span>
</a>
</nav>
<!-- Visual Polish: Decorative element for bg -->
<div class="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] opacity-40">
<div class="absolute top-[15%] left-[5%] w-24 h-24 bg-sam-orange/10 rounded-full blur-3xl"></div>
<div class="absolute bottom-[25%] right-[5%] w-32 h-32 bg-sam-teal/10 rounded-full blur-3xl"></div>
</div>
</body></html>

<!-- Module C - 2: 5-8 Journey Map -->
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
                        "primary": "#b7102a",
                        "sam-cream": "#FFF8F0",
                        "surface-container-high": "#e0e8ff",
                        "secondary-container": "#ffab69",
                        "on-surface-variant": "#5b403f",
                        "surface": "#f9f9ff",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-error-container": "#93000a",
                        "error": "#ba1a1a",
                        "outline-variant": "#e4bebc",
                        "tertiary-container": "#936f03",
                        "on-secondary-container": "#783d01",
                        "sam-navy": "#1B3A6B",
                        "on-background": "#001a40",
                        "surface-container-highest": "#d7e2ff",
                        "surface-dim": "#cadaff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-error": "#ffffff",
                        "inverse-primary": "#ffb3b1",
                        "background": "#f9f9ff",
                        "on-secondary-fixed": "#2f1400",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "surface-bright": "#f9f9ff",
                        "on-tertiary-fixed": "#251a00",
                        "primary-fixed-dim": "#ffb3b1",
                        "secondary-fixed-dim": "#ffb780",
                        "sam-red": "#E63946",
                        "on-primary-fixed": "#410007",
                        "surface-tint": "#bb152c",
                        "sam-gray-mid": "#777777",
                        "on-primary-fixed-variant": "#92001c",
                        "on-tertiary": "#ffffff",
                        "surface-variant": "#d7e2ff",
                        "sam-yellow": "#FFD166",
                        "white": "#FFFFFF",
                        "on-secondary": "#ffffff",
                        "sam-orange": "#F4A261",
                        "on-surface": "#001a40",
                        "secondary": "#8e4e14",
                        "primary-fixed": "#ffdad8",
                        "surface-container": "#e8edff",
                        "error-container": "#ffdad6",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "primary-container": "#db313f",
                        "sam-gray-light": "#E5E5E5",
                        "on-primary": "#ffffff",
                        "tertiary-fixed": "#ffdf9b",
                        "inverse-on-surface": "#edf0ff",
                        "secondary-fixed": "#ffdcc4",
                        "inverse-surface": "#0d2f60",
                        "on-secondary-fixed-variant": "#6f3800",
                        "tertiary": "#755700",
                        "sam-gray-dark": "#333333",
                        "sam-teal": "#06A77D",
                        "on-primary-container": "#fffbff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "body-regular": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "caption": ["Inter"]
                    }
                }
            }
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .path-curve {
            stroke-dasharray: 1000;
            stroke-dashoffset: 0;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream font-body-regular text-on-surface min-h-screen flex flex-col">
<!-- TopAppBar -->
<header class="bg-stone-50 border-b border-stone-200 shadow-sm flex justify-between items-center w-full px-6 h-16 fixed top-0 z-50">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-slate-600" data-icon="menu">menu</span>
<h1 class="font-['Plus_Jakarta_Sans'] font-bold text-lg text-red-600 tracking-tight">S.A.M. Assessment</h1>
</div>
<div class="w-10 h-10 rounded-full bg-slate-200 border-2 border-white overflow-hidden">
<img alt="User Profile" data-alt="Close up portrait of a smiling young student with glasses against a soft blurred library background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2hpGaRtEpR6EF74fzR2Eo1LnoRyCsBC_AVJ4k_4KHfvwQZkoOnZTC6WXiljPLR32FsF2GoW-oUd8kAHYHikNQO5K6RVJb5TigBtlByEQsud0QIXeUBbBLyiCC03-v8X--3nVSxfMsk4n1i9aYK7w1v1XMLU-2_OsXtg59KN8-BmQIv4wv3x-oN5dxjR1w_IfDwujaPoiMYinJviQGvQbxCdrgrJJIZpgwLJhpO40e70CK78MO0Plt8TpAuY8ZFXQ3D914UbV2cvvV"/>
</div>
</header>
<!-- Main Content: Journey Map -->
<main class="flex-1 mt-16 pb-24 px-6 max-w-md mx-auto w-full flex flex-col items-center justify-center">
<!-- Reward Text Section -->
<div class="text-center mb-8 space-y-2">
<h2 class="font-display-child text-display-child text-sam-navy">Great progress!</h2>
<p class="font-body-regular text-body-regular text-sam-gray-dark">8 questions completed.</p>
</div>
<!-- The Journey Map Canvas -->
<div class="relative w-full aspect-[3/4] bg-white rounded-3xl shadow-[0_4px_12px_rgba(27,58,107,0.08)] overflow-hidden border border-stone-100">
<!-- Background Scenic Elements -->
<div class="absolute inset-0 opacity-20 pointer-events-none">
<img class="w-full h-full object-cover" data-alt="Stylized minimalist mountain range with pine trees under a clear soft sky in morning light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgSgiUZTZfz4_bTnyd1-nA_MVsJBG6y0QRHAGIvjI5oK9jLB5iWrf8dk0cQWjpSZsF_WyOY1nrUzhdld9dV0rD_JBkny5apSK1__vA9q6BA29mUszOwb9KxTGgQ715xstjYWQ0NRH3IhvIjZ6ubH5kV9-LmGhtzW_q1BEEVkkn_EVcWz4V9YfsyNEEIRw-gAXlW-9VE3BsZ1xXSTACb-Si5UCF3LxfvqVTqgwi9LvUgDPdabxg1ifyXJwGE9cJOOUoT_dNSIPKP_Iv"/>
</div>
<!-- Path SVG -->
<svg class="absolute inset-0 w-full h-full p-12" fill="none" viewbox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
<!-- Main Winding Trail -->
<path d="M40 260 C 40 220, 160 220, 160 180 C 160 140, 40 140, 40 100 C 40 60, 160 60, 160 20" stroke="#E5E5E5" stroke-linecap="round" stroke-width="12"></path>
<!-- Completed Progress Path -->
<path d="M40 260 C 40 220, 160 220, 160 180 C 160 160, 100 160, 100 160" stroke="#E63946" stroke-linecap="round" stroke-width="12"></path>
</svg>
<!-- Milestones -->
<!-- Start Milestone (Completed) -->
<div class="absolute left-[40px] bottom-[40px] -translate-x-1/2 translate-y-1/2 flex flex-col items-center">
<div class="w-8 h-8 rounded-full bg-sam-red flex items-center justify-center text-white shadow-lg border-4 border-white">
<span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">check</span>
</div>
<span class="text-[10px] font-bold text-sam-navy mt-1">START</span>
</div>
<!-- Milestone 2 (Completed) -->
<div class="absolute right-[40px] bottom-[120px] translate-x-1/2 translate-y-1/2 flex flex-col items-center">
<div class="w-8 h-8 rounded-full bg-sam-red flex items-center justify-center text-white shadow-lg border-4 border-white">
<span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">check</span>
</div>
<span class="text-[10px] font-bold text-sam-navy mt-1">BASECAMP</span>
</div>
<!-- Current Position Avatar -->
<div class="absolute left-[50%] bottom-[140px] -translate-x-1/2 flex flex-col items-center z-10">
<!-- Sammy Mascot/Avatar Bubble -->
<div class="relative">
<div class="w-16 h-16 rounded-2xl bg-white p-1 shadow-xl border-2 border-sam-red overflow-hidden">
<img class="w-full h-full rounded-xl object-cover" data-alt="A small circular character avatar with a joyful expression moving through a landscape" src="https://lh3.googleusercontent.com/aida-public/AB6AXuANIWAkrH34HUNb0Bi-jdkIe8WyYN4hmAgXaxkjcI6W_Gb3xyRJWZGp0njnJIJ_FsMEGiqgNHAfga0jHNcRYH83BKlEHw1CNNuPm-uayscnp73qn5mDpBI-UfV6XeVQxH9lT62LvGKrqMESBqW-ac_hYmfOOUf0PfQYh2lq5A1zimMsREmTDJ3cDfIGXO_yecW5URoB46UoxtzZu2Hhc21C3wGuj6mPN3k_3Mpd56eSqgryrLMtM1eSGAvvi8v5gSd1LDYPwHU5GGqN"/>
</div>
<!-- Bounce indicator -->
<div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-sam-red rotate-45"></div>
</div>
<div class="mt-4 bg-sam-navy text-white px-3 py-1 rounded-full text-[10px] font-bold">YOU</div>
</div>
<!-- Future Milestone (Upcoming) -->
<div class="absolute left-[40px] top-[100px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-40">
<div class="w-8 h-8 rounded-full bg-stone-300 flex items-center justify-center text-white shadow-sm border-4 border-white">
<span class="material-symbols-outlined text-[16px]">lock</span>
</div>
<span class="text-[10px] font-bold text-sam-gray-mid mt-1">PEAK</span>
</div>
<!-- Goal Milestone -->
<div class="absolute right-[40px] top-[20px] translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-40">
<div class="w-10 h-10 rounded-full bg-sam-yellow flex items-center justify-center text-sam-navy shadow-sm border-4 border-white">
<span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">trophy</span>
</div>
<span class="text-[10px] font-bold text-sam-gray-mid mt-1">FINISH</span>
</div>
</div>
<!-- Action Button -->
<button class="mt-10 w-full py-4 bg-sam-red text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 group">
            Continue Journey
            <span class="material-symbols-outlined group-active:translate-x-1 transition-transform">arrow_forward</span>
</button>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 pb-safe bg-white border-t border-stone-100 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-2xl">
<!-- Journey (Active) -->
<a class="flex flex-col items-center justify-center text-red-600 scale-110" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">map</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Journey</span>
</a>
<!-- Practice -->
<a class="flex flex-col items-center justify-center text-slate-400 hover:text-red-500 transition-colors" href="#">
<span class="material-symbols-outlined">calculate</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Practice</span>
</a>
<!-- Reports -->
<a class="flex flex-col items-center justify-center text-slate-400 hover:text-red-500 transition-colors" href="#">
<span class="material-symbols-outlined">bar_chart</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Reports</span>
</a>
<!-- Settings -->
<a class="flex flex-col items-center justify-center text-slate-400 hover:text-red-500 transition-colors" href="#">
<span class="material-symbols-outlined">settings</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Settings</span>
</a>
</nav>
</body></html>

<!-- Module C - 3: 5-8 MC Journey -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
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
                        "primary": "#b7102a",
                        "sam-cream": "#FFF8F0",
                        "surface-container-high": "#e0e8ff",
                        "secondary-container": "#ffab69",
                        "on-surface-variant": "#5b403f",
                        "surface": "#f9f9ff",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-error-container": "#93000a",
                        "error": "#ba1a1a",
                        "outline-variant": "#e4bebc",
                        "tertiary-container": "#936f03",
                        "on-secondary-container": "#783d01",
                        "sam-navy": "#1B3A6B",
                        "on-background": "#001a40",
                        "surface-container-highest": "#d7e2ff",
                        "surface-dim": "#cadaff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-error": "#ffffff",
                        "inverse-primary": "#ffb3b1",
                        "background": "#f9f9ff",
                        "on-secondary-fixed": "#2f1400",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "surface-bright": "#f9f9ff",
                        "on-tertiary-fixed": "#251a00",
                        "primary-fixed-dim": "#ffb3b1",
                        "secondary-fixed-dim": "#ffb780",
                        "sam-red": "#E63946",
                        "on-primary-fixed": "#410007",
                        "surface-tint": "#bb152c",
                        "sam-gray-mid": "#777777",
                        "on-primary-fixed-variant": "#92001c",
                        "on-tertiary": "#ffffff",
                        "surface-variant": "#d7e2ff",
                        "sam-yellow": "#FFD166",
                        "white": "#FFFFFF",
                        "on-secondary": "#ffffff",
                        "sam-orange": "#F4A261",
                        "on-surface": "#001a40",
                        "secondary": "#8e4e14",
                        "primary-fixed": "#ffdad8",
                        "surface-container": "#e8edff",
                        "error-container": "#ffdad6",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "primary-container": "#db313f",
                        "sam-gray-light": "#E5E5E5",
                        "on-primary": "#ffffff",
                        "tertiary-fixed": "#ffdf9b",
                        "inverse-on-surface": "#edf0ff",
                        "secondary-fixed": "#ffdcc4",
                        "inverse-surface": "#0d2f60",
                        "on-secondary-fixed-variant": "#6f3800",
                        "tertiary": "#755700",
                        "sam-gray-dark": "#333333",
                        "sam-teal": "#06A77D",
                        "on-primary-container": "#fffbff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "stack-md": "16px",
                        "stack-lg": "32px",
                        "report-width": "880px",
                        "margin-tablet": "32px",
                        "unit": "4px",
                        "stack-sm": "8px",
                        "gutter": "24px",
                        "margin-desktop": "40px",
                        "container-max": "1440px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "body-regular": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "caption": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}]
                    }
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .journey-line {
            background-image: radial-gradient(circle, #E5E5E5 2px, transparent 2px);
            background-size: 12px 100%;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen flex flex-col font-body-regular overflow-hidden">
<!-- TopAppBar -->
<header class="bg-stone-50 dark:bg-slate-950 text-red-600 dark:text-red-500 font-['Plus_Jakarta_Sans'] font-bold text-lg docked full-width top-0 border-b border-stone-200 dark:border-slate-800 shadow-sm dark:shadow-none flex justify-between items-center w-full px-6 h-16 shrink-0 z-50">
<div class="flex items-center gap-3">
<button class="material-symbols-outlined text-slate-600 hover:bg-red-50 p-2 rounded-full transition-colors active:scale-95 duration-150">
                close
            </button>
<span class="font-extrabold text-red-600 dark:text-red-500 tracking-tight text-xl">S.A.M. Assessment</span>
</div>
<!-- Journey Map Progress -->
<div class="flex-1 max-w-[200px] mx-4 hidden sm:flex items-center justify-center gap-2">
<div class="h-2 w-full bg-sam-gray-light rounded-full overflow-hidden">
<div class="h-full bg-sam-red w-3/4 rounded-full"></div>
</div>
<span class="text-caption text-sam-navy font-bold">12/15</span>
</div>
<div class="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="friendly cartoon avatar of a young student with a smiling face and colorful background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCK2z9u1wJYZQr2ds24Kosrn7b3KC0B_hsH230AMtDSvYMTzur7MVDszaEaJ0vyT7rofuq8qUWWqat1Br5roFqA0T5gjy_V6Qf88Bbefsvtgd536M8Ouv64jR38WuMA0MrgwYY4CnT1fx_Ier2VoZfTiPK4Qj3b4JFdwoX0KargzcWvFR77MaimVv6hVhcwBY1bhwdXJS1hPSgg6I4GKo-yihXVFnSQ_1jkrUjHj4tMa8Zgfjy3jFRYBD2UNv8eEl5oNsvUBNmWjrWP"/>
</div>
</header>
<!-- Main Assessment Canvas -->
<main class="flex-1 flex flex-col items-center justify-center px-6 py-8 relative">
<!-- Journey Progress (Mobile View) -->
<div class="w-full max-w-md mb-12">
<div class="flex justify-between items-center mb-4 px-2">
<span class="text-caption text-sam-gray-dark font-bold uppercase tracking-wider">Level 4: Subtraction</span>
<span class="text-caption text-sam-red font-extrabold">Quest 12</span>
</div>
<div class="relative h-12 flex items-center px-4">
<div class="absolute left-4 right-4 h-1 bg-sam-gray-light rounded-full"></div>
<div class="absolute left-4 w-[75%] h-1 bg-sam-red rounded-full"></div>
<div class="absolute left-0 right-0 flex justify-between items-center">
<div class="w-8 h-8 rounded-full bg-sam-teal flex items-center justify-center text-white shadow-md z-10">
<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">check</span>
</div>
<div class="w-8 h-8 rounded-full bg-sam-teal flex items-center justify-center text-white shadow-md z-10">
<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">check</span>
</div>
<div class="w-10 h-10 rounded-full bg-white border-4 border-sam-red flex items-center justify-center text-sam-red shadow-lg z-20 scale-110">
<span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">star</span>
</div>
<div class="w-8 h-8 rounded-full bg-sam-gray-light flex items-center justify-center text-sam-gray-mid shadow-sm z-10">
<span class="material-symbols-outlined text-sm">map</span>
</div>
</div>
</div>
</div>
<!-- Question Section -->
<div class="w-full max-w-lg text-center mb-12">
<h2 class="font-display-child text-display-child text-sam-navy mb-4">
                What is 47 - 19?
            </h2>
<div class="h-1.5 w-24 bg-sam-yellow mx-auto rounded-full"></div>
</div>
<!-- Multiple Choice Grid -->
<div class="grid grid-cols-2 gap-4 w-full max-w-md">
<!-- Option 1 -->
<button class="bg-white group relative aspect-square rounded-3xl border-2 border-sam-gray-light flex flex-col items-center justify-center shadow-[0_4px_12px_rgba(27,58,107,0.08)] hover:border-sam-red transition-all duration-200 active:scale-95">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-red">26</span>
<div class="absolute bottom-4 right-4 w-6 h-6 rounded-full border-2 border-sam-gray-light group-hover:border-sam-red flex items-center justify-center transition-colors">
<div class="w-3 h-3 rounded-full bg-sam-red scale-0 group-hover:scale-100 transition-transform"></div>
</div>
</button>
<!-- Option 2 (Correct/Selected Active State Example) -->
<button class="bg-white group relative aspect-square rounded-3xl border-4 border-sam-red flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all">
<span class="font-math-numeral text-math-numeral text-sam-red">28</span>
<div class="absolute bottom-4 right-4 w-6 h-6 rounded-full border-2 border-sam-red flex items-center justify-center bg-sam-red">
<span class="material-symbols-outlined text-white text-sm" style="font-variation-settings: 'FILL' 1;">check</span>
</div>
</button>
<!-- Option 3 -->
<button class="bg-white group relative aspect-square rounded-3xl border-2 border-sam-gray-light flex flex-col items-center justify-center shadow-[0_4px_12px_rgba(27,58,107,0.08)] hover:border-sam-red transition-all duration-200 active:scale-95">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-red">32</span>
<div class="absolute bottom-4 right-4 w-6 h-6 rounded-full border-2 border-sam-gray-light group-hover:border-sam-red flex items-center justify-center transition-colors">
<div class="w-3 h-3 rounded-full bg-sam-red scale-0 group-hover:scale-100 transition-transform"></div>
</div>
</button>
<!-- Option 4 -->
<button class="bg-white group relative aspect-square rounded-3xl border-2 border-sam-gray-light flex flex-col items-center justify-center shadow-[0_4px_12px_rgba(27,58,107,0.08)] hover:border-sam-red transition-all duration-200 active:scale-95">
<span class="font-math-numeral text-math-numeral text-sam-navy group-hover:text-sam-red">38</span>
<div class="absolute bottom-4 right-4 w-6 h-6 rounded-full border-2 border-sam-gray-light group-hover:border-sam-red flex items-center justify-center transition-colors">
<div class="w-3 h-3 rounded-full bg-sam-red scale-0 group-hover:scale-100 transition-transform"></div>
</div>
</button>
</div>
</main>
<!-- Bottom Action Bar (Contextual FAB / Continue) -->
<div class="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-sam-cream via-sam-cream/90 to-transparent flex justify-center items-end pointer-events-none">
<button class="bg-sam-red text-white w-full max-w-md py-5 rounded-[20px] font-bold text-lg shadow-[0_8px_0_#b7102a] active:shadow-none active:translate-y-2 transition-all pointer-events-auto flex items-center justify-center gap-3">
            Check Answer
            <span class="material-symbols-outlined">arrow_forward</span>
</button>
</div>
<!-- Persistent Bottom Nav (Suppressed for focused assessment as per "The Destination Rule" - only used when not in a task) -->
<!-- But provided here for structural adherence to the JSON if it were a top-level screen -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 pb-safe bg-white dark:bg-slate-900 border-t border-stone-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-2xl hidden">
<div class="flex flex-col items-center justify-center text-red-600 dark:text-red-400 scale-110 font-['Plus_Jakarta_Sans'] text-[12px] font-medium">
<span class="material-symbols-outlined" data-icon="map" style="font-variation-settings: 'FILL' 1;">map</span>
<span>Journey</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-['Plus_Jakarta_Sans'] text-[12px] font-medium">
<span class="material-symbols-outlined" data-icon="calculate">calculate</span>
<span>Practice</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-['Plus_Jakarta_Sans'] text-[12px] font-medium">
<span class="material-symbols-outlined" data-icon="bar_chart">bar_chart</span>
<span>Reports</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-['Plus_Jakarta_Sans'] text-[12px] font-medium">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
<span>Settings</span>
</div>
</nav>
</body></html>

<!-- Module C - 4: 5-8 Numeric Journey -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
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
                        "primary": "#b7102a",
                        "sam-cream": "#FFF8F0",
                        "surface-container-high": "#e0e8ff",
                        "secondary-container": "#ffab69",
                        "on-surface-variant": "#5b403f",
                        "surface": "#f9f9ff",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-error-container": "#93000a",
                        "error": "#ba1a1a",
                        "outline-variant": "#e4bebc",
                        "tertiary-container": "#936f03",
                        "on-secondary-container": "#783d01",
                        "sam-navy": "#1B3A6B",
                        "on-background": "#001a40",
                        "surface-container-highest": "#d7e2ff",
                        "surface-dim": "#cadaff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-error": "#ffffff",
                        "inverse-primary": "#ffb3b1",
                        "background": "#f9f9ff",
                        "on-secondary-fixed": "#2f1400",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "surface-bright": "#f9f9ff",
                        "on-tertiary-fixed": "#251a00",
                        "primary-fixed-dim": "#ffb3b1",
                        "secondary-fixed-dim": "#ffb780",
                        "sam-red": "#E63946",
                        "on-primary-fixed": "#410007",
                        "surface-tint": "#bb152c",
                        "sam-gray-mid": "#777777",
                        "on-primary-fixed-variant": "#92001c",
                        "on-tertiary": "#ffffff",
                        "surface-variant": "#d7e2ff",
                        "sam-yellow": "#FFD166",
                        "white": "#FFFFFF",
                        "on-secondary": "#ffffff",
                        "sam-orange": "#F4A261",
                        "on-surface": "#001a40",
                        "secondary": "#8e4e14",
                        "primary-fixed": "#ffdad8",
                        "surface-container": "#e8edff",
                        "error-container": "#ffdad6",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "primary-container": "#db313f",
                        "sam-gray-light": "#E5E5E5",
                        "on-primary": "#ffffff",
                        "tertiary-fixed": "#ffdf9b",
                        "inverse-on-surface": "#edf0ff",
                        "secondary-fixed": "#ffdcc4",
                        "inverse-surface": "#0d2f60",
                        "on-secondary-fixed-variant": "#6f3800",
                        "tertiary": "#755700",
                        "sam-gray-dark": "#333333",
                        "sam-teal": "#06A77D",
                        "on-primary-container": "#fffbff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "body-regular": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "caption": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}]
                    }
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .journey-line {
            background-image: repeating-linear-gradient(90deg, #E63946 0, #E63946 8px, transparent 8px, transparent 16px);
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen flex flex-col font-body-regular overflow-hidden select-none">
<!-- TopAppBar - Journey Progress Variant -->
<header class="bg-stone-50 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 shadow-sm dark:shadow-none docked full-width top-0 flex justify-between items-center w-full px-6 h-16 z-50">
<div class="flex items-center gap-3">
<button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-slate-800 transition-colors active:scale-95 duration-150 text-slate-600 dark:text-slate-400">
<span class="material-symbols-outlined">close</span>
</button>
</div>
<!-- Journey Map Progress Indicator -->
<div class="flex-1 px-4 flex items-center justify-center">
<div class="relative w-full max-w-[200px] h-6 flex items-center justify-between">
<div class="absolute inset-0 top-1/2 -translate-y-1/2 h-1 w-full bg-sam-gray-light rounded-full"></div>
<div class="absolute inset-0 top-1/2 -translate-y-1/2 h-1 w-[60%] bg-sam-red rounded-full"></div>
<!-- Journey Dots -->
<div class="relative z-10 w-4 h-4 bg-sam-red rounded-full ring-4 ring-sam-cream shadow-sm"></div>
<div class="relative z-10 w-4 h-4 bg-sam-red rounded-full ring-4 ring-sam-cream shadow-sm"></div>
<div class="relative z-10 w-6 h-6 bg-white border-2 border-sam-red rounded-full flex items-center justify-center shadow-md">
<div class="w-2.5 h-2.5 bg-sam-red rounded-full"></div>
</div>
<div class="relative z-10 w-4 h-4 bg-sam-gray-light rounded-full ring-4 ring-sam-cream shadow-sm"></div>
<div class="relative z-10 w-4 h-4 bg-sam-gray-light rounded-full ring-4 ring-sam-cream shadow-sm"></div>
</div>
</div>
<div class="flex items-center gap-3">
<div class="bg-sam-yellow px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-orange-200">
<span class="material-symbols-outlined text-sm font-bold" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="font-display-child text-sm font-bold text-sam-navy">120</span>
</div>
</div>
</header>
<!-- Main Assessment Canvas -->
<main class="flex-1 flex flex-col items-center justify-start p-6 pt-10">
<!-- Story Problem Card -->
<div class="w-full max-w-md bg-white rounded-[24px] p-8 shadow-[0_4px_12px_rgba(27,58,107,0.08)] border border-stone-100 flex flex-col gap-6">
<div class="flex items-start gap-4">
<div class="bg-sam-cream p-3 rounded-2xl">
<span class="material-symbols-outlined text-sam-red text-3xl">auto_stories</span>
</div>
<div class="flex-1">
<h1 class="font-display-child text-headline-adult text-sam-navy leading-tight mb-2">Sticker Party!</h1>
<p class="font-body-regular text-lg text-sam-gray-dark">Maya has <span class="font-bold text-sam-red underline decoration-2 underline-offset-4">24 stickers</span>. She gives 9 stickers to her friend Leo. How many stickers does Maya have left?</p>
</div>
</div>
<!-- Answer Display Area -->
<div class="mt-4 flex flex-col items-center justify-center py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-sam-gray-light">
<div class="flex items-end gap-3">
<div class="w-20 h-24 bg-white border-4 border-sam-red rounded-xl flex items-center justify-center shadow-lg">
<span class="font-display-child text-5xl text-sam-navy">1</span>
</div>
<div class="w-20 h-24 bg-white border-4 border-sam-red rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden">
<div class="absolute bottom-0 w-full h-1.5 bg-sam-red/10 animate-pulse"></div>
<span class="font-display-child text-5xl text-sam-navy">5</span>
</div>
<div class="pb-4">
<span class="font-display-child text-2xl text-sam-gray-mid">stickers</span>
</div>
</div>
</div>
</div>
</main>
<!-- Large Numeric Keypad - Assessment Optimized -->
<section class="w-full bg-white rounded-t-[32px] shadow-[0_-10px_30px_rgba(27,58,107,0.12)] p-6 pb-10">
<div class="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto">
<!-- Numbers 1-9 -->
<button class="h-20 bg-sam-cream hover:bg-stone-100 active:scale-95 transition-all rounded-2xl flex items-center justify-center group">
<span class="font-display-child text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">1</span>
</button>
<button class="h-20 bg-sam-cream hover:bg-stone-100 active:scale-95 transition-all rounded-2xl flex items-center justify-center group">
<span class="font-display-child text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">2</span>
</button>
<button class="h-20 bg-sam-cream hover:bg-stone-100 active:scale-95 transition-all rounded-2xl flex items-center justify-center group">
<span class="font-display-child text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">3</span>
</button>
<button class="h-20 bg-sam-cream hover:bg-stone-100 active:scale-95 transition-all rounded-2xl flex items-center justify-center group">
<span class="font-display-child text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">4</span>
</button>
<button class="h-20 bg-sam-cream hover:bg-stone-100 active:scale-95 transition-all rounded-2xl flex items-center justify-center group">
<span class="font-display-child text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">5</span>
</button>
<button class="h-20 bg-sam-cream hover:bg-stone-100 active:scale-95 transition-all rounded-2xl flex items-center justify-center group">
<span class="font-display-child text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">6</span>
</button>
<button class="h-20 bg-sam-cream hover:bg-stone-100 active:scale-95 transition-all rounded-2xl flex items-center justify-center group">
<span class="font-display-child text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">7</span>
</button>
<button class="h-20 bg-sam-cream hover:bg-stone-100 active:scale-95 transition-all rounded-2xl flex items-center justify-center group">
<span class="font-display-child text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">8</span>
</button>
<button class="h-20 bg-sam-cream hover:bg-stone-100 active:scale-95 transition-all rounded-2xl flex items-center justify-center group">
<span class="font-display-child text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">9</span>
</button>
<!-- Bottom Row -->
<button class="h-20 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all rounded-2xl flex items-center justify-center">
<span class="material-symbols-outlined text-sam-gray-dark text-3xl">backspace</span>
</button>
<button class="h-20 bg-sam-cream hover:bg-stone-100 active:scale-95 transition-all rounded-2xl flex items-center justify-center group">
<span class="font-display-child text-math-numeral text-sam-navy group-hover:text-sam-red transition-colors">0</span>
</button>
<button class="h-20 bg-sam-red hover:bg-red-700 active:scale-95 transition-all rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
<span class="material-symbols-outlined text-white text-4xl" style="font-variation-settings: 'wght' 700;">check</span>
</button>
</div>
</section>
<!-- Decorative Illustration Backgrounds (Subtle) -->
<div class="fixed top-20 right-[-50px] opacity-10 pointer-events-none rotate-12">
<img alt="abstract mathematical symbols and numbers floating in 3D space with soft shadows" class="w-40 h-40" data-alt="playful scattered numbers and math symbols floating in 3D space with soft shadows and child friendly aesthetic" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9oqgqv-Q7X5wcRyzNteIjERR4Y4EcOlj0XcONo7eLxOMoLa5ZvLEB5uxTstoLcpLUNQJ9WGKOnjrS0lDldQWRNtUcjR0Xf0tTGl5PPK8nXRX0JzOOT89RaX-IthoxOf8A76BPCxlpcJhjtnvfXtoIRy6VXYNYCV3ieGYVGA66MwLGmSNoVoRExrtW-2KZ24U0MkZGvj2107hs_pbxKG5aHkV08FNFoWWCYecYQHm0dkQ3WRi8N6sAZcrVKFpeEtTWZrx7_uYyfSZu"/>
</div>
<div class="fixed bottom-40 left-[-30px] opacity-10 pointer-events-none -rotate-12">
<img alt="glowing yellow stars and sparkles with soft rounded edges" class="w-32 h-32" data-alt="glowing yellow stars and magic sparkles with soft rounded edges in a playful educational style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCY-3KjsQtddcDGhEjIj2IXBOsZrsoLyYdkWWPyeSRr2szhNSfxa7CM4f9tL0ruvjC1NUCYzMelTily8B9AHdn4_Jr4Myr24ihZ2CvV605WU1kCBTwDQegYWwvy6T_KeM5zlReCFkAXyW2tYq93Ij2T1e6gkmsFdpSsTzGgs1ktgj-LcHjBwZcCZ53UkYJXjoKL-dtWVuIkuZiUENB4ec_0A3zWu5p5Gz-JJPbZEIEw0aQPM6O-xyzefUVxNRqOJBIAY3UEHijch38"/>
</div>
</body></html>

<!-- Module C - 5: 5-8 Drag & Drop Journey -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>S.A.M. Assessment - Journey</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:wght@600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "primary": "#b7102a",
                        "sam-cream": "#FFF8F0",
                        "surface-container-high": "#e0e8ff",
                        "secondary-container": "#ffab69",
                        "on-surface-variant": "#5b403f",
                        "surface": "#f9f9ff",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-error-container": "#93000a",
                        "error": "#ba1a1a",
                        "outline-variant": "#e4bebc",
                        "tertiary-container": "#936f03",
                        "on-secondary-container": "#783d01",
                        "sam-navy": "#1B3A6B",
                        "on-background": "#001a40",
                        "surface-container-highest": "#d7e2ff",
                        "surface-dim": "#cadaff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-error": "#ffffff",
                        "inverse-primary": "#ffb3b1",
                        "background": "#f9f9ff",
                        "on-secondary-fixed": "#2f1400",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "surface-bright": "#f9f9ff",
                        "on-tertiary-fixed": "#251a00",
                        "primary-fixed-dim": "#ffb3b1",
                        "secondary-fixed-dim": "#ffb780",
                        "sam-red": "#E63946",
                        "on-primary-fixed": "#410007",
                        "surface-tint": "#bb152c",
                        "sam-gray-mid": "#777777",
                        "on-primary-fixed-variant": "#92001c",
                        "on-tertiary": "#ffffff",
                        "surface-variant": "#d7e2ff",
                        "sam-yellow": "#FFD166",
                        "white": "#FFFFFF",
                        "on-secondary": "#ffffff",
                        "sam-orange": "#F4A261",
                        "on-surface": "#001a40",
                        "secondary": "#8e4e14",
                        "primary-fixed": "#ffdad8",
                        "surface-container": "#e8edff",
                        "error-container": "#ffdad6",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "primary-container": "#db313f",
                        "sam-gray-light": "#E5E5E5",
                        "on-primary": "#ffffff",
                        "tertiary-fixed": "#ffdf9b",
                        "inverse-on-surface": "#edf0ff",
                        "secondary-fixed": "#ffdcc4",
                        "inverse-surface": "#0d2f60",
                        "on-secondary-fixed-variant": "#6f3800",
                        "tertiary": "#755700",
                        "sam-gray-dark": "#333333",
                        "sam-teal": "#06A77D",
                        "on-primary-container": "#fffbff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "body-regular": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "caption": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}]
                    }
                }
            }
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .journey-line {
            background-image: radial-gradient(circle, #E5E5E5 2px, transparent 2px);
            background-size: 12px 12px;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen flex flex-col font-body-regular">
<!-- TopAppBar Shell -->
<header class="bg-stone-50 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 shadow-sm dark:shadow-none flex justify-between items-center w-full px-6 h-16 sticky top-0 z-50">
<div class="flex items-center gap-4">
<span class="material-symbols-outlined text-red-600 dark:text-red-500 cursor-pointer transition-transform active:scale-95 duration-150">menu</span>
<h1 class="font-['Plus_Jakarta_Sans'] font-bold text-lg text-red-600 dark:text-red-500 tracking-tight">S.A.M. Assessment</h1>
</div>
<div class="h-10 w-10 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="Stylized avatar of a friendly student with short dark hair and a bright smile on a clean background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBY8R5LeN3rkztxat1pOQ8gMRlL6aToNqDHnNxsvzdCIEsuYX6PH5wdUtiR6-p6J2CzplZUW9yPDZchVcLaRO92Yn6k4S4Ost-__Jqq7Rb93RaOQaqjGrLGbZqMBbRGbPU-waH17VTSVQvkw1hvGlXNze_Jr3hOXCqyrDpxL5EnUK3_un2SoJnrpx85i9p44EB8q_HmdmPVlPfF0i5zPLkf9k5TiWL0xxHxcYnTCntLn87hxgDNof8PtuP-DH5dGLCb8wmbsUjq5Dm7"/>
</div>
</header>
<!-- Journey Progress Header (Contextual Addition) -->
<div class="bg-white px-6 py-4 flex flex-col gap-3 shadow-sm relative overflow-hidden">
<div class="flex justify-between items-center z-10">
<span class="text-caption font-semibold text-sam-navy">Level 4: Additive Logic</span>
<span class="text-caption font-bold text-sam-red">Stage 8/12</span>
</div>
<div class="relative h-4 w-full bg-sam-gray-light rounded-full z-10">
<div class="absolute top-0 left-0 h-full w-[66%] bg-sam-red rounded-full shadow-[0_0_8px_rgba(230,57,70,0.4)]"></div>
<!-- Journey Dots -->
<div class="absolute inset-0 flex justify-between items-center px-1">
<div class="w-2 h-2 rounded-full bg-white opacity-50"></div>
<div class="w-2 h-2 rounded-full bg-white opacity-50"></div>
<div class="w-2 h-2 rounded-full bg-white opacity-50"></div>
<div class="w-2 h-2 rounded-full bg-white opacity-50"></div>
<div class="w-2 h-2 rounded-full bg-white opacity-50"></div>
</div>
</div>
</div>
<!-- Main Content Canvas -->
<main class="flex-grow flex flex-col items-center justify-center p-6 mb-20">
<div class="w-full max-w-md flex flex-col gap-8">
<!-- Instruction Text -->
<div class="text-center">
<h2 class="font-display-child text-display-child text-sam-navy mb-2">Fill the Bar</h2>
<p class="text-body-regular text-sam-gray-dark">Drag the correct number into the missing piece.</p>
</div>
<!-- Bar Model Section -->
<div class="flex flex-col gap-2 w-full">
<!-- Total Bar (30) -->
<div class="w-full h-16 bg-sam-navy rounded-xl flex items-center justify-center shadow-lg transform transition-all">
<span class="font-math-numeral text-math-numeral text-white">30</span>
</div>
<!-- Parts Bar (12 + ?) -->
<div class="flex gap-2 h-24">
<!-- Known Part -->
<div class="w-[40%] bg-white border-2 border-sam-gray-light rounded-xl flex items-center justify-center shadow-sm">
<span class="font-math-numeral text-math-numeral text-sam-navy">12</span>
</div>
<!-- Drop Target -->
<div class="flex-grow bg-sam-cream border-2 border-dashed border-sam-gray-mid rounded-xl flex items-center justify-center relative overflow-hidden group">
<div class="absolute inset-0 bg-white opacity-40"></div>
<span class="material-symbols-outlined text-sam-gray-mid text-4xl opacity-50">add_circle</span>
</div>
</div>
</div>
<!-- Draggable Number Tiles (Options) -->
<div class="grid grid-cols-2 gap-4 mt-4">
<div class="aspect-square bg-white border-2 border-sam-gray-light rounded-2xl flex items-center justify-center shadow-sm active:scale-95 active:border-sam-red transition-all cursor-pointer group">
<span class="font-math-numeral text-math-numeral text-sam-navy group-active:text-sam-red">15</span>
</div>
<div class="aspect-square bg-white border-2 border-sam-red rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer group ring-4 ring-sam-red/10">
<span class="font-math-numeral text-math-numeral text-sam-navy group-active:text-sam-red">18</span>
</div>
<div class="aspect-square bg-white border-2 border-sam-gray-light rounded-2xl flex items-center justify-center shadow-sm active:scale-95 active:border-sam-red transition-all cursor-pointer group">
<span class="font-math-numeral text-math-numeral text-sam-navy group-active:text-sam-red">20</span>
</div>
<div class="aspect-square bg-white border-2 border-sam-gray-light rounded-2xl flex items-center justify-center shadow-sm active:scale-95 active:border-sam-red transition-all cursor-pointer group">
<span class="font-math-numeral text-math-numeral text-sam-navy group-active:text-sam-red">22</span>
</div>
</div>
</div>
</main>
<!-- BottomNavBar Shell -->
<nav class="bg-white dark:bg-slate-900 fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 pb-safe border-t border-stone-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-2xl">
<!-- Journey Tab (Active) -->
<a class="flex flex-col items-center justify-center text-red-600 dark:text-red-400 scale-110 transform transition-transform duration-200 ease-out font-['Plus_Jakarta_Sans'] text-[12px] font-medium" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">map</span>
<span>Journey</span>
</a>
<!-- Practice Tab -->
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 transition-colors font-['Plus_Jakarta_Sans'] text-[12px] font-medium" href="#">
<span class="material-symbols-outlined">calculate</span>
<span>Practice</span>
</a>
<!-- Reports Tab -->
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 transition-colors font-['Plus_Jakarta_Sans'] text-[12px] font-medium" href="#">
<span class="material-symbols-outlined">bar_chart</span>
<span>Reports</span>
</a>
<!-- Settings Tab -->
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 transition-colors font-['Plus_Jakarta_Sans'] text-[12px] font-medium" href="#">
<span class="material-symbols-outlined">settings</span>
<span>Settings</span>
</a>
</nav>
<!-- Floating Action Background Decorative Elements -->
<div class="fixed top-24 -left-12 w-48 h-48 bg-sam-yellow opacity-10 rounded-full blur-3xl pointer-events-none"></div>
<div class="fixed bottom-32 -right-12 w-64 h-64 bg-sam-orange opacity-10 rounded-full blur-3xl pointer-events-none"></div>
</body></html>

<!-- Module C - 6: 5-8 Coordinate Geometry -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
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
                        "primary": "#b7102a",
                        "sam-cream": "#FFF8F0",
                        "surface-container-high": "#e0e8ff",
                        "secondary-container": "#ffab69",
                        "on-surface-variant": "#5b403f",
                        "surface": "#f9f9ff",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-error-container": "#93000a",
                        "error": "#ba1a1a",
                        "outline-variant": "#e4bebc",
                        "tertiary-container": "#936f03",
                        "on-secondary-container": "#783d01",
                        "sam-navy": "#1B3A6B",
                        "on-background": "#001a40",
                        "surface-container-highest": "#d7e2ff",
                        "surface-dim": "#cadaff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-error": "#ffffff",
                        "inverse-primary": "#ffb3b1",
                        "background": "#f9f9ff",
                        "on-secondary-fixed": "#2f1400",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "surface-bright": "#f9f9ff",
                        "on-tertiary-fixed": "#251a00",
                        "primary-fixed-dim": "#ffb3b1",
                        "secondary-fixed-dim": "#ffb780",
                        "sam-red": "#E63946",
                        "on-primary-fixed": "#410007",
                        "surface-tint": "#bb152c",
                        "sam-gray-mid": "#777777",
                        "on-primary-fixed-variant": "#92001c",
                        "on-tertiary": "#ffffff",
                        "surface-variant": "#d7e2ff",
                        "sam-yellow": "#FFD166",
                        "white": "#FFFFFF",
                        "on-secondary": "#ffffff",
                        "sam-orange": "#F4A261",
                        "on-surface": "#001a40",
                        "secondary": "#8e4e14",
                        "primary-fixed": "#ffdad8",
                        "surface-container": "#e8edff",
                        "error-container": "#ffdad6",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "primary-container": "#db313f",
                        "sam-gray-light": "#E5E5E5",
                        "on-primary": "#ffffff",
                        "tertiary-fixed": "#ffdf9b",
                        "inverse-on-surface": "#edf0ff",
                        "secondary-fixed": "#ffdcc4",
                        "inverse-surface": "#0d2f60",
                        "on-secondary-fixed-variant": "#6f3800",
                        "tertiary": "#755700",
                        "sam-gray-dark": "#333333",
                        "sam-teal": "#06A77D",
                        "on-primary-container": "#fffbff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "body-regular": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "caption": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}]
                    }
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .coordinate-grid {
            background-image: 
                linear-gradient(to right, #E5E5E5 1px, transparent 1px),
                linear-gradient(to bottom, #E5E5E5 1px, transparent 1px);
            background-size: 40px 40px;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen font-body-regular text-on-surface">
<!-- TopAppBar -->
<header class="bg-stone-50 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 shadow-sm dark:shadow-none docked full-width top-0 z-50">
<div class="flex justify-between items-center w-full px-6 h-16">
<div class="flex items-center gap-4">
<button class="text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors rounded-full p-2">
<span class="material-symbols-outlined" data-icon="menu">menu</span>
</button>
<h1 class="font-['Plus_Jakarta_Sans'] font-bold text-lg text-slate-600">S.A.M. Assessment</h1>
</div>
<!-- Journey Map Progress Integration -->
<div class="hidden sm:flex items-center gap-2">
<div class="flex items-center">
<div class="w-6 h-6 rounded-full bg-sam-teal flex items-center justify-center text-white text-[10px] font-bold">1</div>
<div class="w-8 h-1 bg-sam-teal"></div>
<div class="w-8 h-8 rounded-full border-4 border-sam-teal bg-white flex items-center justify-center text-sam-teal text-xs font-bold">2</div>
<div class="w-8 h-1 bg-sam-gray-light"></div>
<div class="w-6 h-6 rounded-full bg-sam-gray-light"></div>
</div>
</div>
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border-2 border-white">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="minimalist user avatar icon with a soft blue circular background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuALhWkLgSMHXpJH48-x6_T1y6Mri24s99gayMLE5nin5_WLDlHaya7hC6J60Hjnk_nAgBTFZuMrbpvG_FgybJVTslJr4Li9Yt7srVmt4K0kJgki4_6atHtLemuXvNdg-Y9tmCuEjX9wt7HZNA1Capg-uq9GJeCPxCoUbzqaTWSmMD3cLktGsuYgoWGF1_v0MXqYoMuswmt2jce8dOVq_7LuM0cg3sBd0IJTfJSJFIuQJvMbBOAB9hfRKtbpvEoRoSowBWYqOMSuRFar"/>
</div>
</div>
</div>
</header>
<!-- Main Content Canvas -->
<main class="pt-20 pb-28 px-4 flex flex-col items-center max-w-report-width mx-auto">
<!-- Instruction Section -->
<div class="w-full mb-8 text-center sm:text-left">
<h2 class="font-display-child text-display-child text-sam-navy mb-4">Plot the point (3, 5)</h2>
<p class="font-body-regular text-body-regular text-sam-gray-dark">Tap the intersection on the grid where x = 3 and y = 5 to place your marker.</p>
</div>
<!-- Coordinate Geometry Interaction Area -->
<div class="w-full max-w-[500px] aspect-square bg-white rounded-xl shadow-lg relative p-8 border-2 border-sam-gray-light">
<!-- Y-Axis Label -->
<div class="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 font-math-numeral text-caption text-sam-gray-mid">Y - AXIS</div>
<!-- X-Axis Label -->
<div class="absolute bottom-2 left-1/2 -translate-x-1/2 font-math-numeral text-caption text-sam-gray-mid">X - AXIS</div>
<!-- Grid Container -->
<div class="w-full h-full border-l-4 border-b-4 border-sam-navy relative coordinate-grid">
<!-- Y-Axis Numerals -->
<div class="absolute -left-8 top-0 h-full flex flex-col-reverse justify-between py-0 text-sam-navy font-math-numeral text-xs">
<span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
</div>
<!-- X-Axis Numerals -->
<div class="absolute left-0 -bottom-8 w-full flex justify-between px-0 text-sam-navy font-math-numeral text-xs">
<span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
</div>
<!-- Ghost Marker (Hint or Active Interaction State) -->
<!-- x=3, y=5. Each grid cell is roughly 1/8 of width. Adjusting for 0-8 scale -->
<div class="absolute bottom-[62.5%] left-[37.5%] -translate-x-1/2 translate-y-1/2 w-10 h-10 flex items-center justify-center">
<div class="w-4 h-4 bg-sam-red rounded-full ring-4 ring-red-100 animate-pulse"></div>
</div>
<!-- Grid Interaction Overlay (Transparent targets) -->
<div class="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-0">
<!-- Example of a few touch targets -->
<div class="cursor-pointer hover:bg-sam-red/10 transition-colors"></div>
<div class="cursor-pointer hover:bg-sam-red/10 transition-colors"></div>
<!-- This would be the interactive mapping logic in a real app -->
</div>
</div>
</div>
<!-- Action Section -->
<div class="mt-10 w-full flex justify-center">
<button class="bg-sam-red text-white font-headline-adult text-body-regular py-4 px-12 rounded-2xl shadow-md hover:scale-105 active:scale-95 transition-transform duration-150 flex items-center gap-2">
                Continue
                <span class="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
</div>
<!-- Journey Visualization (Mobile Bottom Context) -->
<div class="mt-12 p-6 bg-white/50 rounded-2xl border border-sam-gray-light w-full">
<div class="flex items-center justify-between mb-4">
<span class="text-xs font-bold text-sam-navy uppercase tracking-widest">Journey Progress</span>
<span class="text-xs font-bold text-sam-teal">Level 4: Geometry</span>
</div>
<div class="relative h-4 bg-sam-gray-light rounded-full overflow-hidden">
<div class="absolute left-0 top-0 h-full bg-sam-teal w-2/3 rounded-full"></div>
<div class="absolute left-2/3 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border-4 border-sam-teal rounded-full shadow-sm"></div>
</div>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 pb-safe bg-white dark:bg-slate-900 border-t border-stone-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-2xl">
<a class="flex flex-col items-center justify-center text-red-600 dark:text-red-400 scale-110 transform transition-transform duration-200 ease-out" href="#">
<span class="material-symbols-outlined text-2xl" data-icon="map" style="font-variation-settings: 'FILL' 1;">map</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Journey</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 transition-colors" href="#">
<span class="material-symbols-outlined text-2xl" data-icon="calculate">calculate</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Practice</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 transition-colors" href="#">
<span class="material-symbols-outlined text-2xl" data-icon="bar_chart">bar_chart</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Reports</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 transition-colors" href="#">
<span class="material-symbols-outlined text-2xl" data-icon="settings">settings</span>
<span class="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">Settings</span>
</a>
</nav>
</body></html>

<!-- Module C - 7: 5-8 Fraction Visualizer -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
<title>S.A.M. Assessment - Fraction Visualizer</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:wght@500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48;
        }
        body {
            -webkit-tap-highlight-color: transparent;
        }
        .fraction-segment {
            transition: all 0.2s ease-in-out;
        }
    </style>
<script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "primary": "#b7102a",
                      "sam-cream": "#FFF8F0",
                      "surface-container-high": "#e0e8ff",
                      "secondary-container": "#ffab69",
                      "on-surface-variant": "#5b403f",
                      "surface": "#f9f9ff",
                      "on-tertiary-fixed-variant": "#5b4300",
                      "on-error-container": "#93000a",
                      "error": "#ba1a1a",
                      "outline-variant": "#e4bebc",
                      "tertiary-container": "#936f03",
                      "on-secondary-container": "#783d01",
                      "sam-navy": "#1B3A6B",
                      "on-background": "#001a40",
                      "surface-container-highest": "#d7e2ff",
                      "surface-dim": "#cadaff",
                      "tertiary-fixed-dim": "#edc157",
                      "on-error": "#ffffff",
                      "inverse-primary": "#ffb3b1",
                      "background": "#f9f9ff",
                      "on-secondary-fixed": "#2f1400",
                      "outline": "#8f6f6e",
                      "surface-container-lowest": "#ffffff",
                      "surface-bright": "#f9f9ff",
                      "on-tertiary-fixed": "#251a00",
                      "primary-fixed-dim": "#ffb3b1",
                      "secondary-fixed-dim": "#ffb780",
                      "sam-red": "#E63946",
                      "on-primary-fixed": "#410007",
                      "surface-tint": "#bb152c",
                      "sam-gray-mid": "#777777",
                      "on-primary-fixed-variant": "#92001c",
                      "on-tertiary": "#ffffff",
                      "surface-variant": "#d7e2ff",
                      "sam-yellow": "#FFD166",
                      "white": "#FFFFFF",
                      "on-secondary": "#ffffff",
                      "sam-orange": "#F4A261",
                      "on-surface": "#001a40",
                      "secondary": "#8e4e14",
                      "primary-fixed": "#ffdad8",
                      "surface-container": "#e8edff",
                      "error-container": "#ffdad6",
                      "on-tertiary-container": "#fffbff",
                      "surface-container-low": "#f1f3ff",
                      "primary-container": "#db313f",
                      "sam-gray-light": "#E5E5E5",
                      "on-primary": "#ffffff",
                      "tertiary-fixed": "#ffdf9b",
                      "inverse-on-surface": "#edf0ff",
                      "secondary-fixed": "#ffdcc4",
                      "inverse-surface": "#0d2f60",
                      "on-secondary-fixed-variant": "#6f3800",
                      "tertiary": "#755700",
                      "sam-gray-dark": "#333333",
                      "sam-teal": "#06A77D",
                      "on-primary-container": "#fffbff"
              },
              "borderRadius": {
                      "DEFAULT": "0.25rem",
                      "lg": "0.5rem",
                      "xl": "0.75rem",
                      "full": "9999px"
              },
              "fontFamily": {
                      "math-numeral": ["Plus Jakarta Sans"],
                      "headline-adult": ["Inter"],
                      "body-regular": ["Inter"],
                      "display-child": ["Plus Jakarta Sans"],
                      "caption": ["Inter"]
              },
              "fontSize": {
                      "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                      "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                      "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                      "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                      "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}]
              }
            },
          },
        }
    </script>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen flex flex-col font-body-regular text-on-surface">
<!-- Top Navigation Shell (Injected from JSON) -->
<header class="bg-stone-50 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 shadow-sm dark:shadow-none flex justify-between items-center w-full px-6 h-16 sticky top-0 z-40">
<div class="flex items-center gap-3">
<div class="p-2 rounded-lg hover:bg-red-50 transition-colors active:scale-95 duration-150 cursor-pointer">
<span class="material-symbols-outlined text-red-600" data-icon="menu">menu</span>
</div>
<h1 class="font-['Plus_Jakarta_Sans'] font-bold text-lg text-red-600 dark:text-red-500">S.A.M. Assessment</h1>
</div>
<div class="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-white shadow-sm active:scale-95 duration-150 transition-transform cursor-pointer">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="close up of a cheerful young student avatar with a bright friendly face against a soft pastel background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCottnZ124Who7X_zm9eYyML5QNsfPlOrhptvUTrJnmFHpZjFcWLlhJ6B5bLdzuBIAuBzM9UOsfvU5Gi-NL4AjwKxNldcv0pAm5C5HMGbMuI8wUn9WaliOPr4jrQns2XTgrD2pcyLOisefs2Vzpn6gX80-sIRkuHhughJaVUTTA7uR-OAWnZxKIjY1KsW5hG54S0QUAcBfTaHaWoqhPVcXP0wpksSTkvUhvVVmpw-IFCpIJ-qs7EYfsUThMUJjmdsBxRDyyg43_Rnjf"/>
</div>
</header>
<!-- Main Assessment Canvas -->
<main class="flex-grow flex flex-col items-center justify-center px-6 pt-4 pb-24">
<!-- Journey Map Progress Indicator -->
<div class="w-full max-w-md mb-12">
<div class="flex items-center justify-between px-2 mb-3">
<span class="font-display-child text-caption text-sam-navy">Fraction Land</span>
<span class="font-display-child text-caption text-sam-gray-mid">Step 4 of 6</span>
</div>
<div class="relative h-4 bg-white rounded-full border-2 border-sam-gray-light overflow-hidden flex items-center">
<!-- Progress Path -->
<div class="absolute left-0 top-0 h-full bg-sam-teal w-4/6 transition-all duration-500 rounded-r-full"></div>
<!-- Milestones -->
<div class="absolute w-full flex justify-around px-4">
<div class="w-2 h-2 rounded-full bg-white/60"></div>
<div class="w-2 h-2 rounded-full bg-white/60"></div>
<div class="w-2 h-2 rounded-full bg-white/60"></div>
<div class="w-3 h-3 rounded-full bg-white ring-4 ring-sam-teal shadow-lg z-10"></div>
<div class="w-2 h-2 rounded-full bg-sam-gray-light"></div>
<div class="w-2 h-2 rounded-full bg-sam-gray-light"></div>
</div>
</div>
</div>
<!-- Question Section -->
<div class="text-center max-w-xs mb-10">
<h2 class="font-display-child text-display-child text-sam-navy mb-4 leading-tight">
                Shade <span class="text-sam-red border-b-4 border-sam-red">3/4</span> of the circle below.
            </h2>
<p class="font-body-regular text-body-regular text-sam-gray-mid">Tap the segments to color them in!</p>
</div>
<!-- Visualizer: Segmented Circle Interaction -->
<div class="relative w-72 h-72 mb-12">
<div class="absolute inset-0 bg-white rounded-full shadow-xl border-4 border-sam-navy overflow-hidden">
<!-- SVG Circle for Segments -->
<svg class="w-full h-full transform -rotate-90" viewbox="0 0 100 100">
<!-- Quarter 1 (Shaded) -->
<path class="fraction-segment fill-sam-red stroke-white stroke-[0.5] cursor-pointer" d="M 50 50 L 50 0 A 50 50 0 0 1 100 50 Z"></path>
<!-- Quarter 2 (Shaded) -->
<path class="fraction-segment fill-sam-red stroke-white stroke-[0.5] cursor-pointer" d="M 50 50 L 100 50 A 50 50 0 0 1 50 100 Z"></path>
<!-- Quarter 3 (Active Selection/Half-Shaded) -->
<path class="fraction-segment fill-sam-orange stroke-white stroke-[0.5] cursor-pointer ring-inset ring-4 ring-white" d="M 50 50 L 50 100 A 50 50 0 0 1 0 50 Z"></path>
<!-- Quarter 4 (Unshaded) -->
<path class="fraction-segment fill-sam-cream stroke-sam-gray-light stroke-[0.5] cursor-pointer" d="M 50 50 L 0 50 A 50 50 0 0 1 50 0 Z"></path>
<!-- Center Dot -->
<circle cx="50" cy="50" fill="#1B3A6B" r="1.5"></circle>
</svg>
</div>
<!-- Contextual Status Badge -->
<div class="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-sam-navy text-white px-6 py-2 rounded-full font-bold text-lg shadow-lg">
                3 / 4
            </div>
</div>
<!-- Primary Action -->
<div class="w-full max-w-xs space-y-4">
<button class="w-full h-16 bg-sam-red text-white rounded-2xl font-display-child text-xl shadow-lg hover:bg-primary transition-all active:scale-95 flex items-center justify-center gap-3">
<span>Check Answer</span>
<span class="material-symbols-outlined" data-icon="check_circle">check_circle</span>
</button>
<button class="w-full py-3 bg-transparent text-sam-navy font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
<span class="material-symbols-outlined" data-icon="refresh">refresh</span>
<span>Reset Circle</span>
</button>
</div>
</main>
<!-- Bottom Navigation Shell (Injected from JSON) -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 pb-safe bg-white dark:bg-slate-900 border-t border-stone-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-2xl">
<a class="flex flex-col items-center justify-center text-red-600 dark:text-red-400 scale-110 font-['Plus_Jakarta_Sans'] text-[12px] font-medium transition-transform duration-200 ease-out" href="#">
<span class="material-symbols-outlined mb-1" data-icon="map" data-weight="fill" style="font-variation-settings: 'FILL' 1;">map</span>
<span>Journey</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-['Plus_Jakarta_Sans'] text-[12px] font-medium hover:text-red-500 dark:hover:text-red-300" href="#">
<span class="material-symbols-outlined mb-1" data-icon="calculate">calculate</span>
<span>Practice</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-['Plus_Jakarta_Sans'] text-[12px] font-medium hover:text-red-500 dark:hover:text-red-300" href="#">
<span class="material-symbols-outlined mb-1" data-icon="bar_chart">bar_chart</span>
<span>Reports</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-['Plus_Jakarta_Sans'] text-[12px] font-medium hover:text-red-500 dark:hover:text-red-300" href="#">
<span class="material-symbols-outlined mb-1" data-icon="settings">settings</span>
<span>Settings</span>
</a>
</nav>
</body></html>

<!-- Module C - 8: 5-8 Comparison Logic -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>S.A.M. Assessment - Comparison Logic</title>
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
                        "primary": "#b7102a",
                        "sam-cream": "#FFF8F0",
                        "surface-container-high": "#e0e8ff",
                        "secondary-container": "#ffab69",
                        "on-surface-variant": "#5b403f",
                        "surface": "#f9f9ff",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-error-container": "#93000a",
                        "error": "#ba1a1a",
                        "outline-variant": "#e4bebc",
                        "tertiary-container": "#936f03",
                        "on-secondary-container": "#783d01",
                        "sam-navy": "#1B3A6B",
                        "on-background": "#001a40",
                        "surface-container-highest": "#d7e2ff",
                        "surface-dim": "#cadaff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-error": "#ffffff",
                        "inverse-primary": "#ffb3b1",
                        "background": "#f9f9ff",
                        "on-secondary-fixed": "#2f1400",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "surface-bright": "#f9f9ff",
                        "on-tertiary-fixed": "#251a00",
                        "primary-fixed-dim": "#ffb3b1",
                        "secondary-fixed-dim": "#ffb780",
                        "sam-red": "#E63946",
                        "on-primary-fixed": "#410007",
                        "surface-tint": "#bb152c",
                        "sam-gray-mid": "#777777",
                        "on-primary-fixed-variant": "#92001c",
                        "on-tertiary": "#ffffff",
                        "surface-variant": "#d7e2ff",
                        "sam-yellow": "#FFD166",
                        "white": "#FFFFFF",
                        "on-secondary": "#ffffff",
                        "sam-orange": "#F4A261",
                        "on-surface": "#001a40",
                        "secondary": "#8e4e14",
                        "primary-fixed": "#ffdad8",
                        "surface-container": "#e8edff",
                        "error-container": "#ffdad6",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "primary-container": "#db313f",
                        "sam-gray-light": "#E5E5E5",
                        "on-primary": "#ffffff",
                        "tertiary-fixed": "#ffdf9b",
                        "inverse-on-surface": "#edf0ff",
                        "secondary-fixed": "#ffdcc4",
                        "inverse-surface": "#0d2f60",
                        "on-secondary-fixed-variant": "#6f3800",
                        "tertiary": "#755700",
                        "sam-gray-dark": "#333333",
                        "sam-teal": "#06A77D",
                        "on-primary-container": "#fffbff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "stack-md": "16px",
                        "stack-lg": "32px",
                        "report-width": "880px",
                        "margin-tablet": "32px",
                        "unit": "4px",
                        "stack-sm": "8px",
                        "gutter": "24px",
                        "margin-desktop": "40px",
                        "container-max": "1440px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "body-regular": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "caption": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}]
                    }
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .journey-line {
            background-image: linear-gradient(to right, #E63946 50%, #E5E5E5 50%);
            background-size: 200% 100%;
            background-position: left bottom;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen font-body-regular text-on-surface flex flex-col">
<!-- TopAppBar -->
<header class="fixed top-0 left-0 w-full z-50 bg-stone-50 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 shadow-sm flex justify-between items-center w-full px-6 h-16">
<div class="flex items-center gap-4">
<button class="hover:bg-red-50 transition-colors rounded-full p-2 active:scale-95 duration-150">
<span class="material-symbols-outlined text-red-600" data-icon="menu">menu</span>
</button>
<h1 class="font-['Plus_Jakarta_Sans'] font-bold text-lg text-red-600 tracking-tight">S.A.M. Assessment</h1>
</div>
<!-- Journey Progress Indicator (Central) -->
<div class="hidden md:flex items-center gap-2 flex-1 max-w-md mx-8">
<div class="w-full bg-sam-gray-light h-2 rounded-full overflow-hidden">
<div class="bg-sam-red h-full w-3/4 rounded-full"></div>
</div>
<span class="text-caption font-bold text-sam-navy whitespace-nowrap">24 / 32</span>
</div>
<div class="flex items-center">
<div class="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-white shadow-sm overflow-hidden">
<img alt="User Profile" data-alt="close-up portrait of a cheerful young child student with friendly eyes and a bright smile for a user profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtqeTlK_aWVclx3cAWlZaTjLoePe8gvK3V_IH2mEfm3hA_AwkB5-sw4vmeaWPHw0LjU1xplyUQ-BiXuxKUpBW5yzl6UaAo-AYc_FECLfFPJ-hHT05cOEaMLZhXnJkSu14EzW-4wqyPzZ9K24WCPT-i2imUrKo-evMdbNpu0qiIWSWidpnx-6-ttYXOdmDBxjChKn4un8pzFTpb1FF0EiOpKOVsyOUpnyTv464gU-A0ZqERjrZoxAZ8Wm0LYXmuU1cWG2e83V8RTciu"/>
</div>
</div>
</header>
<!-- Main Content Canvas -->
<main class="flex-1 mt-16 mb-20 px-6 py-8 flex flex-col items-center justify-center">
<!-- Mobile Journey Map -->
<div class="md:hidden w-full mb-8">
<div class="flex justify-between items-center mb-2 px-2">
<span class="text-caption font-bold text-sam-navy">Step 24</span>
<span class="text-caption font-medium text-sam-gray-mid">Logic Module</span>
</div>
<div class="flex items-center gap-1">
<div class="h-2 flex-1 rounded-full bg-sam-red"></div>
<div class="h-2 flex-1 rounded-full bg-sam-red"></div>
<div class="h-2 flex-1 rounded-full bg-sam-red"></div>
<div class="h-2 flex-1 rounded-full bg-sam-red/30 relative">
<div class="absolute inset-0 bg-sam-red w-1/2 rounded-full"></div>
</div>
<div class="h-2 flex-1 rounded-full bg-sam-gray-light"></div>
</div>
</div>
<!-- Assessment Task -->
<div class="w-full max-w-report-width flex flex-col items-center">
<div class="text-center mb-12">
<h2 class="font-display-child text-display-child text-sam-navy mb-4">Compare the expressions</h2>
<p class="text-body-regular text-sam-gray-dark max-w-sm mx-auto">Choose the correct symbol to make the statement true.</p>
</div>
<!-- Comparison Logic Board -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-center w-full max-w-2xl">
<!-- Left Expression -->
<div class="bg-white p-10 rounded-[32px] shadow-[0_4px_12px_rgba(27,58,107,0.08)] flex flex-col items-center justify-center border-b-4 border-sam-gray-light">
<div class="font-math-numeral text-math-numeral text-sam-navy mb-2">5 + 8</div>
<div class="text-caption font-medium text-sam-gray-mid">Value: 13</div>
</div>
<!-- Operator Placeholder -->
<div class="flex flex-col items-center justify-center gap-4">
<div class="w-20 h-20 rounded-2xl border-4 border-dashed border-sam-gray-light bg-white/50 flex items-center justify-center">
<span class="material-symbols-outlined text-sam-gray-light text-4xl" data-icon="question_mark">question_mark</span>
</div>
</div>
<!-- Right Expression -->
<div class="bg-white p-10 rounded-[32px] shadow-[0_4px_12px_rgba(27,58,107,0.08)] flex flex-col items-center justify-center border-b-4 border-sam-gray-light">
<div class="font-math-numeral text-math-numeral text-sam-navy mb-2">15 - 3</div>
<div class="text-caption font-medium text-sam-gray-mid">Value: 12</div>
</div>
</div>
<!-- Choice Interaction Grid -->
<div class="mt-16 flex flex-wrap justify-center gap-6 w-full">
<!-- Less Than -->
<button class="group w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl shadow-[0_4px_12px_rgba(27,58,107,0.08)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-transparent hover:border-sam-red">
<span class="text-4xl md:text-6xl font-math-numeral text-sam-navy group-hover:text-sam-red">&lt;</span>
</button>
<!-- Equals -->
<button class="group w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl shadow-[0_4px_12px_rgba(27,58,107,0.08)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-transparent hover:border-sam-red">
<span class="text-4xl md:text-6xl font-math-numeral text-sam-navy group-hover:text-sam-red">=</span>
</button>
<!-- Greater Than (Correct) -->
<button class="group w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl shadow-[0_4px_12px_rgba(27,58,107,0.08)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-sam-red ring-4 ring-sam-red/10">
<span class="text-4xl md:text-6xl font-math-numeral text-sam-red">&gt;</span>
</button>
</div>
<!-- Action Area -->
<div class="mt-12 w-full flex justify-center">
<button class="bg-sam-red text-white font-bold px-12 py-5 rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-3">
<span class="font-headline-adult">Check Answer</span>
<span class="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
</div>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 bg-white dark:bg-slate-900 border-t border-stone-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] flex justify-around items-center h-20 pb-safe rounded-t-2xl">
<div class="flex flex-col items-center justify-center text-red-600 dark:text-red-400 scale-110 font-['Plus_Jakarta_Sans'] text-[12px] font-medium transition-transform duration-200 ease-out">
<span class="material-symbols-outlined" data-icon="map" style="font-variation-settings: 'FILL' 1;">map</span>
<span>Journey</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-['Plus_Jakarta_Sans'] text-[12px] font-medium hover:text-red-500 transition-colors">
<span class="material-symbols-outlined" data-icon="calculate">calculate</span>
<span>Practice</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-['Plus_Jakarta_Sans'] text-[12px] font-medium hover:text-red-500 transition-colors">
<span class="material-symbols-outlined" data-icon="bar_chart">bar_chart</span>
<span>Reports</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-['Plus_Jakarta_Sans'] text-[12px] font-medium hover:text-red-500 transition-colors">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
<span>Settings</span>
</div>
</nav>
<!-- Decorative Elements (No Mascot as requested) -->
<div class="fixed top-24 -left-12 w-48 h-48 bg-sam-yellow/20 rounded-full blur-3xl pointer-events-none"></div>
<div class="fixed bottom-32 -right-12 w-64 h-64 bg-sam-orange/20 rounded-full blur-3xl pointer-events-none"></div>
</body></html>

<!-- Module C - 9: 5-8 Completion Journey -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>S.A.M. Assessment - Journey Complete</title>
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
                        "primary": "#b7102a",
                        "sam-cream": "#FFF8F0",
                        "surface-container-high": "#e0e8ff",
                        "secondary-container": "#ffab69",
                        "on-surface-variant": "#5b403f",
                        "surface": "#f9f9ff",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "on-error-container": "#93000a",
                        "error": "#ba1a1a",
                        "outline-variant": "#e4bebc",
                        "tertiary-container": "#936f03",
                        "on-secondary-container": "#783d01",
                        "sam-navy": "#1B3A6B",
                        "on-background": "#001a40",
                        "surface-container-highest": "#d7e2ff",
                        "surface-dim": "#cadaff",
                        "tertiary-fixed-dim": "#edc157",
                        "on-error": "#ffffff",
                        "inverse-primary": "#ffb3b1",
                        "background": "#f9f9ff",
                        "on-secondary-fixed": "#2f1400",
                        "outline": "#8f6f6e",
                        "surface-container-lowest": "#ffffff",
                        "surface-bright": "#f9f9ff",
                        "on-tertiary-fixed": "#251a00",
                        "primary-fixed-dim": "#ffb3b1",
                        "secondary-fixed-dim": "#ffb780",
                        "sam-red": "#E63946",
                        "on-primary-fixed": "#410007",
                        "surface-tint": "#bb152c",
                        "sam-gray-mid": "#777777",
                        "on-primary-fixed-variant": "#92001c",
                        "on-tertiary": "#ffffff",
                        "surface-variant": "#d7e2ff",
                        "sam-yellow": "#FFD166",
                        "white": "#FFFFFF",
                        "on-secondary": "#ffffff",
                        "sam-orange": "#F4A261",
                        "on-surface": "#001a40",
                        "secondary": "#8e4e14",
                        "primary-fixed": "#ffdad8",
                        "surface-container": "#e8edff",
                        "error-container": "#ffdad6",
                        "on-tertiary-container": "#fffbff",
                        "surface-container-low": "#f1f3ff",
                        "primary-container": "#db313f",
                        "sam-gray-light": "#E5E5E5",
                        "on-primary": "#ffffff",
                        "tertiary-fixed": "#ffdf9b",
                        "inverse-on-surface": "#edf0ff",
                        "secondary-fixed": "#ffdcc4",
                        "inverse-surface": "#0d2f60",
                        "on-secondary-fixed-variant": "#6f3800",
                        "tertiary": "#755700",
                        "sam-gray-dark": "#333333",
                        "sam-teal": "#06A77D",
                        "on-primary-container": "#fffbff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "fontFamily": {
                        "math-numeral": ["Plus Jakarta Sans"],
                        "headline-adult": ["Inter"],
                        "body-regular": ["Inter"],
                        "display-child": ["Plus Jakarta Sans"],
                        "caption": ["Inter"]
                    },
                    "fontSize": {
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}],
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}]
                    }
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .path-curve {
            clip-path: ellipse(150% 100% at 50% 100%);
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream min-h-screen flex flex-col font-body-regular text-on-surface overflow-hidden">
<!-- TopAppBar -->
<header class="bg-stone-50 dark:bg-slate-950 text-red-600 dark:text-red-500 border-b border-stone-200 dark:border-slate-800 shadow-sm dark:shadow-none flex justify-between items-center w-full px-6 h-16 fixed top-0 z-50">
<div class="flex items-center gap-4">
<span class="material-symbols-outlined text-2xl cursor-pointer p-2 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors rounded-full" data-icon="menu">menu</span>
<h1 class="font-['Plus_Jakarta_Sans'] font-bold text-lg">S.A.M. Assessment</h1>
</div>
<div class="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-sam-red flex items-center justify-center overflow-hidden">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="Cartoon avatar of a young student smiling, colorful artistic style suitable for educational apps" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWEkz6r8zeOiAgdACK92dFw-0CkXdD_po8gENtGFHWcriFAZBirFk8kvXu8zzOni7rSHsL_EwVl39--M6pvWUnREtIZcR-Q23hQ3VnfZsuxk6wWuI942wvXj9tRZ3iOM3m3Hd2-eEfIh_JuSMwS-PxjeiT-M3tbSrcpm5VEw-P9LWpkPf3eDVXkc3-i7pXqnRMjiN5VOa3DeivBe4N05nRs3ET6miK_CfypjlLxUM7b0PUkUlDE5_rLx9j6mok1DMWYtUCPPEKAadZ"/>
</div>
</header>
<!-- Main Canvas: Completion Journey -->
<main class="flex-1 mt-16 pb-20 relative flex flex-col items-center justify-center px-6 overflow-hidden">
<!-- Celebratory Background Elements (Confetti style) -->
<div class="absolute inset-0 pointer-events-none opacity-40">
<div class="absolute top-10 left-10 w-4 h-4 bg-sam-red rounded-full"></div>
<div class="absolute top-20 right-20 w-3 h-3 bg-sam-yellow rotate-45"></div>
<div class="absolute bottom-40 left-20 w-5 h-2 bg-sam-teal rotate-12"></div>
<div class="absolute top-1/2 right-10 w-4 h-4 border-2 border-sam-orange rounded-sm"></div>
</div>
<!-- Success Message Cluster -->
<div class="z-10 text-center mb-8">
<div class="inline-block bg-white/80 backdrop-blur-sm px-6 py-4 rounded-3xl shadow-lg mb-6 border-2 border-sam-teal/20">
<h2 class="font-display-child text-display-child text-sam-navy mb-2">Mathematical Journey Complete!</h2>
<p class="font-headline-adult text-headline-adult text-sam-gray-dark">Show this to your grown-up.</p>
</div>
</div>
<!-- The Path and Mascot -->
<div class="relative w-full max-w-md h-[400px] flex flex-col items-center">
<!-- Winding Path (Stylized Visual) -->
<div class="absolute bottom-0 w-full h-32 bg-sam-gray-light/30 rounded-[100%] blur-xl"></div>
<!-- Path Progress Dots -->
<div class="absolute bottom-20 flex flex-col items-center gap-8 w-full">
<div class="flex gap-4 items-end opacity-20">
<div class="w-6 h-6 rounded-full bg-sam-gray-mid"></div>
<div class="w-8 h-8 rounded-full bg-sam-gray-mid -mb-2"></div>
</div>
<div class="flex gap-6 items-end">
<div class="w-10 h-10 rounded-full bg-sam-teal/30 shadow-inner"></div>
<div class="w-12 h-12 rounded-full bg-sam-teal shadow-lg flex items-center justify-center">
<span class="material-symbols-outlined text-white" data-icon="check" data-weight="fill">check</span>
</div>
</div>
</div>
<!-- The Final Destination: Sammy and the Flag -->
<div class="relative z-20 mt-auto mb-10 flex flex-col items-center">
<!-- Fluttering Flag -->
<div class="absolute -top-16 -right-12 flex flex-col items-center">
<div class="w-1 h-24 bg-sam-navy rounded-full"></div>
<div class="absolute top-0 left-1 w-20 h-14 bg-sam-red rounded-r-lg rounded-bl-3xl shadow-md border-r-4 border-white/20">
<span class="material-symbols-outlined text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" data-icon="stars" data-weight="fill">stars</span>
</div>
</div>
<!-- Sammy the Otter Mascot -->
<div class="w-56 h-56 relative">
<img alt="Sammy the Otter" class="w-full h-full object-contain" data-alt="Sammy the Otter, a friendly mascot wearing a small graduation cap, holding a gold star, bright and encouraging artistic style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0Z51nDrPGfNFGNu0pMo_VcxJ4seLe9g_UD6icLEeVJbwHrj2pFodPYU-S-xIUY2taf5Ak10Y9_qgxADnJV4LMoKQ474sv6bx9jh6JzBhCY9rNgcaW1YjEhPLKJfTE7t3m2jL0DeLe_gtxuOmGyat_j7W6rnI91LipQO-S3gj0SMGMk3ojuO0DeGtG6_6KfqRk5dbKzdbv83Z1VM-1X_USiFu7i0JbyOYg4LxVMAP_cgukY8BUfZ3SXtl8pj7Q_aKFc48eUwSFZT4B"/>
<!-- Speech Bubble -->
<div class="absolute -top-12 -left-16 bg-white p-4 rounded-3xl rounded-br-none shadow-xl border-2 border-sam-cream max-w-[180px]">
<p class="font-body-regular text-sam-navy font-bold text-sm">You did it! You're a Math Star!</p>
</div>
</div>
</div>
</div>
<!-- Primary Action -->
<div class="w-full max-w-xs mt-8">
<button class="w-full bg-sam-red text-white py-5 rounded-[16px] font-display-child text-xl shadow-[0_6px_0_0_#b7102a] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3">
<span>View Results</span>
<span class="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 pb-safe bg-white dark:bg-slate-900 border-t border-stone-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-2xl">
<div class="flex flex-col items-center justify-center text-red-600 dark:text-red-400 scale-110 font-['Plus_Jakarta_Sans'] text-[12px] font-medium">
<span class="material-symbols-outlined" data-icon="map" data-weight="fill" style="font-variation-settings: 'FILL' 1;">map</span>
<span>Journey</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 font-['Plus_Jakarta_Sans'] text-[12px] font-medium transition-transform duration-200 ease-out active:scale-95">
<span class="material-symbols-outlined" data-icon="calculate">calculate</span>
<span>Practice</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 font-['Plus_Jakarta_Sans'] text-[12px] font-medium transition-transform duration-200 ease-out active:scale-95">
<span class="material-symbols-outlined" data-icon="bar_chart">bar_chart</span>
<span>Reports</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 font-['Plus_Jakarta_Sans'] text-[12px] font-medium transition-transform duration-200 ease-out active:scale-95">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
<span>Settings</span>
</div>
</nav>
</body></html>
