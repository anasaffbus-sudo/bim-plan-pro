/**
 * BIM Plan Pro - Dashboard Controller
 * Manages dashboard display, project listing, statistics, editing, and logo upload
 */
const Dashboard = (() => {

    let _currentDetailId = null;

    function init() {
        refresh();
        _bindDetailPanel();
        _bindEditModal();
        _bindLogoUpload();
        _bindWelcomeCard();
        _bindDashProjectButtons();

        // Listen for auth changes to update dashboard
        Auth.onAuthChanged(function (user) {
            _renderUserWelcome(user);
        });
    }

    function refresh() {
        _updateStats();
        _renderRecentProjects();
        _renderProjectsPage();
        _renderUserWelcome(Auth.getCurrentUser());
        _renderLatestProjectDetails();
    }

    // ========== User Welcome Card ==========
    function _renderUserWelcome(user) {
        var userCard = document.getElementById('userWelcomeCard');
        var guestCard = document.getElementById('guestWelcomeCard');
        if (!userCard || !guestCard) return;

        if (user) {
            // Show user card
            userCard.classList.remove('hidden');
            guestCard.classList.add('hidden');

            // Avatar
            var avatarEl = document.getElementById('welcomeAvatar');
            if (user.photo) {
                avatarEl.innerHTML = '<img src="' + user.photo + '" alt="">';
            } else {
                avatarEl.innerHTML = '<i class="fas fa-user-circle"></i>';
            }

            // Name
            document.getElementById('welcomeUserName').textContent =
                I18n.t('greeting') + (user.name || user.email.split('@')[0]);

            // Email
            document.getElementById('welcomeUserEmail').textContent = user.email || '';

            // Provider badge
            var badge = document.getElementById('welcomeBadge');
            if (user.provider === 'google.com') {
                badge.innerHTML = '<i class="fab fa-google"></i> Google';
                badge.className = 'welcome-badge google';
            } else {
                badge.innerHTML = '<i class="fas fa-envelope"></i> Email';
                badge.className = 'welcome-badge email';
            }
        } else {
            // Show guest card
            userCard.classList.add('hidden');
            guestCard.classList.remove('hidden');
        }
    }

    function _bindWelcomeCard() {
        // Guest login button
        var guestLoginBtn = document.getElementById('guestLoginBtn');
        if (guestLoginBtn) {
            guestLoginBtn.addEventListener('click', function () {
                document.getElementById('authBtn').click();
            });
        }

        // Edit profile button
        var editProfileBtn = document.getElementById('welcomeEditProfile');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', function () {
                document.getElementById('dropdownProfile').click();
            });
        }

        // Sign out from welcome card
        var signOutBtn = document.getElementById('welcomeSignOut');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', function () {
                Auth.signOut().then(function () {
                    StorageManager.reset();
                    _renderUserWelcome(null);
                });
            });
        }
    }

    function _updateStats() {
        const stats = StorageManager.getStats();
        document.getElementById('totalProjects').textContent = stats.total;
        document.getElementById('completedPlans').textContent = stats.completed;
        document.getElementById('pendingPlans').textContent = stats.draft;
    }

    function _renderRecentProjects() {
        const container = document.getElementById('recentProjectsList');
        const projects = StorageManager.getRecentProjects(5);

        if (projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-plus"></i>
                    <h3>${I18n.t('empty_state_title')}</h3>
                    <p>${I18n.t('empty_start_first')}</p>
                    <button class="btn btn-primary start-wizard-btn">
                        <i class="fas fa-magic"></i> ${I18n.t('btn_start_now')}
                    </button>
                </div>
            `;
            return;
        }

        const typeNames = AIEngine.getProjectTypeNames();

        container.innerHTML = projects.map(p => `
            <div class="recent-item" data-project-id="${p.id}">
                <div class="recent-item-icon">
                    <i class="fas fa-building"></i>
                </div>
                <div class="recent-item-info">
                    <h4>${_esc(p.projectInfo.name)}</h4>
                    <p>${typeNames[p.projectInfo.type] || ''} • ${_esc(p.projectInfo.location)}</p>
                </div>
                <span class="recent-item-date">${_timeAgo(p.generatedAt || p.createdAt)}</span>
            </div>
        `).join('');

        container.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', () => {
                Wizard.viewPlan(item.dataset.projectId);
            });
        });
    }

    function _renderProjectsPage() {
        const grid = document.getElementById('projectsGrid');
        const projects = StorageManager.getAllProjects();
        const searchTerm = (document.getElementById('projectSearch')?.value || '').toLowerCase();
        const filter = document.getElementById('projectFilter')?.value || 'all';

        let filtered = projects;
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.projectInfo.name.toLowerCase().includes(searchTerm) ||
                p.projectInfo.client.toLowerCase().includes(searchTerm) ||
                p.projectInfo.location.toLowerCase().includes(searchTerm)
            );
        }
        if (filter !== 'all') {
            filtered = filtered.filter(p => p.status === filter);
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-plus"></i>
                    <h3>${I18n.t('empty_no_projects_page')}</h3>
                    <p>${I18n.t('empty_start_first')}</p>
                    <button class="btn btn-primary start-wizard-btn">
                        <i class="fas fa-magic"></i> ${I18n.t('btn_create_new')}
                    </button>
                </div>
            `;
            return;
        }

        const typeNames = AIEngine.getProjectTypeNames();

        grid.innerHTML = filtered.map(p => `
            <div class="project-card" data-project-id="${p.id}">
                <div class="project-card-header">
                    <h3>${_esc(p.projectInfo.name)}</h3>
                    <span class="project-status ${p.status}">${p.status === 'completed' ? I18n.t('status_completed') : I18n.t('status_draft')}</span>
                </div>
                <div class="project-card-info">
                    <span><i class="fas fa-map-marker-alt"></i> ${_esc(p.projectInfo.location)}</span>
                    <span><i class="fas fa-user-tie"></i> ${_esc(p.projectInfo.client)}</span>
                    <span><i class="fas fa-building"></i> ${typeNames[p.projectInfo.type] || p.projectInfo.type}</span>
                    <span><i class="fas fa-calendar"></i> ${_timeAgo(p.generatedAt || p.createdAt)}</span>
                </div>
                <div class="project-card-actions">
                    <button class="btn btn-primary btn-sm view-detail-btn" data-id="${p.id}">
                        <i class="fas fa-info-circle"></i> ${I18n.t('btn_details')}
                    </button>
                    <button class="btn btn-outline btn-sm view-plan-btn" data-id="${p.id}">
                        <i class="fas fa-eye"></i> ${I18n.t('btn_view_plan')}
                    </button>
                    <button class="btn btn-outline btn-sm delete-project-btn" data-id="${p.id}">
                        <i class="fas fa-trash"></i> ${I18n.t('btn_delete')}
                    </button>
                </div>
            </div>
        `).join('');

        // Bind events
        grid.querySelectorAll('.view-detail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                _showProjectDetail(btn.dataset.id);
            });
        });

        grid.querySelectorAll('.view-plan-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                Wizard.viewPlan(btn.dataset.id);
            });
        });

        grid.querySelectorAll('.delete-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(I18n.t('confirm_delete_project'))) {
                    StorageManager.deleteProject(btn.dataset.id);
                    refresh();
                }
            });
        });
    }

    // ========== Project Detail Panel ==========
    function _bindDetailPanel() {
        document.getElementById('backToProjects').addEventListener('click', () => {
            document.getElementById('projectDetailPanel').classList.add('hidden');
            document.getElementById('projectsGrid').classList.remove('hidden');
            document.querySelector('.projects-header').classList.remove('hidden');
        });

        document.getElementById('editProjectBtn').addEventListener('click', () => {
            if (_currentDetailId) {
                App.navigateTo('wizard');
                Wizard.editProject(_currentDetailId, 1);
            }
        });

        document.getElementById('detailViewPlanBtn').addEventListener('click', () => {
            if (_currentDetailId) Wizard.viewPlan(_currentDetailId);
        });
    }

    function _showProjectDetail(projectId) {
        const project = StorageManager.getProject(projectId);
        if (!project) return;

        _currentDetailId = projectId;
        const typeNames = AIEngine.getProjectTypeNames();
        const scaleNames = AIEngine.getScaleNames();
        const disciplineNames = AIEngine.getDisciplineNames();

        const pi = project.projectInfo;
        const roles = project.roles || {};
        const teams = project.teams || [];
        const tech = project.technical || {};
        const bim = project.bimSettings || {};

        const logoHTML = project.companyLogo
            ? `<div class="detail-logo"><img src="${_esc(project.companyLogo)}" alt="Company Logo"></div>`
            : '';

        const body = document.getElementById('projectDetailBody');
        body.innerHTML = `
            ${logoHTML}
            <div class="detail-grid">
                <div class="detail-card">
                    <h3><i class="fas fa-building"></i> ${I18n.t('detail_project_info')}</h3>
                    <div class="detail-items">
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_project_name')}</span><span class="detail-value">${_esc(pi.name)}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_project_number')}</span><span class="detail-value">${_esc(pi.number) || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_location')}</span><span class="detail-value">${_esc(pi.location)}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_client')}</span><span class="detail-value">${_esc(pi.client)}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_type')}</span><span class="detail-value">${typeNames[pi.type] || pi.type}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_scale')}</span><span class="detail-value">${scaleNames[pi.scale] || pi.scale || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_start_date')}</span><span class="detail-value">${pi.startDate || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_end_date')}</span><span class="detail-value">${pi.endDate || '—'}</span></div>
                        ${pi.description ? `<div class="detail-row full"><span class="detail-label">${I18n.t('detail_description')}</span><span class="detail-value">${_esc(pi.description)}</span></div>` : ''}
                    </div>
                </div>
                <div class="detail-card">
                    <h3><i class="fas fa-user-tie"></i> ${I18n.t('detail_roles')}</h3>
                    <div class="detail-items">
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_appointing')}</span><span class="detail-value">${_esc(roles.appointingParty?.name) || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_contact')}</span><span class="detail-value">${_esc(roles.appointingParty?.contact) || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_lead')}</span><span class="detail-value">${_esc(roles.leadAP?.name) || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_contact')}</span><span class="detail-value">${_esc(roles.leadAP?.contact) || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_info_mgr')}</span><span class="detail-value">${_esc(roles.infoManager?.name) || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_contact')}</span><span class="detail-value">${_esc(roles.infoManager?.contact) || '—'}</span></div>
                    </div>
                </div>
            </div>
            ${teams.length > 0 ? `
            <div class="detail-card full-width">
                <h3><i class="fas fa-users"></i> ${I18n.t('detail_teams')} (${teams.length})</h3>
                <div class="detail-teams-grid">
                    ${teams.map((t, i) => `
                        <div class="detail-team-item">
                            <strong>${I18n.t('detail_team')} ${i + 1}: ${_esc(t.name) || '—'}</strong>
                            <span>${disciplineNames[t.discipline] || t.discipline || '—'} • ${_esc(t.company) || '—'}</span>
                            <span>${_esc(t.email) || '—'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}
            <div class="detail-grid">
                <div class="detail-card">
                    <h3><i class="fas fa-laptop-code"></i> ${I18n.t('detail_technical')}</h3>
                    <div class="detail-items">
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_software')}</span><span class="detail-value">${(tech.software || []).join(', ') || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_coordination')}</span><span class="detail-value">${(tech.coordination || []).join(', ') || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_cde')}</span><span class="detail-value">${_esc(tech.cde) || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_formats')}</span><span class="detail-value">${(tech.formats || []).join(', ') || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_coordinates')}</span><span class="detail-value">${_esc(tech.coordinates) || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_units')}</span><span class="detail-value">${_esc(tech.units) || '—'}</span></div>
                    </div>
                </div>
                <div class="detail-card">
                    <h3><i class="fas fa-cogs"></i> ${I18n.t('detail_bim_settings')}</h3>
                    <div class="detail-items">
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_lod')}</span><span class="detail-value">${(bim.lods || []).join(', ') || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_naming')}</span><span class="detail-value">${_esc(bim.naming) || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_classification')}</span><span class="detail-value">${_esc(bim.classification) || '—'}</span></div>
                        <div class="detail-row"><span class="detail-label">${I18n.t('detail_bim_uses')}</span><span class="detail-value">${(bim.uses || []).length} ${I18n.t('detail_uses_count')}</span></div>
                        ${bim.notes ? `<div class="detail-row full"><span class="detail-label">${I18n.t('label_notes')}</span><span class="detail-value">${_esc(bim.notes)}</span></div>` : ''}
                    </div>
                </div>
            </div>
        `;

        document.querySelector('.projects-header').classList.add('hidden');
        document.getElementById('projectsGrid').classList.add('hidden');
        document.getElementById('projectDetailPanel').classList.remove('hidden');
    }

    // ========== Latest Project on Dashboard ==========
    let _dashProjectId = null;

    function _renderLatestProjectDetails() {
        const card = document.getElementById('latestProjectCard');
        const body = document.getElementById('latestProjectBody');
        if (!card || !body) return;

        const projects = StorageManager.getRecentProjects(1);
        if (projects.length === 0) {
            card.style.display = 'none';
            return;
        }

        const project = projects[0];
        _dashProjectId = project.id;

        const typeNames = AIEngine.getProjectTypeNames();
        const scaleNames = AIEngine.getScaleNames();
        const disciplineNames = AIEngine.getDisciplineNames();

        const pi = project.projectInfo || {};
        const roles = project.roles || {};
        const teams = project.teams || [];
        const tech = project.technical || {};
        const bim = project.bimSettings || {};

        const logoHTML = project.companyLogo
            ? '<div class="dash-detail-logo"><img src="' + _esc(project.companyLogo) + '" alt="Logo"></div>'
            : '';

        body.innerHTML =
            logoHTML +
            '<div class="dash-detail-grid">' +
                '<div class="dash-detail-card">' +
                    '<h3><i class="fas fa-building"></i> ' + I18n.t('detail_project_info') + '</h3>' +
                    '<div class="dash-detail-items">' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_project_name') + '</span><span class="dash-value">' + _esc(pi.name) + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_project_number') + '</span><span class="dash-value">' + (_esc(pi.number) || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_location') + '</span><span class="dash-value">' + _esc(pi.location) + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_client') + '</span><span class="dash-value">' + _esc(pi.client) + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_type') + '</span><span class="dash-value">' + (typeNames[pi.type] || pi.type || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_scale') + '</span><span class="dash-value">' + (scaleNames[pi.scale] || pi.scale || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_start_date') + '</span><span class="dash-value">' + (pi.startDate || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_end_date') + '</span><span class="dash-value">' + (pi.endDate || '—') + '</span></div>' +
                    '</div>' +
                '</div>' +
                '<div class="dash-detail-card">' +
                    '<h3><i class="fas fa-user-tie"></i> ' + I18n.t('detail_roles') + '</h3>' +
                    '<div class="dash-detail-items">' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_appointing') + '</span><span class="dash-value">' + (_esc(roles.appointingParty?.name) || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_contact') + '</span><span class="dash-value">' + (_esc(roles.appointingParty?.contact) || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_lead') + '</span><span class="dash-value">' + (_esc(roles.leadAP?.name) || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_contact') + '</span><span class="dash-value">' + (_esc(roles.leadAP?.contact) || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_info_mgr') + '</span><span class="dash-value">' + (_esc(roles.infoManager?.name) || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_contact') + '</span><span class="dash-value">' + (_esc(roles.infoManager?.contact) || '—') + '</span></div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            (teams.length > 0 ?
                '<div class="dash-detail-card dash-full-width">' +
                    '<h3><i class="fas fa-users"></i> ' + I18n.t('detail_teams') + ' (' + teams.length + ')</h3>' +
                    '<div class="dash-teams-grid">' +
                        teams.map(function (t, i) {
                            return '<div class="dash-team-item">' +
                                '<strong>' + I18n.t('detail_team') + ' ' + (i + 1) + ': ' + (_esc(t.name) || '—') + '</strong>' +
                                '<span>' + (disciplineNames[t.discipline] || t.discipline || '—') + ' • ' + (_esc(t.company) || '—') + '</span>' +
                                '<span>' + (_esc(t.email) || '—') + '</span>' +
                            '</div>';
                        }).join('') +
                    '</div>' +
                '</div>' : '') +
            '<div class="dash-detail-grid">' +
                '<div class="dash-detail-card">' +
                    '<h3><i class="fas fa-laptop-code"></i> ' + I18n.t('detail_technical') + '</h3>' +
                    '<div class="dash-detail-items">' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_software') + '</span><span class="dash-value">' + ((tech.software || []).join(', ') || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_coordination') + '</span><span class="dash-value">' + ((tech.coordination || []).join(', ') || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_cde') + '</span><span class="dash-value">' + (_esc(tech.cde) || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_formats') + '</span><span class="dash-value">' + ((tech.formats || []).join(', ') || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_coordinates') + '</span><span class="dash-value">' + (_esc(tech.coordinates) || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_units') + '</span><span class="dash-value">' + (_esc(tech.units) || '—') + '</span></div>' +
                    '</div>' +
                '</div>' +
                '<div class="dash-detail-card">' +
                    '<h3><i class="fas fa-cogs"></i> ' + I18n.t('detail_bim_settings') + '</h3>' +
                    '<div class="dash-detail-items">' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_lod') + '</span><span class="dash-value">' + ((bim.lods || []).join(', ') || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_naming') + '</span><span class="dash-value">' + (_esc(bim.naming) || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_classification') + '</span><span class="dash-value">' + (_esc(bim.classification) || '—') + '</span></div>' +
                        '<div class="dash-detail-row"><span class="dash-label">' + I18n.t('detail_bim_uses') + '</span><span class="dash-value">' + (bim.uses || []).length + ' ' + I18n.t('detail_uses_count') + '</span></div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        card.style.display = '';
    }

    function _bindDashProjectButtons() {
        var editBtn = document.getElementById('dashEditProjectBtn');
        var viewBtn = document.getElementById('dashViewPlanBtn');
        if (editBtn) {
            editBtn.addEventListener('click', function () {
                if (_dashProjectId) {
                    App.navigateTo('wizard');
                    Wizard.editProject(_dashProjectId, 1);
                }
            });
        }
        if (viewBtn) {
            viewBtn.addEventListener('click', function () {
                if (_dashProjectId) Wizard.viewPlan(_dashProjectId);
            });
        }
    }

    // ========== Edit Modal ==========
    function _bindEditModal() {
        const modal = document.getElementById('editProjectModal');

        document.getElementById('closeEditModal').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        document.getElementById('saveEditBtn').addEventListener('click', () => {
            _saveProjectEdits();
        });
    }

    function _openEditModal(projectId) {
        const project = StorageManager.getProject(projectId);
        if (!project) return;

        const pi = project.projectInfo;
        const roles = project.roles || {};

        document.getElementById('editProjectName').value = pi.name || '';
        document.getElementById('editProjectNumber').value = pi.number || '';
        document.getElementById('editProjectLocation').value = pi.location || '';
        document.getElementById('editClientName').value = pi.client || '';
        document.getElementById('editProjectType').value = pi.type || 'residential';
        document.getElementById('editProjectScale').value = pi.scale || 'medium';
        document.getElementById('editStartDate').value = pi.startDate || '';
        document.getElementById('editEndDate').value = pi.endDate || '';
        document.getElementById('editProjectDescription').value = pi.description || '';

        document.getElementById('editAppointingParty').value = roles.appointingParty?.name || '';
        document.getElementById('editAppointingPartyContact').value = roles.appointingParty?.contact || '';
        document.getElementById('editLeadAP').value = roles.leadAP?.name || '';
        document.getElementById('editLeadAPContact').value = roles.leadAP?.contact || '';
        document.getElementById('editInfoManager').value = roles.infoManager?.name || '';
        document.getElementById('editInfoManagerContact').value = roles.infoManager?.contact || '';

        // Logo preview
        const previewBox = document.getElementById('editLogoPreview');
        const removeBtn = document.getElementById('removeLogoBtn');
        if (project.companyLogo) {
            previewBox.innerHTML = `<img src="${project.companyLogo}" alt="Logo">`;
            removeBtn.style.display = 'inline-flex';
        } else {
            previewBox.innerHTML = `<i class="fas fa-cloud-upload-alt"></i><p>${I18n.t('edit_logo_upload')}</p><span>${I18n.t('edit_logo_hint')}</span>`;
            removeBtn.style.display = 'none';
        }

        document.getElementById('editProjectModal').dataset.projectId = projectId;
        document.getElementById('editProjectModal').classList.add('active');
    }

    function _saveProjectEdits() {
        const projectId = document.getElementById('editProjectModal').dataset.projectId;
        const project = StorageManager.getProject(projectId);
        if (!project) return;

        project.projectInfo.name = document.getElementById('editProjectName').value.trim();
        project.projectInfo.number = document.getElementById('editProjectNumber').value.trim();
        project.projectInfo.location = document.getElementById('editProjectLocation').value.trim();
        project.projectInfo.client = document.getElementById('editClientName').value.trim();
        project.projectInfo.type = document.getElementById('editProjectType').value;
        project.projectInfo.scale = document.getElementById('editProjectScale').value;
        project.projectInfo.startDate = document.getElementById('editStartDate').value;
        project.projectInfo.endDate = document.getElementById('editEndDate').value;
        project.projectInfo.description = document.getElementById('editProjectDescription').value.trim();

        if (!project.roles) project.roles = {};
        if (!project.roles.appointingParty) project.roles.appointingParty = {};
        if (!project.roles.leadAP) project.roles.leadAP = {};
        if (!project.roles.infoManager) project.roles.infoManager = {};

        project.roles.appointingParty.name = document.getElementById('editAppointingParty').value.trim();
        project.roles.appointingParty.contact = document.getElementById('editAppointingPartyContact').value.trim();
        project.roles.leadAP.name = document.getElementById('editLeadAP').value.trim();
        project.roles.leadAP.contact = document.getElementById('editLeadAPContact').value.trim();
        project.roles.infoManager.name = document.getElementById('editInfoManager').value.trim();
        project.roles.infoManager.contact = document.getElementById('editInfoManagerContact').value.trim();

        // Also update rawData
        if (project.rawData) {
            project.rawData.projectInfo = { ...project.projectInfo };
            project.rawData.roles = JSON.parse(JSON.stringify(project.roles));
        }

        StorageManager.saveProject(project);
        document.getElementById('editProjectModal').classList.remove('active');

        // Refresh the detail view
        _showProjectDetail(projectId);
        refresh();
    }

    // ========== Logo Upload ==========
    function _bindLogoUpload() {
        const previewBox = document.getElementById('editLogoPreview');
        const fileInput = document.getElementById('editLogoInput');
        const removeBtn = document.getElementById('removeLogoBtn');

        previewBox.addEventListener('click', () => fileInput.click());

        // Drag and drop
        previewBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            previewBox.classList.add('dragover');
        });
        previewBox.addEventListener('dragleave', () => {
            previewBox.classList.remove('dragover');
        });
        previewBox.addEventListener('drop', (e) => {
            e.preventDefault();
            previewBox.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) _processLogoFile(file);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) _processLogoFile(e.target.files[0]);
            e.target.value = '';
        });

        removeBtn.addEventListener('click', () => {
            const projectId = document.getElementById('editProjectModal').dataset.projectId;
            const project = StorageManager.getProject(projectId);
            if (project) {
                delete project.companyLogo;
                StorageManager.saveProject(project);
            }
            previewBox.innerHTML = `<i class="fas fa-cloud-upload-alt"></i><p>${I18n.t('edit_logo_upload')}</p><span>${I18n.t('edit_logo_hint')}</span>`;
            removeBtn.style.display = 'none';
        });
    }

    function _processLogoFile(file) {
        if (!file.type.match(/^image\/(png|jpeg|svg\+xml)$/)) {
            alert(I18n.t('err_image_type'));
            return;
        }
        if (file.size > 512000) {
            alert(I18n.t('err_file_too_large'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const previewBox = document.getElementById('editLogoPreview');
            previewBox.innerHTML = `<img src="${dataUrl}" alt="Logo">`;
            document.getElementById('removeLogoBtn').style.display = 'inline-flex';

            // Save logo to project
            const projectId = document.getElementById('editProjectModal').dataset.projectId;
            const project = StorageManager.getProject(projectId);
            if (project) {
                project.companyLogo = dataUrl;
                StorageManager.saveProject(project);
            }
        };
        reader.readAsDataURL(file);
    }

    function _esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function _timeAgo(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return I18n.t('time_now');
        if (diff < 3600) return I18n.t('time_min').replace('{n}', Math.floor(diff / 60));
        if (diff < 86400) return I18n.t('time_hour').replace('{n}', Math.floor(diff / 3600));
        if (diff < 2592000) return I18n.t('time_day').replace('{n}', Math.floor(diff / 86400));
        return date.toLocaleDateString(I18n.getCurrentLang() === 'ar' ? 'ar-SA' : 'en-US');
    }

    return {
        init,
        refresh
    };
})();
