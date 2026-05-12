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

## المصادقة (Authentication) — محدّث 2026-05-12
- النوع: Email/Password + Google OAuth 2.0
- مكتبة OAuth: authlib (Flask-OAuth2 client)
- جدول users: id, email, password_hash, name, company, photo, company_logo, provider, role, created_at
- مزوّدات الدخول (provider): 'password' أو 'google.com'
- الأدوار (role): 'user' (افتراضي) | 'admin'
- متغيّر البيئة ADMIN_EMAILS: قائمة بريد مفصولة بفاصلة → يحصلون تلقائياً على دور admin عند التسجيل/الدخول
- المسارات: /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/me, /api/auth/google/login, /api/auth/google/callback
- لوحة المشرف: /admin (admin.html) + GET /api/admin/users
- Decorators: login_required, admin_required
- آخر تفعيل: 2026-05-12 — commit 1eb1797

## Day 4 Course Progress
- Round 1 (Prompt 6 - Deploy): ✅ مكتمل — commit 6de4af3
- Round 2 (Prompt 7 - Landing 5 sections): ✅ مكتمل — commit 538c2e3
- Round 3 (Prompt 7B - Google OAuth + Admin roles): ✅ مكتمل — commit 1eb1797
- Round 4 (Prompt 8 - Pricing): ⏳ قيد الانتظار
- Round 5 (Prompt 9 - 10 launch messages): ⏳ قيد الانتظار
- Round 6: ⏳ قيد الانتظار

## ميزات إضافية
- Dark Mode toggle (data-theme="dark"/"light" + localStorage bimplan_theme) — commit bb39d76

## Deployment
- Platform: Render (Free tier)
- Service name: bim-plan-pro
- Live URL: https://bim-plan-pro.onrender.com  ✅ مؤكّد
- Render Service ID: srv-d7u5s1dckfvc73ell9pg
- GitHub Repo: https://github.com/anasaffbus-sudo/bim-plan-pro
- Version: 1.0.0
- Launch date: 2026-05-07
- Branch: main
- Build command: pip install -r requirements.txt
- Start command: gunicorn app:app
- Env vars required in Render dashboard: SECRET_KEY
- Git commit: 6de4af3 — Initial commit (22 files)