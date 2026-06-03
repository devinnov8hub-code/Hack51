# Hack51 — Next.js (App Router)

This project was converted from a Vite + React + React Router app to **Next.js 15** using the **App Router**.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
  layout.tsx            # Root layout (html/body, global CSS)
  page.tsx              # Redirects / → /dashboard
  (main)/
    layout.tsx          # Shell layout: Sidebar + Header wrapping all pages
    dashboard/page.tsx
    requests/page.tsx
    shortlists/page.tsx
    billing/page.tsx
    new-request/page.tsx

components/
  Header.tsx
  Sidebar.tsx
  RequestTable.tsx
  ChallengeCard.tsx
  StepContent.tsx
  StepIndicator.tsx
  DashboardClient.tsx
  steps/
    Challenge.tsx
    ChallengeEditor.tsx
    Checkout.tsx
    Completion.tsx
    RequestPreview.tsx
    RoleDetails.tsx
    RubricEditor.tsx
    SelectRole.tsx
    SkillLevel.tsx

public/
  logo.png
  icons/           ← Place your SVG icons here
```

## Key Migration Changes

| React (Vite)              | Next.js (App Router)                     |
|---------------------------|------------------------------------------|
| `react-router-dom`        | Next.js file-based routing               |
| `<BrowserRouter>`         | Removed — routing is built-in            |
| `useNavigate()`           | `useRouter()` from `next/navigation`     |
| `<Link>` (react-router)   | `<Link>` from `next/link`               |
| `<Outlet>`                | `{children}` in layout                  |
| `<img>`                   | `<Image>` from `next/image`             |
| `vite.config.ts`          | `next.config.ts`                        |
| `index.html`              | `app/layout.tsx` (root layout)          |

## Notes

- Components using hooks (`useState`, `useRouter`, etc.) are marked `"use client"`.
- Server Components (no client-side interactivity) render on the server by default.
- Add your SVG icons to `public/icons/` to restore sidebar icons.
