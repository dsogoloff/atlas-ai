<!-- Utility - Error State -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "tertiary-container": "#936f03",
                    "on-tertiary-container": "#fffbff",
                    "on-tertiary": "#ffffff",
                    "surface-container-low": "#f1f3ff",
                    "sam-navy": "#1B3A6B",
                    "secondary-fixed-dim": "#ffb780",
                    "on-primary-container": "#fffbff",
                    "on-surface": "#001a40",
                    "on-primary": "#ffffff",
                    "tertiary-fixed-dim": "#edc157",
                    "inverse-on-surface": "#edf0ff",
                    "on-tertiary-fixed": "#251a00",
                    "outline-variant": "#e4bebc",
                    "error": "#ba1a1a",
                    "on-error": "#ffffff",
                    "surface-dim": "#cadaff",
                    "inverse-surface": "#0d2f60",
                    "on-surface-variant": "#5b403f",
                    "sam-yellow": "#FFD166",
                    "sam-gray-dark": "#333333",
                    "surface-container": "#e8edff",
                    "primary-container": "#db313f",
                    "on-error-container": "#93000a",
                    "primary-fixed": "#ffdad8",
                    "on-secondary": "#ffffff",
                    "surface-container-high": "#e0e8ff",
                    "sam-gray-mid": "#777777",
                    "surface-container-lowest": "#ffffff",
                    "on-background": "#001a40",
                    "primary-fixed-dim": "#ffb3b1",
                    "sam-red": "#E63946",
                    "error-container": "#ffdad6",
                    "surface-tint": "#bb152c",
                    "secondary": "#8e4e14",
                    "on-primary-fixed": "#410007",
                    "inverse-primary": "#ffb3b1",
                    "surface-container-highest": "#d7e2ff",
                    "secondary-container": "#ffab69",
                    "secondary-fixed": "#ffdcc4",
                    "on-secondary-fixed-variant": "#6f3800",
                    "white": "#FFFFFF",
                    "tertiary-fixed": "#ffdf9b",
                    "surface-variant": "#d7e2ff",
                    "sam-orange": "#F4A261",
                    "background": "#f9f9ff",
                    "sam-cream": "#FFF8F0",
                    "on-secondary-fixed": "#2f1400",
                    "tertiary": "#755700",
                    "on-tertiary-fixed-variant": "#5b4300",
                    "surface": "#f9f9ff",
                    "surface-bright": "#f9f9ff",
                    "sam-gray-light": "#E5E5E5",
                    "sam-teal": "#06A77D",
                    "primary": "#b7102a",
                    "on-secondary-container": "#783d01",
                    "on-primary-fixed-variant": "#92001c",
                    "outline": "#8f6f6e"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "container-max": "1440px",
                    "stack-md": "16px",
                    "stack-lg": "32px",
                    "report-width": "880px",
                    "margin-desktop": "40px",
                    "gutter": "24px",
                    "margin-tablet": "32px",
                    "stack-sm": "8px",
                    "unit": "4px"
            },
            "fontFamily": {
                    "caption": ["Inter"],
                    "body-regular": ["Inter"],
                    "headline-adult": ["Inter"],
                    "math-numeral": ["Plus Jakarta Sans"],
                    "display-child": ["Plus Jakarta Sans"]
            },
            "fontSize": {
                    "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                    "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                    "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                    "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                    "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .tap-highlight-transparent {
            -webkit-tap-highlight-color: transparent;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-sam-cream font-body-regular text-on-surface antialiased flex flex-col min-h-screen">
<!-- TopAppBar -->
<header class="bg-[#FFFDF5] dark:bg-slate-950 border-b border-[#F2F0E4] dark:border-slate-800 shadow-sm dark:shadow-none fixed top-0 left-0 right-0 z-50">
<div class="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full overflow-hidden bg-sam-gray-light">
<img class="w-full h-full object-cover" data-alt="Close up portrait of a smiling young student with glasses in a bright educational setting with warm sunlight" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdlTJ9_snvksh2Y-ID88C86zWAhcUjK2kJolsCkiLNkICQywReTYBcdKP3fFLOXqeNrlX6kWqIOpH8g8E2Z5s-3MfO3Jg4RdTgo-ySAiHX2WuvTREo-5bL0DztLYyyNN1mynZiyQF_leeGgC1MPGYat6uVcpSpq7Dqw-D1TyfSmn0E4fU4c6WJhnO8a8vpxzU0A8Q1pezMfI8WN9rXQ-djFDwBMzR238aOrwC5G1UECPWzoF7Sl_XYamdRmdfhzU8QrTtPPKGwotiQ"/>
</div>
<h1 class="font-['Plus_Jakarta_Sans'] font-bold text-[#1B3A6B] dark:text-slate-100 text-lg">Diagnostic Journey</h1>
</div>
<button class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors scale-95 duration-150 ease-in-out">
<span class="material-symbols-outlined text-[#1B3A6B] dark:text-white" data-icon="settings">settings</span>
</button>
</div>
</header>
<!-- Main Canvas -->
<main class="flex-grow flex items-center justify-center px-6 pt-24 pb-32">
<div class="max-w-md w-full flex flex-col items-center text-center">
<!-- Mascot Illustration Container -->
<div class="relative mb-8 w-full max-w-[280px]">
<div class="absolute inset-0 bg-sam-yellow/20 rounded-full blur-3xl scale-125 -z-10"></div>
<div class="bg-white rounded-[40px] p-8 shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border-2 border-sam-gray-light">
<!-- Sammy the Otter / Dachshund Mascot Hybrid Illustration -->
<img class="w-full aspect-square object-contain rounded-2xl mb-4" data-alt="Playful cartoon-style brown dachshund with a puzzled expression looking at a glowing red arithmetic problem with question marks" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5LIwOgJWWpuq9KKG_xEDexdp9f1lmGfSBI8HMbjAdpqHJWrvBS35ImLRIjAp4j7R63-qolVmpM3maITwox7hsP3RVVwvYrbTPamN4ZkNteo8Tzoowbmmf73BoUd1tXlBz5YYSK7JR13-KrIuiw9DY9GA4gt_Ih7J1AH4AonxxCFjlA28CXWrix1CGN90adB1wmwxzM2__t-8ACcuGPzoM8BV6HZdFaV8hBk6knHydLQljLDXZ2TpFDFyMyasVVdMiSqu3n4Dvk4Ji"/>
<!-- Speech Bubble -->
<div class="relative bg-sam-navy text-white px-4 py-2 rounded-2xl text-caption font-caption">
                        "Wait, something's not adding up!"
                        <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-sam-navy rotate-45"></div>
</div>
</div>
</div>
<!-- Error Messaging -->
<div class="space-y-4 mb-10">
<h2 class="font-display-child text-display-child text-sam-navy">Oops! A Math Mishap.</h2>
<p class="font-body-regular text-body-regular text-sam-gray-mid">
                    We couldn't load your next challenge. Don't worry, your progress is safe with Sammy!
                </p>
</div>
<!-- Action Buttons -->
<div class="flex flex-col w-full gap-4">
<button class="bg-sam-red text-white py-4 px-8 rounded-xl font-math-numeral text-lg font-bold shadow-[0_4px_0_#92001c] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2">
<span class="material-symbols-outlined" data-icon="refresh">refresh</span>
                    Try Again
                </button>
<button class="bg-white border-2 border-sam-navy text-sam-navy py-4 px-8 rounded-xl font-math-numeral text-lg font-bold hover:bg-sam-navy hover:text-white transition-colors flex items-center justify-center gap-2">
<span class="material-symbols-outlined" data-icon="home">home</span>
                    Go Home
                </button>
</div>
<!-- Secondary Help Link -->
<button class="mt-8 text-sam-gray-mid font-caption text-caption flex items-center gap-1 hover:text-sam-navy transition-colors">
<span class="material-symbols-outlined text-[18px]" data-icon="support_agent">support_agent</span>
                Contact Teacher Support
            </button>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-white dark:bg-slate-900 border-t border-[#F2F0E4] dark:border-slate-800 shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-2xl">
<a class="flex flex-col items-center justify-center bg-[#FEF2F2] dark:bg-red-950/30 text-[#E63946] rounded-xl px-6 py-2 transition-transform active:scale-90 tap-highlight-transparent" href="#">
<span class="material-symbols-outlined" data-icon="route">route</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Assessment</span>
</a>
<a class="flex flex-col items-center justify-center text-[#64748B] dark:text-slate-400 px-6 py-2 transition-transform active:scale-90 hover:text-[#E63946] dark:hover:text-red-400 tap-highlight-transparent" href="#">
<span class="material-symbols-outlined" data-icon="insights">insights</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Progress</span>
</a>
<a class="flex flex-col items-center justify-center text-[#64748B] dark:text-slate-400 px-6 py-2 transition-transform active:scale-90 hover:text-[#E63946] dark:hover:text-red-400 tap-highlight-transparent" href="#">
<span class="material-symbols-outlined" data-icon="description">description</span>
<span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold">Report</span>
</a>
</nav>
</body></html>

<!-- Utility - Loading State -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Diagnostic Journey - Loading</title>
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
                    "on-tertiary-container": "#fffbff",
                    "on-tertiary": "#ffffff",
                    "surface-container-low": "#f1f3ff",
                    "sam-navy": "#1B3A6B",
                    "secondary-fixed-dim": "#ffb780",
                    "on-primary-container": "#fffbff",
                    "on-surface": "#001a40",
                    "on-primary": "#ffffff",
                    "tertiary-fixed-dim": "#edc157",
                    "inverse-on-surface": "#edf0ff",
                    "on-tertiary-fixed": "#251a00",
                    "outline-variant": "#e4bebc",
                    "error": "#ba1a1a",
                    "on-error": "#ffffff",
                    "surface-dim": "#cadaff",
                    "inverse-surface": "#0d2f60",
                    "on-surface-variant": "#5b403f",
                    "sam-yellow": "#FFD166",
                    "sam-gray-dark": "#333333",
                    "surface-container": "#e8edff",
                    "primary-container": "#db313f",
                    "on-error-container": "#93000a",
                    "primary-fixed": "#ffdad8",
                    "on-secondary": "#ffffff",
                    "surface-container-high": "#e0e8ff",
                    "sam-gray-mid": "#777777",
                    "surface-container-lowest": "#ffffff",
                    "on-background": "#001a40",
                    "primary-fixed-dim": "#ffb3b1",
                    "sam-red": "#E63946",
                    "error-container": "#ffdad6",
                    "surface-tint": "#bb152c",
                    "secondary": "#8e4e14",
                    "on-primary-fixed": "#410007",
                    "inverse-primary": "#ffb3b1",
                    "surface-container-highest": "#d7e2ff",
                    "secondary-container": "#ffab69",
                    "secondary-fixed": "#ffdcc4",
                    "on-secondary-fixed-variant": "#6f3800",
                    "white": "#FFFFFF",
                    "tertiary-fixed": "#ffdf9b",
                    "surface-variant": "#d7e2ff",
                    "sam-orange": "#F4A261",
                    "background": "#f9f9ff",
                    "sam-cream": "#FFF8F0",
                    "on-secondary-fixed": "#2f1400",
                    "tertiary": "#755700",
                    "on-tertiary-fixed-variant": "#5b4300",
                    "surface": "#f9f9ff",
                    "surface-bright": "#f9f9ff",
                    "sam-gray-light": "#E5E5E5",
                    "sam-teal": "#06A77D",
                    "primary": "#b7102a",
                    "on-secondary-container": "#783d01",
                    "on-primary-fixed-variant": "#92001c",
                    "outline": "#8f6f6e"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "container-max": "1440px",
                    "stack-md": "16px",
                    "stack-lg": "32px",
                    "report-width": "880px",
                    "margin-desktop": "40px",
                    "gutter": "24px",
                    "margin-tablet": "32px",
                    "stack-sm": "8px",
                    "unit": "4px"
            },
            "fontFamily": {
                    "caption": ["Inter"],
                    "body-regular": ["Inter"],
                    "headline-adult": ["Inter"],
                    "math-numeral": ["Plus Jakarta Sans"],
                    "display-child": ["Plus Jakarta Sans"]
            },
            "fontSize": {
                    "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                    "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                    "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                    "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                    "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        @keyframes custom-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-sam-spin {
            animation: custom-spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
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
<header class="bg-[#FFFDF5] border-b border-[#F2F0E4] shadow-sm sticky top-0 z-50">
<div class="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
<div class="flex items-center gap-4">
<div class="w-10 h-10 rounded-full overflow-hidden bg-sam-gray-light border-2 border-sam-red">
<img alt="student_profile_photo" class="w-full h-full object-cover" data-alt="portrait of a young student smiling in a classroom setting, soft natural lighting, warm educational atmosphere" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-KvM5PfgWmSo7fxpjeAdBeox5aSl_kgZSoeDcEeR7SfXibROsVOesORN6dcQpoOapH6eEXw2I-oByjHyXriX0RjBz8MTeH8p4LXYQ4J0l_Lmtp79LqYogLq7tZF6yO_lKbKJr1LE-BCiLsm6Pl2jyTm-5WSQv9zp1yZMA7PPrhWmRevV05QQizIM7byKDAQLdea_GNpnF-L6QfpyUvZ6SIVKyQIAAxD2ewyjVM_nRTaGQt6f3kvBMHso7IMJcDDlsKNnBu-HFDeL5"/>
</div>
<h1 class="font-['Plus_Jakarta_Sans'] font-bold text-[#1B3A6B] text-lg">Diagnostic Journey</h1>
</div>
<button class="p-2 rounded-full hover:bg-slate-100 transition-colors scale-95 duration-150 ease-in-out text-[#1B3A6B]">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
</button>
</div>
</header>
<!-- Main Content Area (Focused Journey) -->
<main class="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
<!-- Loading Container -->
<div class="w-full max-w-md flex flex-col items-center gap-stack-lg">
<!-- Mascot Visualization (Dachshund 'Fetching' Logic) -->
<div class="relative w-64 h-64 mb-stack-md flex items-center justify-center">
<!-- Background Decorative Shape -->
<div class="absolute inset-0 bg-sam-yellow/20 rounded-full blur-3xl"></div>
<!-- Mascot Illustration -->
<div class="relative z-10 w-full h-full flex items-center justify-center">
<img alt="Sammy the Otter's best friend, the Dachshund" class="w-full h-auto object-contain transform -rotate-6" data-alt="playful stylized dachshund puppy running happily with a bright red ball in its mouth, clean studio background, warm lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzZYhufFcokqzlmquKl5WKErMyk5wVnPOZylg_DneJgeMKEore-A4E6BJeho1RSz1z7GhHDn6d1Qp4dwC1jPnYPkpVYwTdUp8M4-j1kXNV5MWH2TYCPCTdpRQniLmdLaqGZfPd9K-tjlXggdcOjU1AXPAtEMYjTA8-DfBCRkLqXvhMTUPq9Syc4rGWDK9g60gtppI3YxMSD2RJE6LPrF3rhFTYZ_VYA1WIus0ny-V_q0ZlWXcvaAJ0yATvipuNUW9Ix3aFQTmMr-UC"/>
</div>
<!-- Floating Question Mark Icons (Fetching visual) -->
<div class="absolute top-0 right-4 p-4 bg-white rounded-2xl shadow-lg border-2 border-sam-red transform rotate-12">
<span class="material-symbols-outlined text-sam-red text-4xl" data-icon="quiz" data-weight="fill">quiz</span>
</div>
<div class="absolute bottom-4 left-4 p-3 bg-white rounded-xl shadow-md border border-sam-gray-light transform -rotate-12 opacity-60">
<span class="material-symbols-outlined text-sam-navy text-2xl" data-icon="calculate">calculate</span>
</div>
</div>
<!-- Progress Information -->
<div class="text-center space-y-4">
<h2 class="font-display-child text-display-child text-sam-navy">Fetching your next goal!</h2>
<p class="font-body-regular text-body-regular text-sam-gray-dark max-w-[280px] mx-auto">
                    Hang tight! Our friendly mascot is grabbing a fun new math puzzle just for you.
                </p>
</div>
<!-- Custom Progress Spinner -->
<div class="mt-stack-md flex flex-col items-center gap-4">
<div class="relative">
<!-- Outer Ring -->
<div class="w-16 h-16 rounded-full border-4 border-sam-gray-light"></div>
<!-- Spinner Component -->
<div class="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-sam-red border-t-transparent animate-sam-spin"></div>
</div>
<span class="font-caption text-caption text-sam-red font-semibold uppercase tracking-widest">Loading...</span>
</div>
</div>
<!-- Background Detail (Mascot Integration Reference) -->
<div class="absolute bottom-10 left-0 right-0 flex justify-center opacity-10 pointer-events-none">
<img class="w-full max-w-lg object-contain" data-alt="abstract playful education background with floating colorful geometric shapes like circles and triangles in soft pastel tones" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_FcmSefy3zo1CJ9saDCMoEFj-WHveB6__CFIrklBmIlSMhVKuJiRgCMJi4snpSi6l5iIJ-V-dCN5hLldCggnxdtrCNjgh5XOAQblBqM9YuFrthqryeW_DhcXlyhDdTvV92TO41Rm7TRt4AZAM08O6qjgvz9eeC2kn4o_N6PlQPyDJijgh4ykXa_wREngXERAuAimDYm1dwjV1C-rDodBkkzHb--awqSbGz02K6xhAl_RDvgkK9jExzNMqoTTdYk-7R-4igkwo-YnK"/>
</div>
</main>
<!-- BottomNavBar (Suppressed for focused loading journey as per UX Goal) -->
<!-- Navigation is hidden here to prioritize the focused loading state of the assessment. -->
<!-- Toast / Notification Area (Optional for system feedback) -->
<div class="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-sm">
<div class="bg-sam-navy text-white px-6 py-4 rounded-2xl flex items-center gap-4 shadow-xl border border-white/10">
<span class="material-symbols-outlined text-sam-yellow" data-icon="auto_awesome" data-weight="fill">auto_awesome</span>
<span class="font-caption text-caption">Nearly there! Preparing your personalized path.</span>
</div>
</div>
</body></html>

<!-- Utility - Email: Verification -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "tertiary-container": "#936f03",
                        "on-tertiary-container": "#fffbff",
                        "on-tertiary": "#ffffff",
                        "surface-container-low": "#f1f3ff",
                        "sam-navy": "#1B3A6B",
                        "secondary-fixed-dim": "#ffb780",
                        "on-primary-container": "#fffbff",
                        "on-surface": "#001a40",
                        "on-primary": "#ffffff",
                        "tertiary-fixed-dim": "#edc157",
                        "inverse-on-surface": "#edf0ff",
                        "on-tertiary-fixed": "#251a00",
                        "outline-variant": "#e4bebc",
                        "error": "#ba1a1a",
                        "on-error": "#ffffff",
                        "surface-dim": "#cadaff",
                        "inverse-surface": "#0d2f60",
                        "on-surface-variant": "#5b403f",
                        "sam-yellow": "#FFD166",
                        "sam-gray-dark": "#333333",
                        "surface-container": "#e8edff",
                        "primary-container": "#db313f",
                        "on-error-container": "#93000a",
                        "primary-fixed": "#ffdad8",
                        "on-secondary": "#ffffff",
                        "surface-container-high": "#e0e8ff",
                        "sam-gray-mid": "#777777",
                        "surface-container-lowest": "#ffffff",
                        "on-background": "#001a40",
                        "primary-fixed-dim": "#ffb3b1",
                        "sam-red": "#E63946",
                        "error-container": "#ffdad6",
                        "surface-tint": "#bb152c",
                        "secondary": "#8e4e14",
                        "on-primary-fixed": "#410007",
                        "inverse-primary": "#ffb3b1",
                        "surface-container-highest": "#d7e2ff",
                        "secondary-container": "#ffab69",
                        "secondary-fixed": "#ffdcc4",
                        "on-secondary-fixed-variant": "#6f3800",
                        "white": "#FFFFFF",
                        "tertiary-fixed": "#ffdf9b",
                        "surface-variant": "#d7e2ff",
                        "sam-orange": "#F4A261",
                        "background": "#f9f9ff",
                        "sam-cream": "#FFF8F0",
                        "on-secondary-fixed": "#2f1400",
                        "tertiary": "#755700",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "surface": "#f9f9ff",
                        "surface-bright": "#f9f9ff",
                        "sam-gray-light": "#E5E5E5",
                        "sam-teal": "#06A77D",
                        "primary": "#b7102a",
                        "on-secondary-container": "#783d01",
                        "on-primary-fixed-variant": "#92001c",
                        "outline": "#8f6f6e"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "container-max": "1440px",
                        "stack-md": "16px",
                        "stack-lg": "32px",
                        "report-width": "880px",
                        "margin-desktop": "40px",
                        "gutter": "24px",
                        "margin-tablet": "32px",
                        "stack-sm": "8px",
                        "unit": "4px"
                    },
                    "fontFamily": {
                        "caption": ["Inter"],
                        "body-regular": ["Inter"],
                        "headline-adult": ["Inter"],
                        "math-numeral": ["Plus Jakarta Sans"],
                        "display-child": ["Plus Jakarta Sans"]
                    },
                    "fontSize": {
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}]
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
<body class="bg-sam-cream font-body-regular text-sam-gray-dark antialiased">
<div class="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
<header class="mb-stack-lg w-full max-w-[600px] text-center">
<h1 class="font-display-child text-display-child text-sam-navy">
                Atlas Assessment
            </h1>
</header>
<main class="w-full max-w-[600px] bg-white rounded-xl shadow-[0_4px_12px_rgba(27,58,107,0.08)] overflow-hidden">
<div class="h-3 bg-sam-red w-full"></div>
<div class="p-stack-lg flex flex-col items-center">
<div class="relative w-48 h-48 mb-stack-md flex justify-center">
<img class="w-full h-full object-contain" data-alt="A friendly and expressive cartoon otter mascot character waving cheerfully in an educational setting with bright colors" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDu2hmVB3EdG7UZ3OLbuYqXpf794llxjGA6ZAh5d8TF-FNgL-vVDql_5IyIQat81W8neCw4zctzyQQUHT9VCcVK4yb37xLS45sc8wKhe0ITrlS2BMzMifueDHmSpHlKVhR7RNObPGGP25jZMcTmU0c3GWMLUi9t7RZpnQcE0_5CKwIZOYX7l6Ee8Vu9j41IXl2Q9g1loFSAOlgMqADXBRmcYmPCdJzI7mcbCwoLAIAawHE7Z1YGeqlvHZ7vtEoS4DxouAksckgtfKp1"/>
</div>
<div class="text-center mb-stack-lg">
<h2 class="font-headline-adult text-headline-adult text-sam-navy mb-stack-sm">
                        Welcome to the S.A.M. Family!
                    </h2>
<p class="font-body-regular text-body-regular text-sam-gray-mid">
                        You're just one step away from unlocking your child's mathematical journey. Please verify your email to get started with Atlas Assessment.
                    </p>
</div>
<div class="w-full bg-surface-container-low rounded-xl p-stack-md mb-stack-lg border border-sam-gray-light flex flex-col items-center">
<span class="font-caption text-caption text-sam-navy uppercase tracking-wider mb-stack-sm">Verification Code</span>
<div class="flex gap-2">
<span class="font-math-numeral text-math-numeral text-sam-red bg-white px-3 py-2 rounded-lg border-2 border-sam-red">4</span>
<span class="font-math-numeral text-math-numeral text-sam-red bg-white px-3 py-2 rounded-lg border-2 border-sam-red">9</span>
<span class="font-math-numeral text-math-numeral text-sam-red bg-white px-3 py-2 rounded-lg border-2 border-sam-red">2</span>
<span class="font-math-numeral text-math-numeral text-sam-red bg-white px-3 py-2 rounded-lg border-2 border-sam-red">8</span>
</div>
</div>
<div class="w-full mb-stack-lg">
<button class="w-full bg-sam-red text-white font-headline-adult py-4 rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all duration-200">
                        Verify Account Now
                    </button>
</div>
<div class="w-full border-t border-sam-gray-light pt-stack-md text-left">
<h3 class="font-caption text-caption text-sam-navy mb-stack-sm">Quick Instructions:</h3>
<ul class="space-y-2">
<li class="flex items-start gap-2">
<span class="material-symbols-outlined text-sam-teal shrink-0" style="font-size: 20px;">check_circle</span>
<span class="font-caption text-caption text-sam-gray-mid">Click the red button above to go to the verification page.</span>
</li>
<li class="flex items-start gap-2">
<span class="material-symbols-outlined text-sam-teal shrink-0" style="font-size: 20px;">check_circle</span>
<span class="font-caption text-caption text-sam-gray-mid">Enter the 4-digit code shown above when prompted.</span>
</li>
<li class="flex items-start gap-2">
<span class="material-symbols-outlined text-sam-teal shrink-0" style="font-size: 20px;">check_circle</span>
<span class="font-caption text-caption text-sam-gray-mid">Complete your profile to schedule your child's first assessment.</span>
</li>
</ul>
</div>
</div>
</main>
<footer class="mt-stack-lg w-full max-w-[600px] text-center">
<p class="font-caption text-caption text-sam-gray-mid mb-stack-sm">
                If you didn't create an account with S.A.M. Atlas Assessment, you can safely ignore this email.
            </p>
<div class="flex justify-center gap-stack-md mb-stack-md">
<a class="font-caption text-caption text-sam-navy underline decoration-sam-red underline-offset-4" href="#">Privacy Policy</a>
<a class="font-caption text-caption text-sam-navy underline decoration-sam-red underline-offset-4" href="#">Terms of Service</a>
<a class="font-caption text-caption text-sam-navy underline decoration-sam-red underline-offset-4" href="#">Help Center</a>
</div>
<p class="font-caption text-caption text-sam-gray-mid opacity-75">
                © 2024 S.A.M Atlas Assessment. All rights reserved.
            </p>
</footer>
</div>
</body></html>

<!-- Utility - Email: Report Ready -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;family=Inter:wght@400;500;600&amp;family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "tertiary-container": "#936f03",
                        "on-tertiary-container": "#fffbff",
                        "on-tertiary": "#ffffff",
                        "surface-container-low": "#f1f3ff",
                        "sam-navy": "#1B3A6B",
                        "secondary-fixed-dim": "#ffb780",
                        "on-primary-container": "#fffbff",
                        "on-surface": "#001a40",
                        "on-primary": "#ffffff",
                        "tertiary-fixed-dim": "#edc157",
                        "inverse-on-surface": "#edf0ff",
                        "on-tertiary-fixed": "#251a00",
                        "outline-variant": "#e4bebc",
                        "error": "#ba1a1a",
                        "on-error": "#ffffff",
                        "surface-dim": "#cadaff",
                        "inverse-surface": "#0d2f60",
                        "on-surface-variant": "#5b403f",
                        "sam-yellow": "#FFD166",
                        "sam-gray-dark": "#333333",
                        "surface-container": "#e8edff",
                        "primary-container": "#db313f",
                        "on-error-container": "#93000a",
                        "primary-fixed": "#ffdad8",
                        "on-secondary": "#ffffff",
                        "surface-container-high": "#e0e8ff",
                        "sam-gray-mid": "#777777",
                        "surface-container-lowest": "#ffffff",
                        "on-background": "#001a40",
                        "primary-fixed-dim": "#ffb3b1",
                        "sam-red": "#E63946",
                        "error-container": "#ffdad6",
                        "surface-tint": "#bb152c",
                        "secondary": "#8e4e14",
                        "on-primary-fixed": "#410007",
                        "inverse-primary": "#ffb3b1",
                        "surface-container-highest": "#d7e2ff",
                        "secondary-container": "#ffab69",
                        "secondary-fixed": "#ffdcc4",
                        "on-secondary-fixed-variant": "#6f3800",
                        "white": "#FFFFFF",
                        "tertiary-fixed": "#ffdf9b",
                        "surface-variant": "#d7e2ff",
                        "sam-orange": "#F4A261",
                        "background": "#f9f9ff",
                        "sam-cream": "#FFF8F0",
                        "on-secondary-fixed": "#2f1400",
                        "tertiary": "#755700",
                        "on-tertiary-fixed-variant": "#5b4300",
                        "surface": "#f9f9ff",
                        "surface-bright": "#f9f9ff",
                        "sam-gray-light": "#E5E5E5",
                        "sam-teal": "#06A77D",
                        "primary": "#b7102a",
                        "on-secondary-container": "#783d01",
                        "on-primary-fixed-variant": "#92001c",
                        "outline": "#8f6f6e"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "fontFamily": {
                        "caption": ["Inter"],
                        "body-regular": ["Inter"],
                        "headline-adult": ["Inter"],
                        "math-numeral": ["Plus Jakarta Sans"],
                        "display-child": ["Plus Jakarta Sans"]
                    },
                    "fontSize": {
                        "caption": ["14px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "500"}],
                        "body-regular": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
                        "headline-adult": ["24px", {"lineHeight": "1.4", "fontWeight": "600"}],
                        "math-numeral": ["32px", {"lineHeight": "1.0", "fontWeight": "600"}],
                        "display-child": ["36px", {"lineHeight": "1.2", "fontWeight": "700"}]
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
<body class="bg-sam-cream min-h-screen flex items-center justify-center p-4 md:p-8">
<!-- Email Container -->
<div class="max-w-[600px] w-full bg-white rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(27,58,107,0.08)]">
<!-- Top App Bar (Mocked for Email Header) -->
<header class="flex justify-between items-center w-full px-6 py-6 bg-white border-b border-slate-100">
<span class="text-xl font-bold text-slate-900 font-display-child">Atlas Assessment</span>
<div class="flex gap-4 text-sam-gray-mid">
<span class="material-symbols-outlined">notifications</span>
<span class="material-symbols-outlined">settings</span>
</div>
</header>
<!-- Hero Content Section -->
<main class="px-8 py-12 text-center">
<!-- Mascot Integration: Dash the Dachshund -->
<div class="mb-8 relative inline-block">
<div class="w-48 h-48 mx-auto rounded-full bg-sam-orange/10 flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
<img alt="Dash the Dachshund mascot wearing a small red tie and graduation cap, smiling enthusiastically" class="w-40 h-40 object-contain" data-alt="Illustration of a cute friendly dachshund mascot wearing a scholar cap, sitting proudly with a bright friendly expression in a soft 3D style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAC35FZTb-VC4ozQIglUVqwNyU6j7BVl2iSHUYbBBiD-jIKctxqn8SfsrTLsmW40YhxNGBf5SROxA8580rCB6rXodzeR7-QeQgutnygdh9aMxQ4Oed8KjRHne03XavkBBDWCpdii7bOC9b8UYtb0yirv3VWRjr0tOjZawbi3N-DNs36FMIB-Qq6PNVLqExDeBiJojFsQglVBtJhiDi1KzxcjIbZmMmTrBcb0L9UGcrl_Pc7pbNFME1ad3190MpQGNVfHD-tft-WL5Ha"/>
</div>
<!-- Speech Bubble -->
<div class="absolute -top-4 -right-12 bg-sam-navy text-white px-4 py-2 rounded-2xl rounded-bl-none shadow-md">
<p class="font-caption text-caption">Great news!</p>
</div>
</div>
<h1 class="font-display-child text-display-child text-sam-navy mb-4">Diagnostic Ready!</h1>
<p class="font-body-regular text-body-regular text-sam-gray-dark mb-10 max-w-[400px] mx-auto">
                Hello! We're excited to share that your child's mathematics diagnostic report is now available for review.
            </p>
<!-- Bento Grid Preview of Report Highlights -->
<div class="grid grid-cols-2 gap-4 mb-10 text-left">
<div class="bg-surface-container-low p-4 rounded-xl border border-white">
<span class="material-symbols-outlined text-sam-teal mb-2">trending_up</span>
<p class="font-caption text-caption text-sam-navy">Performance</p>
<p class="font-headline-adult text-headline-adult text-sam-teal">Excellent</p>
</div>
<div class="bg-surface-container-low p-4 rounded-xl border border-white">
<span class="material-symbols-outlined text-sam-orange mb-2">psychology</span>
<p class="font-caption text-caption text-sam-navy">Key Strength</p>
<p class="font-headline-adult text-headline-adult text-sam-orange">Logic</p>
</div>
</div>
<!-- Primary Action -->
<div class="mb-12">
<a class="inline-flex items-center justify-center bg-sam-red text-white font-headline-adult px-10 py-5 rounded-2xl shadow-lg hover:bg-primary transition-all active:scale-95" href="#">
                    View Dashboard
                    <span class="material-symbols-outlined ml-2">arrow_forward</span>
</a>
</div>
<div class="border-t border-slate-100 pt-8">
<p class="font-caption text-caption text-sam-gray-mid">
                    Want to see how these results compare to previous sessions? Visit the <a class="text-sam-red underline" href="#">History</a> tab in your dashboard.
                </p>
</div>
</main>
<!-- Footer -->
<footer class="bg-stone-50 py-8 px-6 text-center border-t border-slate-200">
<div class="mb-4">
<span class="font-display-child font-bold text-slate-800">S.A.M Atlas Assessment</span>
</div>
<div class="flex flex-wrap justify-center gap-4 mb-6">
<a class="font-caption text-slate-500 hover:text-slate-800 underline decoration-red-600 underline-offset-4 transition-all" href="#">Privacy Policy</a>
<a class="font-caption text-slate-500 hover:text-slate-800 underline decoration-red-600 underline-offset-4 transition-all" href="#">Terms of Service</a>
<a class="font-caption text-slate-500 hover:text-slate-800 underline decoration-red-600 underline-offset-4 transition-all" href="#">Help Center</a>
</div>
<p class="font-caption text-slate-400">© 2024 S.A.M Atlas Assessment. All rights reserved.</p>
</footer>
</div>
<!-- Mobile Navigation Bar (Mocked for context, though less relevant in an email) -->
<nav class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-white shadow-[0_-4px_12px_rgba(27,58,107,0.08)] rounded-t-xl">
<div class="flex flex-col items-center justify-center text-slate-500 font-['Plus_Jakarta_Sans'] text-xs font-semibold">
<span class="material-symbols-outlined">home</span>
<span>Home</span>
</div>
<div class="flex flex-col items-center justify-center text-red-600 bg-red-50 rounded-xl px-3 py-1 font-['Plus_Jakarta_Sans'] text-xs font-semibold">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">bar_chart</span>
<span>Insights</span>
</div>
<div class="flex flex-col items-center justify-center text-slate-500 font-['Plus_Jakarta_Sans'] text-xs font-semibold">
<span class="material-symbols-outlined">person</span>
<span>Profile</span>
</div>
</nav>
</body></html>
