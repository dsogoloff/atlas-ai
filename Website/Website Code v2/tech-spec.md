# SAM New York Website - Technical Specification

---

## Component Inventory

### shadcn/ui Components (Built-in)

| Component | Purpose | Customization |
|-----------|---------|---------------|
| Button | CTAs, navigation actions | Orange primary variant, custom sizing |
| Card | Program cards, blog cards, testimonials | Custom shadows, hover states |
| Accordion | FAQ page | Custom styling, animation |
| Dialog | Mobile menu, video modal | Slide-in for mobile |
| Sheet | Mobile navigation drawer | Right-side slide |
| Carousel | Hero slider, testimonials | Custom dots, auto-play |
| Badge | Tags, labels | Primary/secondary variants |
| Separator | Section dividers | Custom color |
| ScrollArea | Content scrolling | Smooth scroll |

### Custom Components to Build

| Component | Purpose | Props |
|-----------|---------|-------|
| `Navigation` | Sticky header with scroll effects | `isScrolled`, `mobileMenuOpen` |
| `HeroCarousel` | Image carousel with text overlay | `slides[]`, `autoPlay`, `interval` |
| `StatCounter` | Animated number counter | `value`, `suffix`, `duration` |
| `SectionReveal` | Scroll-triggered fade-in wrapper | `children`, `delay`, `direction` |
| `TestimonialCard` | Quote card with attribution | `quote`, `author`, `childInfo` |
| `ProgramCard` | Program overview card | `title`, `ageRange`, `description`, `image` |
| `ComparisonTable` | SAM vs Others table | `features[]` |
| `TeamCard` | Team member card | `name`, `title`, `bio`, `image` |
| `BlogCard` | Blog post preview | `title`, `excerpt`, `date`, `image`, `slug` |
| `Footer` | Multi-column footer | - |
| `CTAButton` | Primary call-to-action | `children`, `href`, `size` |

---

## Animation Implementation Table

| Animation | Library | Implementation Approach | Complexity |
|-----------|---------|------------------------|------------|
| Page load fade-in | Framer Motion | `AnimatePresence` + initial/animate states | Low |
| Scroll reveal (fade-in-up) | Framer Motion | `useInView` hook + `motion.div` | Medium |
| Stagger children | Framer Motion | `staggerChildren` in parent variants | Medium |
| Navigation scroll effect | React + CSS | `useScroll` hook, toggle classes | Low |
| Hero carousel | Framer Motion | `AnimatePresence` with slide variants | Medium |
| Statistics counter | Custom hook | `useCountUp` with requestAnimationFrame | Medium |
| Card hover lift | CSS/Framer | `whileHover` transform + shadow | Low |
| Button hover scale | CSS | `transform: scale(1.02)` transition | Low |
| Mobile menu slide | Framer Motion | `Sheet` component with slide animation | Low |
| Testimonial carousel | Framer Motion | Auto-advance with `AnimatePresence` | Medium |
| Accordion expand | Framer Motion | `AnimatePresence` + height animation | Medium |
| Link underline | CSS | `::after` pseudo-element width animation | Low |

---

## Animation Library Choices

### Primary: Framer Motion
**Rationale**: 
- Declarative React animations
- Built-in `useInView` for scroll triggers
- `AnimatePresence` for enter/exit animations
- Excellent TypeScript support
- Gesture support (hover, tap)

### Secondary: CSS Transitions/Animations
**Rationale**:
- Simple hover states
- Performance-critical micro-interactions
- Reduced motion support

### Custom Hooks Needed

1. **`useScrollPosition`**
   - Returns current scroll Y position
   - Used for navigation background change

2. **`useCountUp`**
   - Animates number from 0 to target
   - Configurable duration and easing
   - Triggers on scroll into view

3. **`useInView`**
   - Detects when element enters viewport
   - Configurable threshold
   - Used for scroll reveal animations

---

## Project File Structure

```
/mnt/okcomputer/output/app/
├── public/
│   ├── images/
│   │   ├── hero/
│   │   ├── programs/
│   │   ├── team/
│   │   └── blog/
│   └── fonts/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── Navigation.tsx
│   │   ├── Footer.tsx
│   │   ├── HeroCarousel.tsx
│   │   ├── StatCounter.tsx
│   │   ├── SectionReveal.tsx
│   │   ├── TestimonialCard.tsx
│   │   ├── ProgramCard.tsx
│   │   ├── ComparisonTable.tsx
│   │   ├── TeamCard.tsx
│   │   ├── BlogCard.tsx
│   │   └── CTAButton.tsx
│   ├── hooks/
│   │   ├── useScrollPosition.ts
│   │   ├── useCountUp.ts
│   │   └── useInView.ts
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── Statistics.tsx
│   │   ├── ValueProposition.tsx
│   │   ├── Programs.tsx
│   │   ├── Comparison.tsx
│   │   ├── Testimonials.tsx
│   │   ├── Team.tsx
│   │   ├── VideoSection.tsx
│   │   ├── LocalContext.tsx
│   │   ├── BlogPreview.tsx
│   │   └── BottomCTA.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── WhySAM.tsx
│   │   ├── Programs.tsx
│   │   ├── SingaporeMath.tsx
│   │   ├── Testimonials.tsx
│   │   ├── About.tsx
│   │   ├── FAQ.tsx
│   │   ├── Blog.tsx
│   │   └── BookAssessment.tsx
│   ├── lib/
│   │   └── utils.ts
│   ├── data/
│   │   ├── testimonials.ts
│   │   ├── programs.ts
│   │   ├── team.ts
│   │   ├── faq.ts
│   │   └── blog.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── components.json
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## Dependencies

### Core
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0"
}
```

### Animation
```json
{
  "framer-motion": "^10.16.0"
}
```

### UI Components
```json
{
  "@radix-ui/react-accordion": "^1.1.2",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-slot": "^1.0.2",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.0.0",
  "lucide-react": "^0.294.0"
}
```

### Styling
```json
{
  "tailwindcss": "^3.3.0",
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.32"
}
```

---

## Color Configuration (Tailwind)

```javascript
// tailwind.config.js
colors: {
  'sam-blue': '#1A5276',
  'sam-orange': '#E67E22',
  'sam-light': '#D6EAF8',
  'sam-dark': '#333333',
  'sam-gray': '#7F8C8D',
}
```

---

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

---

## Performance Considerations

1. **Image Optimization**
   - Use WebP format where possible
   - Lazy load below-fold images
   - Proper sizing with srcset

2. **Animation Performance**
   - Use `transform` and `opacity` only
   - Add `will-change` sparingly
   - Respect `prefers-reduced-motion`

3. **Code Splitting**
   - Route-based code splitting
   - Lazy load heavy components

4. **Font Loading**
   - Use `font-display: swap`
   - Preload critical fonts

---

## Accessibility Requirements

1. **WCAG 2.1 AA Compliance**
   - Color contrast ratio 4.5:1 minimum
   - Focus indicators on interactive elements
   - Keyboard navigation support

2. **Reduced Motion**
   - Disable animations when `prefers-reduced-motion: reduce`
   - Provide static alternatives

3. **Semantic HTML**
   - Proper heading hierarchy
   - ARIA labels where needed
   - Landmark regions

---
