/**
 * BIM Plan Pro - Storage Manager (Flask Backend)
 * يتصل بخادم Flask المحلي لحفظ المشاريع والإعدادات.
 * يحتفظ بكاش في الذاكرة حتى تبقى القراءات المتزامنة تعمل دون تغيير في الكود المُستدعي.
 */
const StorageManager = (() => {
    // --------------- كاش محلي ---------------
    let _cache = [];          // مصفوفة المشاريع
    let _settings = { language: 'ar' };
    let _ready = false;       // هل تمّ التحميل الأوّلي من الخادم؟

    // --------------- مساعدات HTTP ---------------
    function _apiGet(url) {
        return fetch(url, { credentials: 'same-origin' }).then(function (r) {
            if (r.status === 401) return null;
            return r.json();
        });
    }

    function _apiPost(url, body) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body)
        }).then(function (r) { return r.json(); });
    }

    function _apiPut(url, body) {
        return fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body)
        }).then(function (r) { return r.json(); });
    }

    function _apiDelete(url) {
        return fetch(url, { method: 'DELETE', credentials: 'same-origin' })
            .then(function (r) { return r.json(); });
    }

    // --------------- تهيئة أوّلية ---------------
    /**
     * يجب استدعاؤه عند بدء التطبيق (بعد login).
     * يحمّل المشاريع والإعدادات من الخادم إلى الكاش.
     * يعيد Promise يُحلّ عند اكتمال التحميل.
     */
    function init() {
        return Promise.all([
            _apiGet('/api/projects').then(function (data) {
                if (Array.isArray(data)) _cache = data;
            }),
            _apiGet('/api/settings').then(function (data) {
                if (data) _settings = data;
            })
        ]).then(function () {
            _ready = true;
        }).catch(function (err) {
            console.warn('[StorageManager] init error:', err);
            _cache = [];
            _ready = true;
        });
    }

    /**
     * مسح الكاش عند تسجيل الخروج.
     */
    function reset() {
        _cache    = [];
        _settings = { language: 'ar' };
        _ready    = false;
    }

    // --------------- واجهة المشاريع (متزامنة — تقرأ من الكاش) ---------------

    function getAllProjects() {
        return _cache.slice();
    }

    function getProject(id) {
        return _cache.find(function (p) { return p.id === id; }) || null;
    }

    function saveProject(project) {
        // توليد مُعرّف إذا لم يكن موجوداً
        if (!project.id) {
            project.id        = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            project.createdAt = new Date().toISOString();
        }
        project.updatedAt = new Date().toISOString();

        // تحديث الكاش فوراً
        var idx = _cache.findIndex(function (p) { return p.id === project.id; });
        if (idx >= 0) {
            _cache[idx] = project;
        } else {
            _cache.unshift(project);
        }

        // مزامنة مع الخادم في الخلفية
        _apiPost('/api/projects', project).catch(function (err) {
            console.error('[StorageManager] saveProject sync error:', err);
        });

        return project;
    }

    function deleteProject(id) {
        _cache = _cache.filter(function (p) { return p.id !== id; });
        _apiDelete('/api/projects/' + id).catch(function (err) {
            console.error('[StorageManager] deleteProject sync error:', err);
        });
    }

    function getStats() {
        return {
            total:     _cache.length,
            completed: _cache.filter(function (p) { return p.status === 'completed'; }).length,
            draft:     _cache.filter(function (p) { return p.status === 'draft'; }).length
        };
    }

    function getRecentProjects(limit) {
        return _cache.slice(0, limit || 5);
    }

    // --------------- تصدير / استيراد ---------------

    function exportAll() {
        var blob = new Blob([JSON.stringify(_cache, null, 2)], { type: 'application/json' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href   = url;
        a.download = 'bim-plans-export-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importData(jsonString) {
        try {
            var imported = JSON.parse(jsonString);
            if (!Array.isArray(imported)) throw new Error('Invalid format');
            // دمج مع الكاش الحالي ومزامنة الجديد فقط
            imported.forEach(function (project) {
                var exists = _cache.find(function (p) { return p.id === project.id; });
                if (!exists) {
                    _cache.unshift(project);
                    _apiPost('/api/projects', project).catch(function (e) {
                        console.error('[StorageManager] import sync error:', e);
                    });
                }
            });
            return imported.length;
        } catch (e) {
            throw new Error(I18n.t('msg_import_failed'));
        }
    }

    function clearAll() {
        // حذف كل مشاريع المستخدم من الخادم
        var toDelete = _cache.slice();
        _cache = [];
        toDelete.forEach(function (p) {
            _apiDelete('/api/projects/' + p.id).catch(function () {});
        });
    }

    // --------------- الإعدادات ---------------

    function getSettings() {
        return Object.assign({}, _settings);
    }

    function saveSettings(settings) {
        _settings = Object.assign({}, settings);
        _apiPut('/api/settings', _settings).catch(function (err) {
            console.error('[StorageManager] saveSettings sync error:', err);
        });
    }

    // --------------- واجهة عامة ---------------
    return {
        init,
        reset,
        getAllProjects,
        getProject,
        saveProject,
        deleteProject,
        getStats,
        getRecentProjects,
        exportAll,
        importData,
        clearAll,
        getSettings,
        saveSettings
    };
})();
