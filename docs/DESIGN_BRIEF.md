# Commentoo — Design Brief

## Product

Interactive live comment + AI companion system for presentations.
Niconico-style overlay comments × Sli.do-like interaction × AI companion that quips and replies.
UI language: Japanese (primary).

## Three Surfaces

| Surface | Theme | Character |
|---|---|---|
| Participant app (mobile PWA) | **dark-first** | Used in dark venues. One-handed, portrait. QR scan → first comment in under 5 seconds. Comment feed, reaction bar (👏 🤣 ❓ 💡), poll popups |
| Admin dashboard (desktop web) | **light** | Calm business tool. Session list/detail, live comment moderation, poll creation, real-time stats |
| Desktop overlay (Electron) | **transparent** | Comments flow right-to-left over the presenter's slides. White bold text with shadow/outline, readable on any background |

## Design Principles

1. **The presenter is the star** — UI recedes; overlay is "maximum presence without interfering"
2. **Join in 5 seconds** — big tap targets, no onboarding, instant feedback
3. **Energy lives in motion** — flowing comments and emoji bursts carry the brand, not decoration
4. **AI is a distinct character** — AI comments are always identifiable at a glance (dedicated color + 🤖 badge), never mistaken for human comments

## Color Roles (only 4)

| Role | Token | Value | Usage |
|---|---|---|---|
| Spotlight | `primary` | `#5B50E3` (vivid indigo) | Buttons, actions, brand. Things the user taps |
| Companion | `ai` | `#19B8C9` (cyan) | AI comments, AI badge, AI settings — reserved for AI only |
| Cheer | `cheer` | `#F5A623` (amber) | Reactions, bursts, LIVE indicators, engagement |
| Backstage | neutrals | gray scale, dark `#15161C` / light `#FFFFFF` | Backgrounds, text, borders |

Plus standard semantic colors (destructive red, success green). shadcn/ui token naming (`primary`, `muted`, `destructive`...) + `ai` and `cheer` additions.

## Typography

- System font stack (Hiragino Sans / Noto Sans JP fallback) — no webfont loading
- 5-step scale: 12 / 14 / 16 / 20 / 28
- Overlay comments: bold weight fixed, text-shadow for legibility

## Motion

- Fast and snappy: 100–200ms for UI feedback
- Comment scroll and reaction bursts are the signature animations
- Rule: a late animation is skipped, never shown delayed

## Key Screens to Design

1. **Participant app**: join screen (code entry), comment feed + post form + reaction bar, poll voting popup
2. **Admin**: dashboard (session list), session detail (live monitor + moderation + poll controls + stats)
3. **Overlay**: flowing comments (user white / AI cyan), reaction burst, poll result overlay

## Constraints

- Tailwind CSS v4 + shadcn/ui — design must map to shadcn components
- Flat design: no gradients, no glassmorphism, minimal shadows
- Participant app must work for anonymous users (auto-generated nicknames like "青いペンギン")
