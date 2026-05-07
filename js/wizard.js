/**
 * BIM Plan Pro - Wizard Controller
 * Multi-step AI wizard for collecting project data and generating plans
 */
const Wizard = (() => {
    let currentStep = 1;
    const totalSteps = 5;
    const ISO_APPROVAL_THRESHOLD = 80;
    let teamCount = 1;
    let _editingProjectId = null;

    function init() {
        _bindEvents();
        _updateProgress();
    }

    function _bindEvents() {
        document.getElementById('nextBtn').addEventListener('click', _nextStep);
        document.getElementById('prevBtn').addEventListener('click', _prevStep);
        document.getElementById('addTeamBtn').addEventListener('click', _addTeam);
        document.getElementById('generateBtn').addEventListener('click', _startGeneration);

        document.getElementById('taskTeamsContainer').addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-team');
            if (removeBtn) {
                const card = removeBtn.closest('.task-team');
                if (document.querySelectorAll('.task-team').length > 1) {
                    card.remove();
                    _reindexTeams();
                }
            }
        });
    }

    function _nextStep() {
        if (currentStep === totalSteps) return;

        if (!_validateStep(currentStep)) return;

        if (currentStep === 4) {
            _buildSummary();
        }

        currentStep++;
        _showStep(currentStep);
        _updateProgress();

        if (currentStep === totalSteps) {
            document.getElementById('nextBtn').classList.add('hidden');
        }
    }

    function _prevStep() {
        if (currentStep === 1) return;
        currentStep--;
        _showStep(currentStep);
        _updateProgress();
        document.getElementById('nextBtn').classList.remove('hidden');
    }

    function _showStep(step) {
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`step-${step}`).classList.add('active');

        document.getElementById('prevBtn').disabled = step === 1;
    }

    function _updateProgress() {
        const pct = (currentStep / totalSteps) * 100;
        document.getElementById('progressFill').style.width = pct + '%';

        document.querySelectorAll('.progress-steps .step').forEach(s => {
            const stepNum = parseInt(s.dataset.step);
            s.classList.remove('active', 'completed');
            if (stepNum === currentStep) s.classList.add('active');
            else if (stepNum < currentStep) s.classList.add('completed');
        });
    }

    function _validateStep(step) {
        if (step === 1) {
            const name = document.getElementById('projectName').value.trim();
            const location = document.getElementById('projectLocation').value.trim();
            const client = document.getElementById('clientName').value.trim();
            const type = document.getElementById('projectType').value;

            if (!name) { _highlightField('projectName'); return false; }
            if (!location) { _highlightField('projectLocation'); return false; }
            if (!client) { _highlightField('clientName'); return false; }
            if (!type) { _highlightField('projectType'); return false; }
        }
        return true;
    }

    function _highlightField(id) {
        const el = document.getElementById(id);
        el.style.borderColor = '#ef4444';
        el.focus();
        el.addEventListener('input', function handler() {
            el.style.borderColor = '';
            el.removeEventListener('input', handler);
        }, { once: true });
    }

    function _addTeam() {
        teamCount++;
        const container = document.getElementById('taskTeamsContainer');
        const html = `
            <div class="role-card task-team" data-team-index="${teamCount - 1}">
                <div class="role-header">
                    <i class="fas fa-users-cog"></i>
                    <h3>${I18n.t('label_task_team')} ${teamCount} (Task Team)</h3>
                    <button class="btn-icon remove-team" title="${I18n.t('btn_remove')}"><i class="fas fa-times"></i></button>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>${I18n.t('label_team_name')}</label>
                        <input type="text" class="teamName" placeholder="${I18n.t('ph_team_name')}">
                    </div>
                    <div class="form-group">
                        <label>${I18n.t('label_team_company')}</label>
                        <input type="text" class="teamCompany" placeholder="${I18n.t('ph_company_name')}">
                    </div>
                    <div class="form-group">
                        <label>${I18n.t('label_team_discipline')}</label>
                        <select class="teamDiscipline">
                            <option value="architecture">${I18n.t('discipline_architecture')}</option>
                            <option value="structural">${I18n.t('discipline_structural')}</option>
                            <option value="mep">${I18n.t('discipline_mep')}</option>
                            <option value="civil">${I18n.t('discipline_civil')}</option>
                            <option value="landscape">${I18n.t('discipline_landscape')}</option>
                            <option value="interior">${I18n.t('discipline_interior')}</option>
                            <option value="other">${I18n.t('discipline_other')}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${I18n.t('label_team_email')}</label>
                        <input type="email" class="teamEmail" placeholder="email@example.com">
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    }

    function _reindexTeams() {
        document.querySelectorAll('.task-team').forEach((card, i) => {
            card.querySelector('h3').textContent = `${I18n.t('label_task_team')} ${i + 1} (Task Team)`;
            card.dataset.teamIndex = i;
        });
        teamCount = document.querySelectorAll('.task-team').length;
    }

    function _collectData() {
        // Step 1: Project Info
        const projectInfo = {
            name: document.getElementById('projectName').value.trim(),
            number: document.getElementById('projectNumber').value.trim(),
            location: document.getElementById('projectLocation').value.trim(),
            client: document.getElementById('clientName').value.trim(),
            type: document.getElementById('projectType').value,
            scale: document.getElementById('projectScale').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            description: document.getElementById('projectDescription').value.trim()
        };

        // Step 2: Roles
        const roles = {
            appointingParty: {
                name: document.getElementById('appointingPartyName').value.trim(),
                contact: document.getElementById('appointingPartyContact').value.trim()
            },
            leadAP: {
                name: document.getElementById('leadApName').value.trim(),
                contact: document.getElementById('leadApContact').value.trim()
            },
            infoManager: {
                name: document.getElementById('infoManagerName').value.trim(),
                contact: document.getElementById('infoManagerContact').value.trim()
            }
        };

        // Task Teams
        const teams = [];
        document.querySelectorAll('.task-team').forEach(card => {
            teams.push({
                name: card.querySelector('.teamName').value.trim(),
                company: card.querySelector('.teamCompany').value.trim(),
                discipline: card.querySelector('.teamDiscipline').value,
                email: card.querySelector('.teamEmail').value.trim()
            });
        });

        // Step 3: Technical
        const software = Array.from(document.querySelectorAll('input[name="software"]:checked'))
            .map(cb => cb.value);
        const coordination = Array.from(document.querySelectorAll('input[name="coordination"]:checked'))
            .map(cb => cb.value);
        const formats = Array.from(document.querySelectorAll('input[name="format"]:checked'))
            .map(cb => cb.value);

        const technical = {
            software,
            coordination,
            cde: document.getElementById('cdeSystem').value,
            formats,
            coordinates: document.getElementById('coordinateSystem').value.trim(),
            units: document.getElementById('unitSystem').value
        };

        // Step 4: BIM Settings
        const lods = Array.from(document.querySelectorAll('input[name="lod"]:checked'))
            .map(cb => cb.value);
        const uses = Array.from(document.querySelectorAll('input[name="bimUse"]:checked'))
            .map(cb => cb.value);

        const bimSettings = {
            lods,
            naming: document.getElementById('namingConvention').value,
            classification: document.getElementById('classificationSystem').value,
            uses,
            notes: document.getElementById('additionalNotes').value.trim()
        };

        return {
            id: _editingProjectId || undefined,
            projectInfo,
            roles,
            teams,
            technical,
            bimSettings
        };
    }

    function _setCheckboxGroup(name, values) {
        const valueSet = new Set(values || []);
        document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
            cb.checked = valueSet.has(cb.value);
        });
    }

    function _renderTeamsForEdit(teams) {
        const container = document.getElementById('taskTeamsContainer');
        container.innerHTML = '';
        teamCount = 0;

        const list = (teams && teams.length) ? teams : [{}];
        list.forEach((t) => {
            _addTeam();
            const card = container.lastElementChild;
            if (!card) return;
            card.querySelector('.teamName').value = t.name || '';
            card.querySelector('.teamCompany').value = t.company || '';
            card.querySelector('.teamDiscipline').value = t.discipline || 'architecture';
            card.querySelector('.teamEmail').value = t.email || '';
        });
        _reindexTeams();
    }

    function editProject(projectId, targetStep = 1) {
        const project = StorageManager.getProject(projectId);
        if (!project) return;

        const source = project.rawData || project;
        const pi = source.projectInfo || {};
        const roles = source.roles || {};
        const tech = source.technical || {};
        const bim = source.bimSettings || {};

        reset();
        _editingProjectId = project.id;

        // Step 1
        document.getElementById('projectName').value = pi.name || '';
        document.getElementById('projectNumber').value = pi.number || '';
        document.getElementById('projectLocation').value = pi.location || '';
        document.getElementById('clientName').value = pi.client || '';
        document.getElementById('projectType').value = pi.type || 'residential';
        document.getElementById('projectScale').value = pi.scale || 'medium';
        document.getElementById('startDate').value = pi.startDate || '';
        document.getElementById('endDate').value = pi.endDate || '';
        document.getElementById('projectDescription').value = pi.description || '';

        // Step 2
        document.getElementById('appointingPartyName').value = roles.appointingParty?.name || '';
        document.getElementById('appointingPartyContact').value = roles.appointingParty?.contact || '';
        document.getElementById('leadApName').value = roles.leadAP?.name || '';
        document.getElementById('leadApContact').value = roles.leadAP?.contact || '';
        document.getElementById('infoManagerName').value = roles.infoManager?.name || '';
        document.getElementById('infoManagerContact').value = roles.infoManager?.contact || '';
        _renderTeamsForEdit(source.teams || []);

        // Step 3
        _setCheckboxGroup('software', tech.software || []);
        _setCheckboxGroup('coordination', tech.coordination || []);
        _setCheckboxGroup('format', tech.formats || []);
        document.getElementById('cdeSystem').value = tech.cde || '';
        document.getElementById('coordinateSystem').value = tech.coordinates || '';
        document.getElementById('unitSystem').value = tech.units || 'metric';

        // Step 4
        _setCheckboxGroup('lod', bim.lods || []);
        _setCheckboxGroup('bimUse', bim.uses || []);
        document.getElementById('namingConvention').value = bim.naming || 'iso19650';
        document.getElementById('classificationSystem').value = bim.classification || 'uniclass';
        document.getElementById('additionalNotes').value = bim.notes || '';

        // Move to requested stage
        currentStep = Math.max(1, Math.min(totalSteps, targetStep));
        if (currentStep >= 5) _buildSummary();
        _showStep(currentStep);
        _updateProgress();

        if (currentStep === totalSteps) {
            document.getElementById('nextBtn').classList.add('hidden');
        } else {
            document.getElementById('nextBtn').classList.remove('hidden');
        }
    }

    function _buildSummary() {
        const data = _collectData();
        const typeNames = AIEngine.getProjectTypeNames();
        const summaryEl = document.getElementById('inputSummary');

        summaryEl.innerHTML = `
            <div class="summary-item">
                <span class="label">${I18n.t('detail_project_name')}</span>
                <span class="value">${data.projectInfo.name}</span>
            </div>
            <div class="summary-item">
                <span class="label">${I18n.t('detail_location')}</span>
                <span class="value">${data.projectInfo.location}</span>
            </div>
            <div class="summary-item">
                <span class="label">${I18n.t('detail_client')}</span>
                <span class="value">${data.projectInfo.client}</span>
            </div>
            <div class="summary-item">
                <span class="label">${I18n.t('label_project_type')}</span>
                <span class="value">${typeNames[data.projectInfo.type] || data.projectInfo.type}</span>
            </div>
            <div class="summary-item">
                <span class="label">${I18n.t('detail_software')}</span>
                <span class="value">${data.technical.software.join(', ') || I18n.t('not_specified')}</span>
            </div>
            <div class="summary-item">
                <span class="label">${I18n.t('detail_cde')}</span>
                <span class="value">${data.technical.cde || I18n.t('not_specified')}</span>
            </div>
            <div class="summary-item">
                <span class="label">${I18n.t('detail_teams')}</span>
                <span class="value">${data.teams.length} ${I18n.t('summary_teams')}</span>
            </div>
            <div class="summary-item">
                <span class="label">${I18n.t('detail_bim_uses')}</span>
                <span class="value">${data.bimSettings.uses.length} ${I18n.t('summary_uses')}</span>
            </div>
        `;
    }

    async function _startGeneration() {
        const data = _collectData();

        document.getElementById('preGeneration').classList.add('hidden');
        document.getElementById('generationProgress').classList.remove('hidden');
        document.getElementById('generatedPlan').classList.add('hidden');
        document.querySelector('.wizard-nav').classList.add('hidden');

        const steps = document.querySelectorAll('#generationSteps .gen-step');
        const statusEl = document.getElementById('generationStatus');

        const messages = [
            I18n.t('gen_msg_1'),
            I18n.t('gen_msg_2'),
            I18n.t('gen_msg_3'),
            I18n.t('gen_msg_4'),
            I18n.t('gen_msg_5'),
            I18n.t('gen_msg_6'),
            I18n.t('gen_msg_7')
        ];

        let plan = null;
        let blockedByCompliance = false;

        for (let i = 0; i < steps.length; i++) {
            steps[i].classList.add('active');
            steps[i].querySelector('i').className = 'fas fa-spinner fa-spin';
            statusEl.textContent = messages[i];

            await _delay(600 + Math.random() * 400);

            // Step 5 (index 4): generate the main plan
            if (i === 4) {
                plan = await AIEngine.generatePlan(data);
            }

            // Step 7 (index 6): separate ISO checklist review stage after plan generation is finalized
            if (i === 6 && plan) {
                plan = _appendISOChecklistReview(plan, data);
            }

            // Approval gate after checklist review stage
            if (i === 6 && plan && plan.isoChecklist && plan.isoChecklist.score < ISO_APPROVAL_THRESHOLD) {
                steps[i].classList.remove('active');
                steps[i].classList.add('failed');
                steps[i].querySelector('i').className = 'fas fa-times-circle';
                statusEl.textContent = I18n.t('iso_chk_blocked_status')
                    .replace('{score}', plan.isoChecklist.score)
                    .replace('{threshold}', ISO_APPROVAL_THRESHOLD);
                blockedByCompliance = true;
                break;
            }

            steps[i].classList.remove('active');
            steps[i].classList.add('done');
            steps[i].querySelector('i').className = 'fas fa-check-circle';
        }

        if (!plan) {
            plan = _appendISOChecklistReview(await AIEngine.generatePlan(data), data);
        }

        if (blockedByCompliance) {
            await _delay(350);
            _renderPlan(plan, data, {
                approved: false,
                threshold: ISO_APPROVAL_THRESHOLD
            });

            StorageManager.saveProject({
                ...data,
                plan,
                rawData: data,
                status: 'draft',
                generatedAt: new Date().toISOString(),
                approvalBlocked: true,
                approvalThreshold: ISO_APPROVAL_THRESHOLD
            });

            document.getElementById('generationProgress').classList.add('hidden');
            document.getElementById('generatedPlan').classList.remove('hidden');
            document.querySelector('.wizard-nav').classList.remove('hidden');
            document.getElementById('nextBtn').classList.add('hidden');
            return;
        }

        statusEl.textContent = I18n.t('msg_plan_generated');

        await _delay(500);

        _renderPlan(plan, data, {
            approved: true,
            threshold: ISO_APPROVAL_THRESHOLD
        });

        // Save project (include raw data for bilingual regeneration)
        const project = {
            ...data,
            plan,
            rawData: data,
            status: 'completed',
            generatedAt: new Date().toISOString()
        };
        StorageManager.saveProject(project);

        document.getElementById('generationProgress').classList.add('hidden');
        document.getElementById('generatedPlan').classList.remove('hidden');
    }

    function _appendISOChecklistReview(plan, data) {
        const allText = (plan.sections || []).map(s => ((s.title || '') + ' ' + (s.content || '')).toLowerCase()).join(' ');
        const hasAny = (terms) => terms.some(t => allText.includes(t));
        const hasAll = (terms) => terms.every(t => allText.includes(t));

        const checks = [
            {
                label: I18n.t('iso_chk_info_req'),
                pass: hasAll(['oir', 'pir', 'air', 'eir']),
                notes: I18n.t('iso_chk_info_req_note'),
                recommendation: I18n.t('iso_chk_info_req_fix')
            },
            {
                label: I18n.t('iso_chk_capability'),
                pass: hasAny(['capability & capacity', 'تقييم القدرة والسعة']),
                notes: I18n.t('iso_chk_capability_note'),
                recommendation: I18n.t('iso_chk_capability_fix')
            },
            {
                label: I18n.t('iso_chk_tender'),
                pass: hasAny(['invitation to tender', 'الدعوة للتعاقد']),
                notes: I18n.t('iso_chk_tender_note'),
                recommendation: I18n.t('iso_chk_tender_fix')
            },
            {
                label: I18n.t('iso_chk_resp_matrix'),
                pass: hasAny(['detailed responsibility matrix', 'مصفوفة مسؤوليات تفصيلية']),
                notes: I18n.t('iso_chk_resp_matrix_note'),
                recommendation: I18n.t('iso_chk_resp_matrix_fix')
            },
            {
                label: I18n.t('iso_chk_cde_states'),
                pass: hasAll(['wip', 'shared', 'published', 'archived']),
                notes: I18n.t('iso_chk_cde_states_note'),
                recommendation: I18n.t('iso_chk_cde_states_fix')
            },
            {
                label: I18n.t('iso_chk_metadata'),
                pass: hasAll(['revision code', 'status code']),
                notes: I18n.t('iso_chk_metadata_note'),
                recommendation: I18n.t('iso_chk_metadata_fix')
            },
            {
                label: I18n.t('iso_chk_triggers'),
                pass: hasAny(['trigger events', 'الأحداث المحفزة', 'aim update triggers']),
                notes: I18n.t('iso_chk_triggers_note'),
                recommendation: I18n.t('iso_chk_triggers_fix')
            },
            {
                label: I18n.t('iso_chk_triage'),
                pass: hasAny(['sensitivity triage', 'ترياج الحساسية']),
                notes: I18n.t('iso_chk_triage_note'),
                recommendation: I18n.t('iso_chk_triage_fix')
            }
        ];

        // Data sanity checks (project setup readiness)
        const roleOk = !!(data.roles && data.roles.appointingParty && data.roles.leadAP && data.roles.infoManager);
        const cdeOk = !!(data.technical && data.technical.cde);
        const teamsOk = !!(data.teams && data.teams.length > 0);
        checks.push({
            label: I18n.t('iso_chk_setup'),
            pass: roleOk && cdeOk && teamsOk,
            notes: I18n.t('iso_chk_setup_note'),
            recommendation: I18n.t('iso_chk_setup_fix')
        });

        const passed = checks.filter(c => c.pass).length;
        const total = checks.length;
        const score = Math.round((passed / total) * 100);
        const failedChecks = checks.filter(c => !c.pass);

        const rows = checks.map((c, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${c.label}</td>
                <td><strong style="color:${c.pass ? '#166534' : '#b91c1c'}">${c.pass ? I18n.t('iso_chk_pass') : I18n.t('iso_chk_fail')}</strong></td>
                <td>${c.notes}</td>
            </tr>
        `).join('');

        const section = {
            number: (plan.sections || []).length + 1,
            title: I18n.t('iso_chk_title'),
            content: `
                <p>${I18n.t('iso_chk_intro')}</p>
                <p><strong>${I18n.t('iso_chk_score')}</strong> ${score}% (${passed}/${total})</p>
                <p><strong>${I18n.t('iso_chk_threshold')}</strong> ${ISO_APPROVAL_THRESHOLD}%</p>
                <table>
                    <tr>
                        <th>#</th>
                        <th>${I18n.t('iso_chk_item')}</th>
                        <th>${I18n.t('iso_chk_status')}</th>
                        <th>${I18n.t('iso_chk_notes')}</th>
                    </tr>
                    ${rows}
                </table>
                ${failedChecks.length ? `
                <h4>${I18n.t('iso_chk_recommendations_title')}</h4>
                <ul>
                    ${failedChecks.map(c => `<li><strong>${c.label}:</strong> ${c.recommendation}</li>`).join('')}
                </ul>
                ` : `<p><strong>${I18n.t('iso_chk_all_good')}</strong></p>`}
            `
        };

        plan.sections = plan.sections || [];
        plan.sections.push(section);
        plan.isoChecklist = { score, passed, total, checks, failedChecks };
        return plan;
    }

    function _renderPlan(plan, data, options = {}) {
        const container = document.getElementById('generatedPlan');
        const approved = options.approved !== false;
        const threshold = options.threshold || ISO_APPROVAL_THRESHOLD;

        let sectionsHTML = plan.sections.map(s => `
            <div class="plan-section">
                <div class="plan-section-header">
                    <div class="plan-section-number">${s.number}</div>
                    <div class="plan-section-title">${s.title}</div>
                </div>
                <div class="plan-section-content">${s.content}</div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="plan-output">
                <div class="plan-cover" style="text-align:center; padding: 32px 20px; background: linear-gradient(135deg, var(--navy-800), var(--navy-600)); color: #fff; border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
                    <div style="margin-bottom: 12px;">
                        <i class="fas fa-building" style="font-size: 2.5rem; opacity: 0.8;"></i>
                    </div>
                    <h2 style="font-size: 1.4rem; margin-bottom: 8px;">${plan.title}</h2>
                    <p style="opacity: 0.8; font-size: 0.9rem;">${plan.subtitle}</p>
                    <p style="opacity: 0.6; font-size: 0.8rem; margin-top: 8px;">${plan.date}</p>
                </div>
                ${!approved ? `
                <div class="compliance-gate-warning">
                    <h3>${I18n.t('iso_chk_blocked_title')}</h3>
                    <p>${I18n.t('iso_chk_blocked_desc')
                        .replace('{score}', plan.isoChecklist ? plan.isoChecklist.score : 0)
                        .replace('{threshold}', threshold)}</p>
                </div>
                ` : ''}
                <div class="plan-actions">
                    <button class="btn btn-primary" onclick="Wizard.exportPlanPDF()" ${!approved ? 'disabled' : ''}>
                        <i class="fas fa-file-pdf"></i> ${I18n.t('btn_pdf')}
                    </button>
                    <button class="btn btn-outline" onclick="Wizard.exportPlanHTML()" ${!approved ? 'disabled' : ''}>
                        <i class="fas fa-file-export"></i> ${I18n.t('btn_export')} HTML
                    </button>
                    <button class="btn btn-outline" onclick="window.print()" ${!approved ? 'disabled' : ''}>
                        <i class="fas fa-print"></i> ${I18n.t('btn_print')}
                    </button>
                    <button class="btn btn-outline" onclick="App.navigateTo('dashboard')">
                        <i class="fas fa-th-large"></i> ${I18n.t('nav_dashboard')}
                    </button>
                </div>
                ${sectionsHTML}
            </div>
        `;
    }

    function _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function reset() {
        _editingProjectId = null;
        currentStep = 1;
        _showStep(1);
        _updateProgress();

        document.getElementById('preGeneration').classList.remove('hidden');
        document.getElementById('generationProgress').classList.add('hidden');
        document.getElementById('generatedPlan').classList.add('hidden');
        document.querySelector('.wizard-nav').classList.remove('hidden');
        document.getElementById('nextBtn').classList.remove('hidden');

        // Reset generation steps
        document.querySelectorAll('#generationSteps .gen-step').forEach((s, i) => {
            s.classList.remove('active', 'done', 'failed');
            s.querySelector('i').className = i === 0 ? 'fas fa-spinner fa-spin' : 'far fa-circle';
        });

        // Reset forms
        document.querySelectorAll('#page-wizard input[type="text"], #page-wizard input[type="email"], #page-wizard input[type="date"], #page-wizard textarea').forEach(el => {
            el.value = '';
        });
        document.querySelectorAll('#page-wizard select').forEach(el => {
            el.selectedIndex = 0;
        });

        // Reset first gen step icon
        const firstStep = document.querySelector('#generationSteps .gen-step');
        if (firstStep) {
            firstStep.querySelector('i').className = 'fas fa-spinner fa-spin';
        }
    }

    function exportPlanHTML() {
        const planEl = document.querySelector('.plan-output');
        if (!planEl) return;

        const isEN = I18n.getCurrentLang() === 'en';
        const dir = isEN ? 'ltr' : 'rtl';
        const lang = isEN ? 'en' : 'ar';
        const textAlign = isEN ? 'left' : 'right';
        const paddingDir = isEN ? 'padding-left' : 'padding-right';
        const fontFamily = isEN ? "'Inter', 'Cairo', sans-serif" : "'Cairo', sans-serif";
        const titleText = isEN ? 'BIM Execution Plan' : 'خطة تنفيذ BIM';

        const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${titleText}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
  body { font-family: ${fontFamily}; max-width: 900px; margin: 0 auto; padding: 20px; color: #1a1d23; line-height: 1.8; direction: ${dir}; }
  h2, h3, h4 { color: #152d54; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.85rem; }
  th { background: #e8f0fb; color: #152d54; font-weight: 700; padding: 10px; text-align: ${textAlign}; border: 1px solid #d1d5df; }
  td { padding: 8px 10px; border: 1px solid #d1d5df; }
  ul { ${paddingDir}: 20px; }
  .plan-section { padding: 20px 0; border-bottom: 1px solid #e8eaf0; }
  .plan-section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .plan-section-number { width: 32px; height: 32px; background: #244f8f; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; }
  .plan-section-title { font-size: 1.05rem; font-weight: 700; color: #152d54; }
  .plan-cover { text-align: center; padding: 40px; background: linear-gradient(135deg, #0f2140, #1b3a68); color: #fff; border-radius: 10px; margin-bottom: 20px; }
  .plan-actions { display: none; }
</style>
</head>
<body>
${planEl.innerHTML}
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'BIM-Execution-Plan.html';
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportPlanPDF() {
        const planEl = document.querySelector('.plan-output');
        if (!planEl) return;

        const isEN = I18n.getCurrentLang() === 'en';
        const titleText = isEN ? 'BIM Execution Plan' : 'خطة تنفيذ BIM';

        const opt = {
            margin: [10, 10, 10, 10],
            filename: titleText.replace(/\s+/g, '-') + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        var wrapper = document.createElement('div');
        wrapper.className = 'pdf-export-container';
        wrapper.style.direction = isEN ? 'ltr' : 'rtl';
        wrapper.style.fontFamily = isEN ? "'Inter', 'Cairo', sans-serif" : "'Cairo', 'Tajawal', sans-serif";
        wrapper.style.padding = '20px';
        wrapper.innerHTML = planEl.innerHTML;

        // Hide action buttons in PDF
        var actions = wrapper.querySelector('.plan-actions');
        if (actions) actions.style.display = 'none';

        document.body.appendChild(wrapper);
        html2pdf().set(opt).from(wrapper).save().then(function () {
            document.body.removeChild(wrapper);
        });
    }

    function viewPlan(projectId) {
        const project = StorageManager.getProject(projectId);
        if (!project || !project.plan) return;

        const modal = document.getElementById('planModal');
        const modalBody = document.getElementById('modalBody');
        const modalTitle = document.getElementById('modalTitle');

        modalTitle.textContent = project.plan.title;
        // Store current project ID and raw data for bilingual export
        modal.dataset.projectId = projectId;

        let sectionsHTML = project.plan.sections.map(s => `
            <div class="plan-section">
                <div class="plan-section-header">
                    <div class="plan-section-number">${s.number}</div>
                    <div class="plan-section-title">${s.title}</div>
                </div>
                <div class="plan-section-content">${s.content}</div>
            </div>
        `).join('');

        modalBody.innerHTML = sectionsHTML;
        modal.classList.add('active');
    }

    return {
        init,
        reset,
        editProject,
        exportPlanHTML,
        exportPlanPDF,
        viewPlan
    };
})();
