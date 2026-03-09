---
name: award-winning-ui
description: >
  Build production-grade, award-winning websites and applications with intentional design systems — not generic AI-generated UI. Use this skill whenever the user asks to create, design, or build any website, web app, landing page, dashboard, portfolio, e-commerce page, SaaS UI, admin panel, marketing site, or any frontend interface. Also trigger when the user asks to "make it look good", "improve the design", "make it production-ready", "redesign", or mentions wanting something that looks professional, polished, or award-winning. This skill enforces a design-system-first workflow and anti-vibe-coding principles to produce distinctive, intentional UI that would hold up on Awwwards, not look like every other AI-generated site. Trigger aggressively — if there's a frontend being built, this skill should be consulted.
---

# Award-Winning UI

Build websites and apps that look like a senior designer and senior engineer collaborated on them — not like an AI guessed at what "modern" looks like.

This skill enforces a strict **design-system-first** workflow. You never write a single line of UI code before defining your design tokens. The output should feel like it belongs on Awwwards or in a Stripe/Linear/Vercel-tier product — intentional, cohesive, and distinctive.

---

## Phase 0: Research (Use MCPs When Available)

Before designing anything, understand the domain. If Brave Search or Firecrawl MCPs are available, use them:

1. **Search for best-in-class references** in the user's domain. Examples:
   - User wants a SaaS dashboard → search "best SaaS dashboard design 2025", "linear app design", "vercel dashboard UI"
   - User wants a landing page → search "awwwards landing page [industry]", "best [industry] website design"
   - User wants e-commerce → search "best DTC brand websites", "shopify plus design examples"

2. **Crawl 2-3 reference sites** with Firecrawl to study their actual implementation patterns — color usage, spacing rhythms, typography choices, layout structures.

3. **Extract patterns**, not pixels. You're looking for:
   - How they handle information hierarchy
   - Their spacing rhythm (is it 4px base? 8px?)
   - Color distribution (how much primary vs neutral vs accent)
   - Typography pairing strategy
   - Motion/interaction philosophy

If MCPs aren't available, draw from your knowledge of award-winning sites (Linear, Stripe, Vercel, Raycast, Arc, Figma, Notion, Apple) and state which references you're drawing from.

**Always tell the user** what references you studied and why you're making the design choices you are.

---

## Phase 1: Design System Definition (MANDATORY)

Never skip this. Before any UI code, define these tokens explicitly. Write them as CSS custom properties or Tailwind config — whichever fits the output format.

### 1.1 Color System

Define a complete palette with purpose:

```
--color-bg-primary        /* Main background */
--color-bg-secondary      /* Card/section backgrounds */
--color-bg-tertiary       /* Subtle depth layers */
--color-text-primary      /* Headings, important text */
--color-text-secondary    /* Body copy */
--color-text-tertiary     /* Captions, metadata */
--color-accent-primary    /* CTAs, key interactive elements */
--color-accent-secondary  /* Secondary actions, highlights */
--color-border            /* Dividers, card borders */
--color-border-subtle     /* Very light separators */
```

**Rules:**
- No purple gradients unless the brand is literally purple. This is the single biggest tell of AI-generated UI.
- Charts and data viz use shades/tints of ONE primary color, not rainbow. Reserve a second color only for contrast/comparison data.
- Accent colors appear sparingly — if everything is accented, nothing is.
- Dark themes need at least 3 distinct background levels for depth.
- Light themes need careful contrast ratios, not just "white background gray text."

### 1.2 Typography Scale

Define a strict scale and never deviate:

```
--font-display            /* Display/hero: distinctive, characterful */
--font-heading            /* Headings: clear hierarchy */  
--font-body               /* Body: optimized for reading */
--font-mono               /* Code/data: if needed */

--text-xs                 /* 12px - captions, labels */
--text-sm                 /* 14px - secondary info */
--text-base               /* 16px - body copy */
--text-lg                 /* 18-20px - lead paragraphs */
--text-xl                 /* 24px - section headings */
--text-2xl                /* 30-32px - page headings */
--text-3xl                /* 36-48px - hero headings */
--text-display            /* 48-72px+ - display text */
```

**Rules:**
- Never pair oversized headings with ultra-thin body text. The weight contrast should feel intentional, not broken.
- Consistent line-height: headings ~1.1-1.2, body ~1.5-1.6. Define these, don't wing it.
- Font choices must be distinctive. Banned defaults: Inter, Roboto, Arial, system-ui as primary fonts. Use them only as fallbacks.
- Pair a characterful display font with a highly readable body font. Source from Google Fonts or known CDNs.

### 1.3 Spacing System

Use a base unit and derive everything:

```
--space-unit: 4px;        /* Base unit */
--space-xs: 4px;          /* Tight gaps */
--space-sm: 8px;          /* Related element gaps */
--space-md: 16px;         /* Component internal padding */
--space-lg: 24px;         /* Section padding */
--space-xl: 32px;         /* Major section gaps */
--space-2xl: 48px;        /* Page-level spacing */
--space-3xl: 64px;        /* Hero/feature spacing */
--space-4xl: 96px;        /* Major landmarks */
```

Every margin, padding, and gap must reference this scale. If you catch yourself typing `margin: 13px`, stop — that signals vibe-coding.

### 1.4 Border Radius

Define 2-3 values maximum:

```
--radius-sm: 6px;         /* Buttons, inputs, tags */
--radius-md: 12px;        /* Cards, panels */
--radius-lg: 20px;        /* Hero cards, modals */
--radius-full: 9999px;    /* Pills, avatars */
```

Mixing 4px, 8px, 12px, 16px, and 24px radii across a page is a vibe-code tell. Pick your values and commit.

### 1.5 Shadows & Elevation

```
--shadow-sm               /* Subtle cards, dropdowns */
--shadow-md               /* Elevated cards, popovers */
--shadow-lg               /* Modals, floating elements */
```

Shadows should use the palette colors (tinted shadows), not pure black. This is a small detail that separates good from great.

### 1.6 Motion

```
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);    /* General transitions */
--ease-in: cubic-bezier(0.4, 0, 1, 1);            /* Elements entering */
--ease-out: cubic-bezier(0, 0, 0.2, 1);           /* Elements leaving */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1); /* Playful emphasis */

--duration-fast: 150ms;    /* Hovers, toggles */
--duration-base: 250ms;    /* Most transitions */
--duration-slow: 400ms;    /* Page transitions, reveals */
```

Every animation needs an easing curve. Linear transitions are banned. `transition: all 0.3s` is banned — be explicit about what property transitions and use your defined easings.

---

## Phase 2: Build

Now — and only now — write the UI code.

### Output Format Selection

- **React (.jsx)**: For interactive components, dashboards, apps with state. Use Tailwind utility classes (core set only), React hooks, and available libraries (recharts, lucide-react, shadcn/ui, d3, three.js, framer-motion patterns via CSS).
- **HTML/CSS/JS**: For landing pages, marketing sites, portfolios, or when the user wants a single portable file. Inline everything. Import external scripts from cdnjs.cloudflare.com.
- **Multi-file projects**: For full apps (Next.js, Astro, etc.) when the user explicitly asks. Structure properly with components, layouts, and shared design tokens.

### Layout Principles

- Use CSS Grid and Flexbox with intention. Every layout choice should be justifiable.
- Embrace asymmetry when it serves the content. Centered-everything is the safest (and dullest) choice.
- Create visual rhythm through alternating spacing densities — tight groups of related elements with generous breathing room between sections.
- For dashboards: compact information density. No landing-page-style whitespace on data screens. KPIs go top-left or top-center.
- For marketing: generous whitespace is fine, but it must feel intentional, not empty.

### Component Patterns

- Identical component styles across the entire page. If one card has 12px radius with a 1px border, every card does.
- Icon sizing is proportional to adjacent text. A 24px icon next to 14px text looks broken.
- Hover states are subtle: 2-4px translate max, slight shadow increase, color shift. No glowing neon outlines.
- Every interactive element has a hover, focus, and active state defined.
- Remove non-functional social media icons. If links go nowhere, they don't exist.

### Content & Copy

- No sparkle emojis (✨) or rocket ships (🚀) in headings. Ever.
- No vague filler copy: "Launch faster", "Build your dreams", "Create without limits", "Reimagine the future". Write specific, concrete copy or use realistic placeholder text that sounds like a real company.
- No fake testimonials. No "Sarah Chen, CEO at TechCorp." If you need testimonials, clearly mark them as placeholders or use realistic but obviously fictional companies.
- No em-dash overuse. One per page maximum.
- Dashboard empty states: never show an empty table. Show a helpful empty state with an illustration or clear message and a CTA.

### Animation Rules

- Every animation serves a purpose: guiding attention, confirming interaction, establishing hierarchy, or creating delight.
- Stagger animations intentionally with calculated delays, not random offsets.
- Page load: one well-orchestrated entrance sequence beats scattered animations.
- Scroll-triggered animations should be subtle — parallax and reveals, not fireworks.
- Prefers-reduced-motion: always respect it with a media query fallback.

### Interactive States & UX

- Loading states for every async action. No button that does nothing while data loads.
- Progress indicators: spinners for quick operations, progress bars for longer ones.
- Skeleton screens for data-heavy sections instead of blank space or spinners.
- Every toggle, carousel, tab, and accordion must be functional, not decorative.
- Form validation with inline, real-time feedback.

---

## Phase 3: Review Checklist

Before delivering, verify every item:

**Design System Integrity**
- [ ] All colors reference the defined palette
- [ ] All font sizes reference the type scale
- [ ] All spacing values reference the spacing system
- [ ] Border radius uses only the defined 2-3 values
- [ ] All transitions use defined easing curves and durations

**Anti-Vibe-Code Check**
- [ ] No purple gradient (unless brand-appropriate)
- [ ] No sparkle/rocket emojis in headings
- [ ] No generic filler copy ("Launch faster", "Build dreams")
- [ ] No fake testimonials with stereotypical names
- [ ] No rainbow data visualization — one color family for charts
- [ ] No non-functional social icons or dead links
- [ ] No oversized heading + ultra-thin body mismatch
- [ ] No `transition: all 0.3s` — all transitions are explicit
- [ ] No inconsistent border-radius values
- [ ] No random spacing values outside the system

**Quality Check**
- [ ] Responsive: works at 320px, 768px, 1024px, 1440px
- [ ] Accessible: proper contrast ratios (4.5:1 body, 3:1 large), focus states, semantic HTML
- [ ] Interactive: all buttons/links have hover + focus + active states
- [ ] Loading: async operations have loading indicators
- [ ] Empty: data tables/lists have empty state designs
- [ ] Motion: respects prefers-reduced-motion

---

## Design Direction Examples

When the user doesn't specify a style, choose one deliberately based on the domain. Here are directions to draw from — mix and adapt, never apply these as rigid templates:

**Editorial/Magazine** — Strong typographic hierarchy, generous whitespace, dramatic scale contrasts, serif/sans-serif pairing, pull quotes, column layouts. Good for: portfolios, blogs, luxury brands.

**Technical/Precision** — Monospace accents, tight grids, high information density, muted palette with single sharp accent, visible grid lines. Good for: developer tools, SaaS, dashboards.

**Organic/Warm** — Rounded shapes, warm color palette, hand-drawn or illustrated elements, soft shadows, natural textures. Good for: consumer apps, food/wellness brands, community platforms.

**Brutalist/Raw** — Visible structure, bold type, raw borders, limited color, confrontational layout, intentionally "undesigned" but actually very controlled. Good for: agencies, creative studios, statements.

**Luxury/Refined** — Restrained palette (near-monochrome with gold/copper accent), delicate type, ample negative space, subtle motion, premium photography treatment. Good for: high-end products, fashion, finance.

**Playful/Dynamic** — Bold colors, animated elements, unexpected interactions, custom illustrations, personality-driven copy. Good for: consumer products, startups, entertainment.

---

## Key Principle

A design system is a set of decisions, not a set of components. When you define your tokens in Phase 1, you're making decisions that cascade through every pixel. If something looks "off," it's almost always because a value doesn't trace back to the system.

Inconsistency is the single biggest signal of AI-generated UI — more than any individual bad choice. A cohesive, well-executed design in an unexpected direction will always beat a technically correct but incoherent page that borrowed from 10 different Dribbble shots.

Commit to a direction. Execute it with precision. Ship something you'd be proud to put your name on.
