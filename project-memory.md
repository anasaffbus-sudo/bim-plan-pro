# BIM - AI BEP Project Memory

## Overview
- Project name: BIM Plan Pro.
- Type: static web application for generating BIM Execution Plans (BEP) aligned with ISO 19650.
- UI direction: Arabic by default with full bilingual Arabic/English support and RTL handling.

## Current Structure
- Entry page: index.html.
- Styles: css/styles.css.
- Main modules: js/app.js, js/dashboard.js, js/wizard.js, js/ai-engine.js, js/storage.js, js/i18n.js, js/firebase-auth.js.
- Reference material: multiple ISO 19650 PDF files stored in the project root.

## Implemented Functionality
- Marketing landing page and authenticated app shell exist in the same frontend.
- Sidebar navigation, topbar actions, modals, preview flow, and export controls are wired in the main app controller.
- Dashboard handles stats, recent projects, project listing/details, welcome card behavior, and profile-related UI reactions.
- Wizard implements a 5-step flow to collect project, team, and BIM setup data before generating a plan.
- AI engine generates BEP content in Arabic and English with ISO 19650-oriented sections, roles, LOD descriptions, BIM uses, and formatted project data.
- Local persistence is implemented with localStorage for projects and settings, including import/export support.
- Authentication supports Firebase Auth when configured, with a local fallback demo mode when Firebase credentials are not set.

## Verified Technical Notes
- Firebase config in js/firebase-auth.js still contains placeholder values, so production auth is not configured yet.
- External dependencies are loaded from CDN, including html2pdf.js, html-docx-js, Font Awesome, Google Fonts, and Firebase compat SDK.
- The app can still operate in a local-only mode because auth and storage have browser-based fallbacks.

## Files Reviewed On 2026-05-07
- index.html
- js/app.js
- js/ai-engine.js
- js/dashboard.js
- js/firebase-auth.js
- js/i18n.js
- js/storage.js
- js/wizard.js

## Backend (added 2026-05-07)
- Flask + SQLite backend added (app.py + bimplan.db auto-created on first run).
- Firebase replaced entirely by Flask API endpoints: /api/auth/*, /api/projects/*, /api/settings.
- storage.js rewritten to use in-memory cache synced to Flask API.
- firebase-auth.js rewritten to call Flask instead of Firebase.

## Deployment
- Platform: Render (Free tier)
- Service name: bim-plan-pro
- Live URL: https://bim-plan-pro.onrender.com  ← تُحدَّث بعد إتمام الربط
- Version: 1.0.0
- Launch date: 2026-05-07
- Branch: main
- Build command: pip install -r requirements.txt
- Start command: gunicorn app:app
- Env vars required in Render dashboard: SECRET_KEY
- Git commit: 6de4af3 — Initial commit (22 files)