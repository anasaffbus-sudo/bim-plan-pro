/**
 * BIM Plan Pro - Authentication (Flask Backend)
 * تسجيل الدخول / التسجيل عبر خادم Flask المحلي
 * لا حاجة لأي خدمة خارجية — قاعدة البيانات مدمجة داخل الكود
 */
const Auth = (() => {

    let _currentUser = null;
    let _onAuthChangedCallbacks = [];

    // ==========================================
    //  مساعدات HTTP
    // ==========================================
    function _post(url, body) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body)
        }).then(function (res) {
            return res.json().then(function (data) {
                if (!res.ok) throw new Error(data.error || 'خطأ في الخادم');
                return data;
            });
        });
    }

    function _put(url, body) {
        return fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body)
        }).then(function (res) {
            return res.json().then(function (data) {
                if (!res.ok) throw new Error(data.error || 'خطأ في الخادم');
                return data;
            });
        });
    }

    // ==========================================
    //  init — فحص الجلسة الحالية عند تحميل الصفحة
    // ==========================================
    function init() {
        fetch('/api/auth/me', { credentials: 'same-origin' })
            .then(function (res) {
                if (res.ok) return res.json();
                return null;
            })
            .then(function (user) {
                _currentUser = user || null;
                _notifyCallbacks();
            })
            .catch(function () {
                _currentUser = null;
                _notifyCallbacks();
            });
    }

    // ==========================================
    //  Google Sign-In — يستخدم نفس تسجيل الدخول بالبريد
    //  (Flask لا يدعم OAuth مباشرة — يُستخدم نموذج بريد مبسّط)
    // ==========================================
    function signInWithGoogle(localName, localEmail) {
        var GOOGLE_PW = '_google_oauth_sim_v1_';
        return _post('/api/auth/login', { email: localEmail, password: GOOGLE_PW })
            .catch(function () {
                // الحساب غير موجود — أنشئه بكلمة مرور ثابتة ومحددة
                return _post('/api/auth/register', {
                    email: localEmail,
                    password: GOOGLE_PW,
                    name: localName || localEmail.split('@')[0]
                });
            })
            .then(function (user) {
                _currentUser = user;
                _notifyCallbacks();
                return user;
            });
    }

    // ==========================================
    //  Email / Password
    // ==========================================
    function signInWithEmail(email, password) {
        return _post('/api/auth/login', { email: email, password: password })
            .then(function (user) {
                _currentUser = user;
                _notifyCallbacks();
                return user;
            });
    }

    function registerWithEmail(name, email, password) {
        return _post('/api/auth/register', { name: name, email: email, password: password })
            .then(function (user) {
                _currentUser = user;
                _notifyCallbacks();
                return user;
            });
    }

    // ==========================================
    //  Sign Out
    // ==========================================
    function signOut() {
        return _post('/api/auth/logout', {}).then(function () {
            _currentUser = null;
            _notifyCallbacks();
        });
    }

    // ==========================================
    //  Update Profile
    // ==========================================
    function updateProfile(data) {
        return _put('/api/auth/profile', data).then(function () {
            if (_currentUser) {
                if (data.name          !== undefined) _currentUser.name         = data.name;
                if (data.company       !== undefined) _currentUser.company      = data.company;
                if (data.photo         !== undefined) _currentUser.photo        = data.photo;
                if (data.companyLogo   !== undefined) _currentUser.company_logo = data.companyLogo;
            }
            _notifyCallbacks();
        });
    }

    // ==========================================
    //  Update Password
    // ==========================================
    function updatePassword(currentPw, newPw) {
        return _put('/api/auth/password', { currentPassword: currentPw, newPassword: newPw });
    }

    // ========== State ==========
    function getCurrentUser() {
        return _currentUser;
    }

    function isLoggedIn() {
        return !!_currentUser;
    }

    function isFirebaseReady() {
        // دائماً صحيح لأن Flask يعمل محلياً
        return true;
    }

    // ========== Observers ==========
    function onAuthChanged(callback) {
        _onAuthChangedCallbacks.push(callback);
        // Fire immediately with current state
        if (_currentUser !== undefined) {
            callback(_currentUser);
        }
    }

    function _notifyCallbacks() {
        _onAuthChangedCallbacks.forEach(function (cb) {
            try { cb(_currentUser); } catch (e) { console.error(e); }
        });
    }

    return {
        init,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        signOut,
        updateProfile,
        updatePassword,
        getCurrentUser,
        isLoggedIn,
        isFirebaseReady,
        onAuthChanged
    };
})();
