/* ===============================================================
   Plans · Team · Templates Library
   Day 4 - Round 4 features (Pro / Enterprise gating)
   =============================================================== */
'use strict';

const Plans = (function () {
    let _plan = 'starter';
    let _features = { company_logo: false, team_sharing: false, templates_library: false };
    let _teamLimit = 0;

    const RANK = { starter: 0, pro: 1, enterprise: 2 };

    async function refresh() {
        try {
            const res = await fetch('/api/plan', { credentials: 'same-origin' });
            if (!res.ok) return;
            const data = await res.json();
            _plan = data.plan || 'starter';
            _features = data.features || _features;
            _teamLimit = data.team_limit || 0;
            _applyGating();
        } catch (e) { /* offline */ }
    }

    function getPlan() { return _plan; }
    function features() { return _features; }
    function teamLimit() { return _teamLimit; }
    function has(min) { return (RANK[_plan] || 0) >= (RANK[min] || 0); }

    async function upgrade(plan) {
        const res = await fetch('/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ plan: plan })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'فشلت الترقية');
        }
        await refresh();
        return true;
    }

    function _applyGating() {
        // Sidebar: Team nav item
        const navTeam = document.getElementById('navTeam');
        if (navTeam) navTeam.classList.toggle('hidden', !_features.team_sharing);

        // Profile: Company logo section lock
        const logoLock = document.getElementById('profileLogoLock');
        const logoSection = document.getElementById('profileLogoSection');
        if (logoLock && logoSection) {
            const locked = !_features.company_logo;
            logoLock.classList.toggle('hidden', !locked);
            logoSection.classList.toggle('section-locked', locked);
        }

        // Templates: Library tab access
        const libTab = document.getElementById('templatesLibraryTab');
        if (libTab) {
            // Tab is always visible but content is gated
        }
    }

    return { refresh, getPlan, features, teamLimit, has, upgrade };
})();


/* ---------- Team Page ---------- */
const Team = (function () {
    let _state = { plan: 'starter', limit: 0, count: 0, members: [] };

    async function load() {
        const panel = document.getElementById('teamPanel');
        const locked = document.getElementById('teamLocked');
        const subtitle = document.getElementById('teamSubtitle');
        if (!Plans.features().team_sharing) {
            if (panel) panel.classList.add('hidden');
            if (locked) locked.classList.remove('hidden');
            return;
        }
        if (panel) panel.classList.remove('hidden');
        if (locked) locked.classList.add('hidden');

        try {
            const res = await fetch('/api/team', { credentials: 'same-origin' });
            if (!res.ok) return;
            _state = await res.json();
            _render();
        } catch (e) {}
    }

    function _render() {
        const count = document.getElementById('teamCount');
        const limit = document.getElementById('teamLimit');
        const planL = document.getElementById('teamPlanLabel');
        const list  = document.getElementById('teamList');
        if (count) count.textContent = _state.count;
        if (limit) limit.textContent = _state.limit >= 999 ? '∞' : _state.limit;
        if (planL) planL.textContent = (_state.plan || 'starter').toUpperCase();

        if (!list) return;
        if (!_state.members || _state.members.length === 0) {
            list.innerHTML = '<p class="team-empty">' + I18n.t('team_empty') + '</p>';
            return;
        }
        list.innerHTML = _state.members.map(m => {
            const initial = (m.name || m.email || '?').charAt(0).toUpperCase();
            const dateStr = m.invited_at ? new Date(m.invited_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
            return '<div class="team-member-row">' +
                '<div class="team-avatar">' + initial + '</div>' +
                '<div class="team-info">' +
                    '<strong>' + (m.name ? _esc(m.name) : _esc(m.email)) + '</strong>' +
                    '<span class="team-email">' + _esc(m.email) + '</span>' +
                '</div>' +
                '<div class="team-meta">' + dateStr + '</div>' +
                '<button class="btn-icon btn-icon-danger" data-remove-member="' + m.id + '" title="إزالة"><i class="fas fa-trash"></i></button>' +
            '</div>';
        }).join('');

        list.querySelectorAll('[data-remove-member]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('إزالة هذا العضو؟')) return;
                await fetch('/api/team/' + btn.dataset.removeMember, { method: 'DELETE', credentials: 'same-origin' });
                await load();
            });
        });
    }

    async function invite(email, name) {
        const errEl = document.getElementById('teamError');
        if (errEl) errEl.classList.add('hidden');
        try {
            const res = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ email: email, name: name })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'فشلت الدعوة');
            await load();
            return true;
        } catch (e) {
            if (errEl) {
                errEl.textContent = e.message;
                errEl.classList.remove('hidden');
            }
            return false;
        }
    }

    function _esc(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function bind() {
        const form = document.getElementById('teamInviteForm');
        if (form && !form.dataset.bound) {
            form.dataset.bound = '1';
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('teamInviteEmail').value.trim();
                const name  = document.getElementById('teamInviteName').value.trim();
                if (!email) return;
                const ok = await invite(email, name);
                if (ok) form.reset();
            });
        }
        const upBtn = document.getElementById('teamUpgradeBtn');
        if (upBtn && !upBtn.dataset.bound) {
            upBtn.dataset.bound = '1';
            upBtn.addEventListener('click', () => _scrollToLandingPricing());
        }
    }

    function _scrollToLandingPricing() {
        // Open pricing dialog in-app
        if (typeof PricingDialog !== 'undefined') PricingDialog.open();
    }

    return { load, bind };
})();


/* ---------- Templates Library (Enterprise) ---------- */
const TemplatesLibrary = (function () {
    let _loaded = false;

    async function load() {
        const locked = document.getElementById('libraryLocked');
        const grid   = document.getElementById('libraryGrid');
        if (!locked || !grid) return;

        if (!Plans.features().templates_library) {
            locked.classList.remove('hidden');
            grid.classList.add('hidden');
            return;
        }
        locked.classList.add('hidden');
        grid.classList.remove('hidden');
        if (_loaded) return;

        try {
            const res = await fetch('/api/templates', { credentials: 'same-origin' });
            if (!res.ok) return;
            const data = await res.json();
            _render(data.templates || []);
            _loaded = true;
        } catch (e) {}
    }

    function _render(templates) {
        const grid = document.getElementById('libraryGrid');
        const ar = I18n.getCurrentLang() === 'ar';
        grid.innerHTML = templates.map(t => {
            const name = ar ? t.name_ar : t.name_en;
            const desc = ar ? t.desc_ar : t.desc_en;
            const tags = (t.tags || []).map(tg => '<span class="lib-tag">' + tg + '</span>').join('');
            const sections = (t.sections || []).map(s => '<li>' + s + '</li>').join('');
            return '<div class="library-card" data-tpl="' + t.id + '">' +
                '<div class="library-card-head">' +
                    '<h3>' + name + '</h3>' +
                    '<div class="library-tags">' + tags + '</div>' +
                '</div>' +
                '<p class="library-desc">' + desc + '</p>' +
                '<ul class="library-sections">' + sections + '</ul>' +
                '<button class="btn btn-outline btn-block" data-use-tpl="' + t.id + '">' +
                    '<i class="fas fa-plus"></i> ' + (ar ? 'استخدام في مشروع جديد' : 'Use in new project') +
                '</button>' +
            '</div>';
        }).join('');
        grid.querySelectorAll('[data-use-tpl]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof App !== 'undefined' && App.navigateTo) App.navigateTo('wizard');
            });
        });
    }

    function bind() {
        const tabs = document.querySelectorAll('.templates-tab');
        const contents = document.querySelectorAll('[data-tab-content]');
        tabs.forEach(t => {
            if (t.dataset.bound) return;
            t.dataset.bound = '1';
            t.addEventListener('click', () => {
                tabs.forEach(x => x.classList.remove('active'));
                contents.forEach(x => x.classList.remove('active'));
                t.classList.add('active');
                const target = document.querySelector('[data-tab-content="' + t.dataset.tab + '"]');
                if (target) target.classList.add('active');
                if (t.dataset.tab === 'library') load();
            });
        });
        const up = document.getElementById('libraryUpgradeBtn');
        if (up && !up.dataset.bound) {
            up.dataset.bound = '1';
            up.addEventListener('click', () => {
                if (typeof PricingDialog !== 'undefined') PricingDialog.open();
            });
        }
    }

    return { load, bind };
})();


/* ---------- Pricing Dialog (in-app upgrade) ---------- */
const PricingDialog = (function () {
    function open() {
        let dlg = document.getElementById('pricingDialog');
        if (!dlg) dlg = _create();
        dlg.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    function close() {
        const dlg = document.getElementById('pricingDialog');
        if (dlg) dlg.classList.add('hidden');
        document.body.style.overflow = '';
    }
    function _create() {
        const dlg = document.createElement('div');
        dlg.id = 'pricingDialog';
        dlg.className = 'modal-overlay hidden';
        dlg.innerHTML =
            '<div class="modal-card modal-card-wide">' +
                '<div class="modal-head">' +
                    '<h2><i class="fas fa-rocket"></i> ' + I18n.t('upgrade_dialog_title') + '</h2>' +
                    '<button class="modal-close" id="pricingDlgClose">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<p class="modal-sub">' + I18n.t('upgrade_dialog_sub') + '</p>' +
                    '<div class="upgrade-options">' +
                        _planBtn('pro', I18n.t('pricing_p2_name'), '349 SAR', I18n.t('pricing_p2_ideal')) +
                        _planBtn('enterprise', I18n.t('pricing_p3_name'), '999 SAR', I18n.t('pricing_p3_ideal')) +
                    '</div>' +
                    '<p class="modal-note">' + I18n.t('upgrade_demo_note') + '</p>' +
                '</div>' +
            '</div>';
        document.body.appendChild(dlg);
        dlg.querySelector('#pricingDlgClose').addEventListener('click', close);
        dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
        dlg.querySelectorAll('[data-upgrade]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const plan = btn.dataset.upgrade;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                try {
                    await Plans.upgrade(plan);
                    close();
                    alert(I18n.t('upgrade_success') + ' ' + plan.toUpperCase());
                    location.reload();
                } catch (e) {
                    alert(e.message);
                    btn.disabled = false;
                }
            });
        });
        return dlg;
    }
    function _planBtn(plan, name, price, desc) {
        return '<button class="upgrade-card" data-upgrade="' + plan + '">' +
            '<div class="upgrade-name">' + name + '</div>' +
            '<div class="upgrade-price">' + price + '<span>/ ' + I18n.t('pricing_per_month').replace(/^\/ ?/, '') + '</span></div>' +
            '<div class="upgrade-desc">' + desc + '</div>' +
            '<div class="upgrade-cta">' + I18n.t('upgrade_now') + ' <i class="fas fa-arrow-left"></i></div>' +
        '</button>';
    }
    return { open, close };
})();

/* ---------- Global wiring ---------- */
document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (e) {
        const t = e.target.closest('[data-go-pricing]');
        if (t) {
            e.preventDefault();
            PricingDialog.open();
        }
    });
});
