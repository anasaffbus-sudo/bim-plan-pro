/**
 * BIM Plan Pro - Main Application Controller
 * Handles navigation, initialization, and global events
 */
const App = (() => {
    let currentPage = 'dashboard';

    function init() {
        I18n.init();
        Wizard.init();
        Dashboard.init();
        _bindNavigation();
        _bindGlobalEvents();
        _bindModalEvents();
        _bindPreviewModal();
        _bindSettingsEvents();
        _bindLangToggle();
        _bindThemeToggle();
        _bindAuthModal();
        _bindLanding();
    }

    function _enterApp() {
        document.getElementById('landingPage').style.display = 'none';
        document.getElementById('sidebar').style.display = '';
        document.getElementById('mainContent').style.display = '';
        sessionStorage.setItem('bimplan_entered', '1');
        // تحميل مشاريع المستخدم وإعداداته من الخادم ثم تحديث لوحة التحكم
        StorageManager.init().then(function () {
            Dashboard.refresh();
        });
    }

    function _backToLanding() {
        document.getElementById('sidebar').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('landingPage').style.display = '';
        document.getElementById('sidebar').classList.remove('open');
        sessionStorage.removeItem('bimplan_entered');
    }

    function _openAuthFromLanding() {
        if (Auth.isLoggedIn()) {
            _enterApp();
        } else {
            _updateAuthModalView();
            document.getElementById('authModal').classList.add('active');
        }
    }

    function _bindLanding() {
        // Back to landing (always bind)
        var backBtn = document.getElementById('backToLandingBtn');
        if (backBtn) backBtn.addEventListener('click', _backToLanding);

        // Start buttons — require login
        var startBtn = document.getElementById('landingStartBtn');
        var startBtnTop = document.getElementById('landingStartBtnTop');
        var startBtnFinal = document.getElementById('landingStartBtnFinal');
        if (startBtn) startBtn.addEventListener('click', _openAuthFromLanding);
        if (startBtnTop) startBtnTop.addEventListener('click', _openAuthFromLanding);
        if (startBtnFinal) startBtnFinal.addEventListener('click', _openAuthFromLanding);

        // Landing lang toggle
        var landingLang = document.getElementById('landingLangBtn');
        if (landingLang) {
            landingLang.addEventListener('click', function () {
                I18n.toggleLanguage();
                var span = landingLang.querySelector('span');
                if (span) span.textContent = I18n.getCurrentLang() === 'ar' ? 'EN' : 'AR';
            });
        }

        // If already entered the app in this session AND logged in, skip landing
        if (sessionStorage.getItem('bimplan_entered') && Auth.isLoggedIn()) {
            _enterApp();
        }
    }

    function _bindNavigation() {
        // Sidebar nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(item.dataset.page);
            });
        });

        // View all links
        document.querySelectorAll('.view-all').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(link.dataset.page);
            });
        });

        // Start wizard buttons (delegated for dynamic content)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.start-wizard-btn');
            if (btn) {
                e.preventDefault();
                Wizard.reset();
                navigateTo('wizard');
            }
        });

        // Template buttons
        document.querySelectorAll('.use-template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Wizard.reset();
                navigateTo('wizard');
                // Pre-fill project type
                const type = btn.dataset.type;
                if (type) {
                    document.getElementById('projectType').value = type;
                }
            });
        });

        // New plan button
        document.getElementById('newPlanBtn').addEventListener('click', () => {
            navigateTo('templates');
        });
    }

    function _bindGlobalEvents() {
        // Mobile menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        // Close sidebar on page click (mobile)
        document.getElementById('mainContent').addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !e.target.closest('#menuToggle')) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });

        // Project search
        const searchInput = document.getElementById('projectSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                Dashboard.refresh();
            });
        }

        // Project filter
        const filterSelect = document.getElementById('projectFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                Dashboard.refresh();
            });
        }
    }

    function _bindModalEvents() {
        const modal = document.getElementById('planModal');
        const closeBtn = document.getElementById('closeModal');

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        document.getElementById('printPlanBtn').addEventListener('click', () => {
            window.print();
        });

        // --- Export dropdown toggles ---
        document.getElementById('exportPdfDropdownBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            _closeAllDropdowns();
            document.getElementById('pdfDropdownMenu').classList.toggle('open');
        });
        document.getElementById('exportWordDropdownBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            _closeAllDropdowns();
            document.getElementById('wordDropdownMenu').classList.toggle('open');
        });
        document.addEventListener('click', () => _closeAllDropdowns());

        // --- Handle all export language options ---
        document.querySelectorAll('.export-lang-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const format = btn.dataset.format;
                const lang = btn.dataset.lang;
                _closeAllDropdowns();
                _exportDocument(format, lang);
            });
        });
    }

    function _closeAllDropdowns() {
        document.querySelectorAll('.export-dropdown-menu').forEach(m => m.classList.remove('open'));
    }

    // ========== Preview Modal ==========
    let _previewLang = 'ar';

    function _bindPreviewModal() {
        const previewModal = document.getElementById('previewModal');
        const closeBtn = document.getElementById('closePreviewModal');

        // Open preview from plan modal
        document.getElementById('previewBtn').addEventListener('click', () => {
            _previewLang = I18n.getCurrentLang() === 'en' ? 'en' : 'ar';
            _updatePreviewTabs();
            _renderPreview();
            previewModal.classList.add('active');
        });

        // Close preview
        closeBtn.addEventListener('click', () => {
            previewModal.classList.remove('active');
        });
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                previewModal.classList.remove('active');
            }
        });

        // Language tabs
        document.querySelectorAll('.preview-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                _previewLang = tab.dataset.previewLang;
                _updatePreviewTabs();
                _renderPreview();
            });
        });

        // Download PDF from preview
        document.getElementById('previewDownloadPdf').addEventListener('click', () => {
            _exportDocument('pdf', _previewLang);
        });

        // Download Word from preview
        document.getElementById('previewDownloadWord').addEventListener('click', () => {
            _exportDocument('word', _previewLang);
        });
    }

    function _updatePreviewTabs() {
        document.querySelectorAll('.preview-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.previewLang === _previewLang);
        });
    }

    function _renderPreview() {
        const isEN = _previewLang === 'en';
        _getContentForLang(isEN).then(({ title, bodyHTML, companyLogo }) => {
            const fullHTML = _buildFullDocument(title, bodyHTML, isEN, companyLogo);
            const iframe = document.getElementById('previewIframe');
            const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            iframe.src = url;
            iframe.onload = () => URL.revokeObjectURL(url);
        });
    }

    function _getContentForLang(isEN) {
        const projectId = document.getElementById('planModal').dataset.projectId;
        const project = projectId ? StorageManager.getProject(projectId) : null;
        const rawData = project && (project.rawData || project);
        const companyLogo = project ? project.companyLogo : null;

        if (isEN && rawData && rawData.projectInfo) {
            // Regenerate plan in English from raw data
            return AIEngine.generatePlanEN(rawData).then(plan => {
                const bodyHTML = plan.sections.map(s => `
                    <div class="plan-section">
                        <div class="plan-section-header">
                            <div class="plan-section-number">${s.number}</div>
                            <div class="plan-section-title">${s.title}</div>
                        </div>
                        <div class="plan-section-content">${s.content}</div>
                    </div>
                `).join('');
                return { title: plan.title, bodyHTML, companyLogo };
            });
        } else if (!isEN && rawData && rawData.projectInfo) {
            // Regenerate plan in Arabic from raw data
            return AIEngine.generatePlan(rawData).then(plan => {
                const bodyHTML = plan.sections.map(s => `
                    <div class="plan-section">
                        <div class="plan-section-header">
                            <div class="plan-section-number">${s.number}</div>
                            <div class="plan-section-title">${s.title}</div>
                        </div>
                        <div class="plan-section-content">${s.content}</div>
                    </div>
                `).join('');
                return { title: plan.title, bodyHTML, companyLogo };
            });
        } else {
            // Fallback: use current modal content as-is
            const content = document.getElementById('modalBody').innerHTML;
            const title = document.getElementById('modalTitle').textContent;
            return Promise.resolve({ title, bodyHTML: content, companyLogo });
        }
    }

    // ========== Professional Export Engine ==========
    function _getExportStyles(isEN) {
        const dir = isEN ? 'ltr' : 'rtl';
        const textAlign = isEN ? 'left' : 'right';
        const paddingDir = isEN ? 'padding-left' : 'padding-right';
        return `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
        @page {
            size: A4;
            margin: 20mm 15mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Tajawal', 'Inter', sans-serif;
            color: #1a1d23;
            line-height: 1.9;
            direction: ${dir};
            font-size: 11pt;
            background: #fff;
        }

        /* ---- COVER PAGE ---- */
        .cover-page {
            page-break-after: always;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(160deg, #0b1628 0%, #152d54 40%, #1e3f6e 70%, #244f8f 100%);
            color: #fff;
            padding: 60px 40px;
            position: relative;
            overflow: hidden;
        }
        .cover-page::before {
            content: '';
            position: absolute;
            top: -80px; right: -80px;
            width: 350px; height: 350px;
            border-radius: 50%;
            background: rgba(255,255,255,0.03);
        }
        .cover-page::after {
            content: '';
            position: absolute;
            bottom: -100px; left: -60px;
            width: 400px; height: 400px;
            border-radius: 50%;
            background: rgba(255,255,255,0.02);
        }
        .cover-logo {
            font-size: 2.2rem;
            font-weight: 800;
            letter-spacing: 2px;
            margin-bottom: 8px;
            color: #60a5fa;
        }
        .cover-iso-badge {
            display: inline-block;
            background: rgba(96,165,250,0.15);
            border: 1px solid rgba(96,165,250,0.3);
            border-radius: 20px;
            padding: 6px 22px;
            font-size: 0.85rem;
            font-weight: 500;
            color: #93c5fd;
            margin-bottom: 50px;
            letter-spacing: 1px;
        }
        .cover-title {
            font-size: 2rem;
            font-weight: 800;
            line-height: 1.3;
            margin-bottom: 16px;
            color: #fff;
        }
        .cover-subtitle {
            font-size: 1.05rem;
            color: #94a3b8;
            margin-bottom: 50px;
            max-width: 500px;
        }
        .cover-meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px 40px;
            text-align: ${textAlign};
            background: rgba(255,255,255,0.06);
            border-radius: 12px;
            padding: 28px 36px;
            max-width: 560px;
            width: 100%;
        }
        .cover-meta-item label {
            display: block;
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
        }
        .cover-meta-item span {
            font-size: 0.95rem;
            font-weight: 600;
            color: #e2e8f0;
        }
        .cover-footer {
            position: absolute;
            bottom: 30px;
            font-size: 0.75rem;
            color: #475569;
        }
        .cover-line {
            width: 60px;
            height: 3px;
            background: #60a5fa;
            border-radius: 3px;
            margin: 0 auto 30px;
        }

        /* ---- BODY CONTENT ---- */
        .doc-body {
            padding: 0;
        }
        .doc-body h2 {
            font-size: 1.35rem;
            font-weight: 800;
            color: #0b1628;
            border-bottom: 3px solid #244f8f;
            padding-bottom: 8px;
            margin: 36px 0 18px;
        }
        .doc-body h3 {
            font-size: 1.08rem;
            font-weight: 700;
            color: #152d54;
            margin: 24px 0 10px;
            ${paddingDir}: 14px;
            border-${isEN ? 'left' : 'right'}: 3px solid #60a5fa;
        }
        .doc-body h4 {
            font-size: 0.95rem;
            font-weight: 700;
            color: #1e3f6e;
            margin: 16px 0 8px;
        }
        .doc-body p, .doc-body li {
            font-size: 0.92rem;
            line-height: 1.9;
            color: #334155;
        }
        .doc-body ul {
            ${paddingDir}: 22px;
            margin: 8px 0;
        }
        .doc-body li {
            margin-bottom: 4px;
        }
        .doc-body table {
            width: 100%;
            border-collapse: collapse;
            margin: 14px 0;
            font-size: 0.84rem;
        }
        .doc-body th {
            background: #152d54;
            color: #fff;
            font-weight: 700;
            padding: 10px 12px;
            text-align: ${textAlign};
            border: 1px solid #1e3f6e;
        }
        .doc-body td {
            padding: 9px 12px;
            border: 1px solid #d1d5db;
            color: #334155;
        }
        .doc-body tr:nth-child(even) td {
            background: #f8fafc;
        }
        .plan-section {
            padding: 16px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .plan-section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 14px;
        }
        .plan-section-number {
            width: 30px; height: 30px;
            background: #244f8f;
            color: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.78rem;
            font-weight: 700;
            flex-shrink: 0;
        }
        .plan-section-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: #152d54;
        }

        /* ---- CLOSING PAGE ---- */
        .closing-page {
            page-break-before: always;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(160deg, #0b1628 0%, #152d54 50%, #1e3f6e 100%);
            color: #fff;
            padding: 60px 40px;
        }
        .closing-icon {
            font-size: 3.5rem;
            color: #60a5fa;
            margin-bottom: 24px;
        }
        .closing-title {
            font-size: 1.6rem;
            font-weight: 800;
            margin-bottom: 12px;
        }
        .closing-text {
            font-size: 0.95rem;
            color: #94a3b8;
            max-width: 480px;
            line-height: 1.8;
            margin-bottom: 40px;
        }
        .closing-divider {
            width: 60px; height: 3px;
            background: #60a5fa;
            border-radius: 3px;
            margin-bottom: 30px;
        }
        .closing-info {
            font-size: 0.8rem;
            color: #475569;
        }
        .closing-info strong {
            color: #93c5fd;
        }
        `;
    }

    function _buildCoverPage(title, isEN, companyLogo) {
        const projectName = title || (isEN ? 'BIM Execution Plan' : 'خطة تنفيذ BIM');
        const today = new Date().toLocaleDateString(isEN ? 'en-US' : 'ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

        const labels = isEN ? {
            iso: 'ISO 19650 Compliant',
            subtitle: 'BIM Execution Plan — According to ISO 19650',
            project: 'PROJECT',
            date: 'DATE',
            standard: 'STANDARD',
            prepared: 'PREPARED BY',
            preparedVal: 'BIM Plan Pro',
            standardVal: 'ISO 19650-2',
            footer: 'This document was generated by BIM Plan Pro'
        } : {
            iso: 'متوافق مع ISO 19650',
            subtitle: 'خطة تنفيذ نمذجة معلومات البناء — وفقاً لمعيار ISO 19650',
            project: 'المشروع',
            date: 'التاريخ',
            standard: 'المعيار',
            prepared: 'الإعداد',
            preparedVal: 'BIM Plan Pro',
            standardVal: 'ISO 19650-2',
            footer: 'تم إنشاء هذا المستند بواسطة BIM Plan Pro'
        };

        const logoHTML = companyLogo
            ? `<div class="cover-company-logo"><img src="${companyLogo}" alt="Company Logo" style="max-height:80px;max-width:200px;margin-bottom:20px;border-radius:8px;"></div>`
            : '';

        return `
        <div class="cover-page">
            ${logoHTML}
            <div class="cover-logo">BIM Plan Pro</div>
            <div class="cover-iso-badge">${labels.iso}</div>
            <div class="cover-line"></div>
            <div class="cover-title">${projectName}</div>
            <div class="cover-subtitle">${labels.subtitle}</div>
            <div class="cover-meta-grid">
                <div class="cover-meta-item">
                    <label>${labels.project}</label>
                    <span>${projectName}</span>
                </div>
                <div class="cover-meta-item">
                    <label>${labels.date}</label>
                    <span>${today}</span>
                </div>
                <div class="cover-meta-item">
                    <label>${labels.standard}</label>
                    <span>${labels.standardVal}</span>
                </div>
                <div class="cover-meta-item">
                    <label>${labels.prepared}</label>
                    <span>${labels.preparedVal}</span>
                </div>
            </div>
            <div class="cover-footer">${labels.footer}</div>
        </div>`;
    }

    function _buildClosingPage(isEN) {
        const labels = isEN ? {
            icon: '✔',
            title: 'End of Document',
            text: 'This BIM Execution Plan has been prepared in accordance with ISO 19650 standards. All parties involved are expected to review and commit to the requirements outlined in this document to ensure successful project delivery.',
            disclaimer: 'Generated by <strong>BIM Plan Pro</strong> — All rights reserved',
            date: 'Generation Date: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        } : {
            icon: '✔',
            title: 'نهاية المستند',
            text: 'تم إعداد خطة تنفيذ BIM هذه وفقاً لمتطلبات معيار ISO 19650. يُتوقع من جميع الأطراف المعنية مراجعة المتطلبات الواردة في هذا المستند والالتزام بها لضمان التسليم الناجح للمشروع.',
            disclaimer: 'تم الإنشاء بواسطة <strong>BIM Plan Pro</strong> — جميع الحقوق محفوظة',
            date: 'تاريخ الإنشاء: ' + new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
        };

        return `
        <div class="closing-page">
            <div class="closing-icon">${labels.icon}</div>
            <div class="closing-title">${labels.title}</div>
            <div class="closing-divider"></div>
            <div class="closing-text">${labels.text}</div>
            <div class="closing-info">${labels.disclaimer}</div>
            <div class="closing-info" style="margin-top:8px;">${labels.date}</div>
        </div>`;
    }

    function _buildFullDocument(title, bodyContent, isEN, companyLogo) {
        const lang = isEN ? 'en' : 'ar';
        const dir = isEN ? 'ltr' : 'rtl';
        const coverHTML = _buildCoverPage(title, isEN, companyLogo);
        const closingHTML = _buildClosingPage(isEN);
        const styles = _getExportStyles(isEN);

        return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>${styles}</style>
</head>
<body>
${coverHTML}
<div class="doc-body">
${bodyContent}
</div>
${closingHTML}
</body>
</html>`;
    }

    function _exportDocument(format, lang) {
        const isEN = lang === 'en';
        _getContentForLang(isEN).then(({ title, bodyHTML, companyLogo }) => {
            const fullHTML = _buildFullDocument(title, bodyHTML, isEN, companyLogo);
            const safeTitle = title.replace(/\s+/g, '-');

            if (format === 'word') {
                const converted = htmlDocx.asBlob(fullHTML);
                const url = URL.createObjectURL(converted);
                const a = document.createElement('a');
                a.href = url;
                a.download = safeTitle + (isEN ? '-EN' : '-AR') + '.docx';
                a.click();
                URL.revokeObjectURL(url);
            } else if (format === 'pdf') {
                const wrapper = document.createElement('div');
                wrapper.style.position = 'absolute';
                wrapper.style.left = '-9999px';
                wrapper.style.top = '0';
                wrapper.style.width = '210mm';
                wrapper.innerHTML = fullHTML;
                document.body.appendChild(wrapper);

                const opt = {
                    margin: [20, 15, 20, 15],
                    filename: safeTitle + (isEN ? '-EN' : '-AR') + '.pdf',
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, scrollY: 0, width: 794 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                };

                html2pdf().set(opt).from(wrapper).save().then(function () {
                    document.body.removeChild(wrapper);
                });
            }
        });
    }

    function _bindSettingsEvents() {
        // Export all
        document.getElementById('exportAllBtn').addEventListener('click', () => {
            StorageManager.exportAll();
        });

        // Import
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const count = StorageManager.importData(ev.target.result);
                    alert(I18n.t('msg_import_success').replace('{count}', count));
                    Dashboard.refresh();
                } catch (err) {
                    alert(err.message);
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        // Clear all
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            if (confirm(I18n.t('confirm_delete_all'))) {
                StorageManager.clearAll();
                Dashboard.refresh();
                alert(I18n.t('msg_delete_all_success'));
            }
        });

        // Language
        const langSelect = document.getElementById('settingLanguage');
        const settings = StorageManager.getSettings();
        langSelect.value = settings.language || 'ar';
        langSelect.addEventListener('change', () => {
            StorageManager.saveSettings({ ...settings, language: langSelect.value });
        });
    }

    function navigateTo(page) {
        currentPage = page;

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) pageEl.classList.add('active');

        // Update title
        const titles = {
            dashboard: I18n.t('nav_dashboard'),
            wizard: I18n.t('nav_wizard'),
            projects: I18n.t('nav_projects'),
            templates: I18n.t('nav_templates'),
            guide: I18n.t('nav_guide'),
            settings: I18n.t('nav_settings')
        };
        document.querySelector('.topbar-title h1').textContent = titles[page] || page;

        // Refresh dashboard when navigating to it
        if (page === 'dashboard' || page === 'projects') {
            Dashboard.refresh();
        }

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
    }

    function _bindLangToggle() {
        var btn = document.getElementById('langToggleBtn');
        if (btn) {
            btn.addEventListener('click', function () {
                I18n.toggleLanguage();
                // Refresh current page title
                navigateTo(currentPage);
            });
        }
    }

    function _applyThemeIcons(theme) {
        var icons = document.querySelectorAll('#themeToggleBtn i, #landingThemeBtn i');
        icons.forEach(function (i) {
            i.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });
    }

    function _setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('bimplan_theme', theme); } catch (e) { }
        _applyThemeIcons(theme);
    }

    function _bindThemeToggle() {
        var current = document.documentElement.getAttribute('data-theme') || 'light';
        _applyThemeIcons(current);
        var ids = ['themeToggleBtn', 'landingThemeBtn'];
        ids.forEach(function (id) {
            var btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('click', function () {
                var now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                _setTheme(now);
            });
        });
    }

    function _bindAuthModal() {
        var authBtn = document.getElementById('authBtn');
        var authModal = document.getElementById('authModal');
        var closeAuthBtn = document.getElementById('closeAuthModal');

        // Init Firebase Auth
        Auth.init();

        if (authBtn && authModal) {
            // User dropdown handles authBtn click now
            _bindUserDropdown();
            _bindProfileForm();

            closeAuthBtn.addEventListener('click', function () {
                authModal.classList.remove('active');
                _resetGoogleSimForm();
            });

            authModal.addEventListener('click', function (e) {
                if (e.target === authModal) {
                    authModal.classList.remove('active');
                    _resetGoogleSimForm();
                }
            });

            // Tab switching
            document.querySelectorAll('.auth-tab').forEach(function (tab) {
                tab.addEventListener('click', function () {
                    var tabName = tab.dataset.tab;
                    document.querySelectorAll('.auth-tab').forEach(function (t) { t.classList.remove('active'); });
                    document.querySelectorAll('.auth-form').forEach(function (f) { f.classList.remove('active'); });
                    tab.classList.add('active');
                    document.getElementById(tabName + 'Form').classList.add('active');
                });
            });

            // ====== Google Sign-In buttons ======
            document.getElementById('googleSignInBtn').addEventListener('click', function () {
                _handleGoogleSignIn();
            });
            document.getElementById('googleSignUpBtn').addEventListener('click', function () {
                _handleGoogleSignIn();
            });

            // ====== Google Simulation Form (local mode) ======
            function _submitGoogleSim() {
                var name = document.getElementById('googleSimName').value.trim();
                var email = document.getElementById('googleSimEmail').value.trim();
                var errEl = document.getElementById('googleSimError');
                errEl.classList.add('hidden');
                if (!email) {
                    _showAuthError(errEl, I18n.t('auth/invalid-email'));
                    return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    _showAuthError(errEl, I18n.t('auth/invalid-email'));
                    return;
                }
                if (!name) {
                    name = email.split('@')[0];
                }
                Auth.signInWithGoogle(name, email).then(function () {
                    authModal.classList.remove('active');
                    // Reset sim form
                    document.getElementById('googleSimForm').classList.add('hidden');
                    document.getElementById('authFormsContainer').classList.remove('hidden');
                    document.getElementById('googleSimName').value = '';
                    document.getElementById('googleSimEmail').value = '';
                }).catch(function (err) {
                    _showAuthError(errEl, _friendlyError(err));
                });
            }
            document.getElementById('googleSimSubmitBtn').addEventListener('click', _submitGoogleSim);
            document.getElementById('googleSimEmail').addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); _submitGoogleSim(); }
            });
            document.getElementById('googleSimName').addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); document.getElementById('googleSimEmail').focus(); }
            });
            document.getElementById('googleSimBackBtn').addEventListener('click', function () {
                document.getElementById('googleSimForm').classList.add('hidden');
                document.getElementById('authFormsContainer').classList.remove('hidden');
            });

            // ====== Email/Password Login ======
            document.getElementById('loginSubmitBtn').addEventListener('click', function (e) {
                e.preventDefault();
                var email = document.getElementById('loginEmail').value.trim();
                var password = document.getElementById('loginPassword').value;
                var errEl = document.getElementById('loginError');
                errEl.classList.add('hidden');

                if (!email || !password) {
                    _showAuthError(errEl, I18n.t('err_email_pw_required'));
                    return;
                }

                Auth.signInWithEmail(email, password).then(function () {
                    authModal.classList.remove('active');
                }).catch(function (err) {
                    _showAuthError(errEl, _friendlyError(err));
                });
            });

            // ====== Email/Password Register ======
            document.getElementById('registerSubmitBtn').addEventListener('click', function (e) {
                e.preventDefault();
                var name = document.getElementById('registerName').value.trim();
                var email = document.getElementById('registerEmail').value.trim();
                var pw = document.getElementById('registerPassword').value;
                var pw2 = document.getElementById('registerPasswordConfirm').value;
                var errEl = document.getElementById('registerError');
                errEl.classList.add('hidden');

                if (!name || !email || !pw) {
                    _showAuthError(errEl, I18n.t('err_fill_all'));
                    return;
                }
                if (pw.length < 6) {
                    _showAuthError(errEl, I18n.t('err_pw_min'));
                    return;
                }
                if (pw !== pw2) {
                    _showAuthError(errEl, I18n.t('err_pw_mismatch'));
                    return;
                }

                Auth.registerWithEmail(name, email, pw).then(function () {
                    authModal.classList.remove('active');
                }).catch(function (err) {
                    _showAuthError(errEl, _friendlyError(err));
                });
            });

            // ====== Sign Out ======
            document.getElementById('signOutBtn').addEventListener('click', function () {
                Auth.signOut().then(function () {
                    StorageManager.reset();
                    _updateAuthButton(null);
                    _updateAuthModalView();
                });
            });

            // ====== Listen for auth changes ======
            Auth.onAuthChanged(function (user) {
                _updateAuthButton(user);
                Dashboard.refresh();
                // If user just logged in and still on landing, enter app
                if (user && document.getElementById('landingPage').style.display !== 'none') {
                    _enterApp();
                }
                // If user logged out, go back to landing
                if (!user && document.getElementById('landingPage').style.display === 'none') {
                    _backToLanding();
                }
            });
        }
    }

    function _resetGoogleSimForm() {
        var sim = document.getElementById('googleSimForm');
        var forms = document.getElementById('authFormsContainer');
        if (sim && !sim.classList.contains('hidden')) {
            sim.classList.add('hidden');
            forms.classList.remove('hidden');
        }
    }

    function _handleGoogleSignIn() {
        // Redirect to Flask Google OAuth route
        window.location.href = '/api/auth/google/login';
    }

    function _updateAuthButton(user) {
        var authBtn = document.getElementById('authBtn');
        var dropdown = document.getElementById('userDropdown');
        if (user) {
            var initial = (user.name || user.email || '?').charAt(0).toUpperCase();
            if (user.photo) {
                authBtn.innerHTML = '<img src="' + user.photo + '" alt="" class="auth-btn-avatar">';
            } else {
                authBtn.innerHTML = '<span class="auth-btn-initial">' + initial + '</span>';
            }
            authBtn.title = user.name || user.email;
            authBtn.classList.add('logged-in');

            // Update dropdown info
            document.getElementById('dropdownName').textContent = user.name || '—';
            document.getElementById('dropdownEmail').textContent = user.email || '';
            var isAdmin = user.role === 'admin';
            var adminBadge = document.getElementById('dropdownAdminBadge');
            var adminLink  = document.getElementById('dropdownAdminLink');
            if (adminBadge) adminBadge.classList.toggle('hidden', !isAdmin);
            if (adminLink)  adminLink.classList.toggle('hidden', !isAdmin);
            authBtn.classList.toggle('is-admin', isAdmin);
            var avatarEl = document.getElementById('dropdownAvatar');
            if (user.photo) {
                avatarEl.innerHTML = '<img src="' + user.photo + '" alt="">';
            } else {
                avatarEl.innerHTML = '<span class="dropdown-initial">' + initial + '</span>';
            }
        } else {
            authBtn.innerHTML = '<i class="fas fa-user-circle"></i><span data-i18n="btn_login">' + I18n.t('btn_login') + '</span>';
            authBtn.title = '';
            authBtn.classList.remove('logged-in');
            if (dropdown) dropdown.classList.add('hidden');
        }
    }

    function _bindUserDropdown() {
        var authBtn = document.getElementById('authBtn');
        var dropdown = document.getElementById('userDropdown');

        authBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (Auth.isLoggedIn()) {
                dropdown.classList.toggle('hidden');
            } else {
                _updateAuthModalView();
                document.getElementById('authModal').classList.add('active');
            }
        });

        // Close dropdown on outside click
        document.addEventListener('click', function (e) {
            if (dropdown && !dropdown.contains(e.target) && e.target !== authBtn) {
                dropdown.classList.add('hidden');
            }
        });

        // Profile button opens auth modal with profile
        document.getElementById('dropdownProfile').addEventListener('click', function () {
            dropdown.classList.add('hidden');
            _updateAuthModalView();
            _populateProfileForm();
            document.getElementById('authModal').classList.add('active');
        });

        // Sign out from dropdown
        document.getElementById('dropdownSignOut').addEventListener('click', function () {
            dropdown.classList.add('hidden');
            Auth.signOut().then(function () {
                StorageManager.reset();
                _updateAuthButton(null);
                _updateAuthModalView();
            });
        });
    }

    function _populateProfileForm() {
        var user = Auth.getCurrentUser();
        if (!user) return;
        document.getElementById('profileEditName').value = user.name || '';
        document.getElementById('profileEditCompany').value = user.company || '';

        // Avatar preview
        var previewEl = document.getElementById('profileAvatarPreview');
        var removeBtn = document.getElementById('removeAvatarBtn');
        if (user.photo) {
            previewEl.innerHTML = '<img src="' + user.photo + '" alt="">';
            removeBtn.style.display = 'inline-flex';
        } else {
            previewEl.innerHTML = '<i class="fas fa-user-circle"></i>';
            removeBtn.style.display = 'none';
        }

        // Logo preview
        var logoPreview = document.getElementById('profileLogoPreview');
        var removeLogo = document.getElementById('removeProfileLogoBtn');
        var companyLogo = user.companyLogo || '';
        if (companyLogo) {
            logoPreview.innerHTML = '<img src="' + companyLogo + '" alt="">';
            removeLogo.style.display = 'inline-flex';
        } else {
            logoPreview.innerHTML = '<i class="fas fa-building"></i>';
            removeLogo.style.display = 'none';
        }

        // Clear password fields
        document.getElementById('profileCurrentPassword').value = '';
        document.getElementById('profileNewPassword').value = '';
        document.getElementById('profileConfirmPassword').value = '';
        document.getElementById('profileError').classList.add('hidden');
        document.getElementById('profileSuccess').classList.add('hidden');

        // Show/hide password section based on provider
        var pwSection = document.getElementById('passwordSection');
        if (user.provider === 'google.com') {
            pwSection.style.display = 'none';
        } else {
            pwSection.style.display = '';
        }
    }

    function _bindProfileForm() {
        // Avatar upload
        document.getElementById('uploadAvatarBtn').addEventListener('click', function () {
            document.getElementById('avatarFileInput').click();
        });
        document.getElementById('avatarFileInput').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            if (!file.type.match(/^image\/(png|jpeg)$/)) {
                alert(I18n.t('err_invalid_image'));
                return;
            }
            if (file.size > 204800) {
                alert(I18n.t('err_file_large_200'));
                return;
            }
            var reader = new FileReader();
            reader.onload = function (ev) {
                document.getElementById('profileAvatarPreview').innerHTML = '<img src="' + ev.target.result + '" alt="">';
                document.getElementById('removeAvatarBtn').style.display = 'inline-flex';
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });
        document.getElementById('removeAvatarBtn').addEventListener('click', function () {
            document.getElementById('profileAvatarPreview').innerHTML = '<i class="fas fa-user-circle"></i>';
            this.style.display = 'none';
        });

        // Company logo upload
        document.getElementById('uploadProfileLogoBtn').addEventListener('click', function () {
            document.getElementById('profileLogoFileInput').click();
        });
        document.getElementById('profileLogoFileInput').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            if (!file.type.match(/^image\/(png|jpeg|svg\+xml)$/)) {
                alert(I18n.t('err_invalid_image_logo'));
                return;
            }
            if (file.size > 512000) {
                alert(I18n.t('err_file_large_500'));
                return;
            }
            var reader = new FileReader();
            reader.onload = function (ev) {
                document.getElementById('profileLogoPreview').innerHTML = '<img src="' + ev.target.result + '" alt="">';
                document.getElementById('removeProfileLogoBtn').style.display = 'inline-flex';
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });
        document.getElementById('removeProfileLogoBtn').addEventListener('click', function () {
            document.getElementById('profileLogoPreview').innerHTML = '<i class="fas fa-building"></i>';
            this.style.display = 'none';
        });

        // Save profile
        document.getElementById('saveProfileBtn').addEventListener('click', function () {
            var errEl = document.getElementById('profileError');
            var successEl = document.getElementById('profileSuccess');
            errEl.classList.add('hidden');
            successEl.classList.add('hidden');

            var name = document.getElementById('profileEditName').value.trim();
            var company = document.getElementById('profileEditCompany').value.trim();

            // Get avatar data
            var avatarImg = document.querySelector('#profileAvatarPreview img');
            var photo = avatarImg ? avatarImg.src : '';

            // Get logo data
            var logoImg = document.querySelector('#profileLogoPreview img');
            var companyLogo = logoImg ? logoImg.src : '';

            // Password change
            var currentPw = document.getElementById('profileCurrentPassword').value;
            var newPw = document.getElementById('profileNewPassword').value;
            var confirmPw = document.getElementById('profileConfirmPassword').value;

            if (newPw) {
                if (newPw.length < 6) {
                    _showAuthError(errEl, I18n.t('err_pw_min'));
                    return;
                }
                if (newPw !== confirmPw) {
                    _showAuthError(errEl, I18n.t('err_pw_mismatch'));
                    return;
                }
            }

            Auth.updateProfile({ name: name, company: company, photo: photo, companyLogo: companyLogo }).then(function () {
                if (newPw && currentPw) {
                    return Auth.updatePassword(currentPw, newPw);
                }
            }).then(function () {
                successEl.textContent = I18n.t('msg_saved');
                successEl.classList.remove('hidden');
                _updateAuthButton(Auth.getCurrentUser());
                Dashboard.refresh();

                document.getElementById('profileCurrentPassword').value = '';
                document.getElementById('profileNewPassword').value = '';
                document.getElementById('profileConfirmPassword').value = '';
            }).catch(function (err) {
                _showAuthError(errEl, _friendlyError(err));
            });
        });
    }

    function _updateAuthModalView() {
        var user = Auth.getCurrentUser();
        var formsContainer = document.getElementById('authFormsContainer');
        var profileContainer = document.getElementById('authProfileContainer');
        var simForm = document.getElementById('googleSimForm');

        // Always reset sim form when updating modal view
        if (simForm) simForm.classList.add('hidden');

        if (user) {
            formsContainer.classList.add('hidden');
            profileContainer.classList.remove('hidden');

            // Fill profile header
            var avatarEl = document.getElementById('authProfileAvatar');
            if (user.photo) {
                avatarEl.innerHTML = '<img src="' + user.photo + '" alt="">';
            } else {
                avatarEl.innerHTML = '<i class="fas fa-user-circle"></i>';
            }
            document.getElementById('authProfileName').textContent = user.name || '—';
            document.getElementById('authProfileEmail').textContent = user.email || '';

            var badge = document.getElementById('authProviderBadge');
            if (user.provider === 'google.com') {
                badge.innerHTML = '<i class="fab fa-google"></i> Google';
                badge.className = 'auth-provider-badge google';
            } else {
                badge.innerHTML = '<i class="fas fa-envelope"></i> Email';
                badge.className = 'auth-provider-badge email';
            }

            // Populate editable form
            _populateProfileForm();
        } else {
            formsContainer.classList.remove('hidden');
            profileContainer.classList.add('hidden');
        }
    }

    function _showAuthError(el, msg) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    function _friendlyError(err) {
        var code = err.code || '';
        var messages = {
            'auth/user-not-found': I18n.t('auth/user-not-found'),
            'auth/wrong-password': I18n.t('auth/wrong-password'),
            'auth/email-already-in-use': I18n.t('auth/email-already-in-use'),
            'auth/invalid-email': I18n.t('auth/invalid-email'),
            'auth/weak-password': I18n.t('auth/weak-password'),
            'auth/too-many-requests': I18n.t('auth/too-many-requests'),
            'auth/popup-blocked': I18n.t('auth/popup-blocked'),
            'auth/network-request-failed': I18n.t('auth/network-request-failed'),
            'auth/invalid-credential': I18n.t('auth/invalid-credential')
        };
        return messages[code] || I18n.t('auth_error_generic');
    }

    return {
        init,
        navigateTo
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
