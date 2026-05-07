"""
BIM Plan Pro - Flask Backend
قاعدة البيانات: SQLite مدمجة داخل الكود (bimplan.db)
يعمل بالكامل دون أي خدمات خارجية
"""

import os
import json
import sqlite3
import hashlib
import secrets
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, session, send_from_directory, g

# ---------------------------------------------------------------------------
# إعداد التطبيق
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, 'bimplan.db')

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')

# مفتاح الجلسة — ثابت حتى لا تنتهي جلسات المستخدمين عند إعادة تشغيل الخادم
app.secret_key = os.environ.get('SECRET_KEY', 'bimplanpro-dev-key-do-not-use-in-production')
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True

# ---------------------------------------------------------------------------
# قاعدة البيانات (SQLite)
# ---------------------------------------------------------------------------

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys = ON')
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def init_db():
    """إنشاء جداول قاعدة البيانات إن لم تكن موجودة."""
    db = sqlite3.connect(DATABASE)
    db.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            email           TEXT    UNIQUE NOT NULL,
            password_hash   TEXT    NOT NULL,
            name            TEXT    DEFAULT '',
            company         TEXT    DEFAULT '',
            photo           TEXT    DEFAULT '',
            company_logo    TEXT    DEFAULT '',
            created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS projects (
            id          TEXT    PRIMARY KEY,
            user_id     INTEGER NOT NULL,
            data        TEXT    NOT NULL,
            status      TEXT    DEFAULT 'draft',
            created_at  TEXT    NOT NULL,
            updated_at  TEXT    NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
            user_id     INTEGER PRIMARY KEY,
            data        TEXT    NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    ''')
    db.commit()
    db.close()


# تهيئة قاعدة البيانات عند بدء التطبيق
init_db()

# ---------------------------------------------------------------------------
# المساعدات: كلمات المرور
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """تشفير كلمة المرور باستخدام PBKDF2-SHA256 مع salt عشوائي."""
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        310_000  # عدد تكرارات PBKDF2 (OWASP 2023)
    )
    return f"{salt}:{h.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """التحقق من كلمة المرور بشكل آمن ضد timing attacks."""
    try:
        salt, h = stored_hash.split(':', 1)
        computed = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            310_000
        )
        return secrets.compare_digest(h, computed.hex())
    except Exception:
        return False

# ---------------------------------------------------------------------------
# Decorator: تأكيد تسجيل الدخول
# ---------------------------------------------------------------------------

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'يجب تسجيل الدخول أولاً'}), 401
        return f(*args, **kwargs)
    return decorated

# ---------------------------------------------------------------------------
# الملفات الثابتة (HTML / CSS / JS)
# ---------------------------------------------------------------------------

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/css/<path:filename>')
def css_files(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'css'), filename)


@app.route('/js/<path:filename>')
def js_files(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'js'), filename)

# ---------------------------------------------------------------------------
# نقاط نهاية المصادقة  /api/auth/*
# ---------------------------------------------------------------------------

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    name     = (data.get('name') or '').strip()

    if not email or not password:
        return jsonify({'error': 'البريد الإلكتروني وكلمة المرور مطلوبان'}), 400
    if len(password) < 6:
        return jsonify({'error': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'}), 400
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'صيغة البريد الإلكتروني غير صحيحة'}), 400

    db = get_db()
    existing = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        return jsonify({'error': 'هذا البريد الإلكتروني مسجّل مسبقاً'}), 409

    pw_hash = hash_password(password)
    cursor  = db.execute(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
        (email, pw_hash, name)
    )
    db.commit()
    user_id = cursor.lastrowid

    session['user_id'] = user_id
    return jsonify({'id': user_id, 'email': email, 'name': name, 'company': '', 'photo': '', 'company_logo': '', 'provider': 'password'}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'البريد الإلكتروني وكلمة المرور مطلوبان'}), 400

    db   = get_db()
    user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()

    # رسالة موحدة لمنع تخمين وجود الحسابات (OWASP)
    if not user or not verify_password(password, user['password_hash']):
        return jsonify({'error': 'البريد الإلكتروني أو كلمة المرور غير صحيحة'}), 401

    session['user_id'] = user['id']
    return jsonify({
        'id':           user['id'],
        'email':        user['email'],
        'name':         user['name'],
        'company':      user['company'],
        'photo':        user['photo'],
        'company_logo': user['company_logo'],
        'provider':     'password'
    })


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'ok': True})


@app.route('/api/auth/me', methods=['GET'])
@login_required
def me():
    db   = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    if not user:
        session.clear()
        return jsonify({'error': 'الجلسة منتهية'}), 401
    return jsonify({
        'id':           user['id'],
        'email':        user['email'],
        'name':         user['name'],
        'company':      user['company'],
        'photo':        user['photo'],
        'company_logo': user['company_logo'],
        'provider':     'password'
    })


@app.route('/api/auth/profile', methods=['PUT'])
@login_required
def update_profile():
    data = request.get_json(silent=True) or {}
    db   = get_db()
    db.execute(
        'UPDATE users SET name=?, company=?, photo=?, company_logo=? WHERE id=?',
        (
            data.get('name', ''),
            data.get('company', ''),
            data.get('photo', ''),
            data.get('companyLogo', ''),
            session['user_id']
        )
    )
    db.commit()
    return jsonify({'ok': True})


@app.route('/api/auth/password', methods=['PUT'])
@login_required
def change_password():
    data       = request.get_json(silent=True) or {}
    current_pw = data.get('currentPassword') or ''
    new_pw     = data.get('newPassword') or ''

    if len(new_pw) < 6:
        return jsonify({'error': 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'}), 400

    db   = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()

    if not verify_password(current_pw, user['password_hash']):
        return jsonify({'error': 'كلمة المرور الحالية غير صحيحة'}), 401

    db.execute('UPDATE users SET password_hash=? WHERE id=?', (hash_password(new_pw), session['user_id']))
    db.commit()
    return jsonify({'ok': True})

# ---------------------------------------------------------------------------
# نقاط نهاية المشاريع  /api/projects/*
# ---------------------------------------------------------------------------

@app.route('/api/projects', methods=['GET'])
@login_required
def get_projects():
    db   = get_db()
    rows = db.execute(
        'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
        (session['user_id'],)
    ).fetchall()
    projects = []
    for row in rows:
        p = json.loads(row['data'])
        p['id']        = row['id']
        p['status']    = row['status']
        p['createdAt'] = row['created_at']
        p['updatedAt'] = row['updated_at']
        projects.append(p)
    return jsonify(projects)


@app.route('/api/projects/<project_id>', methods=['GET'])
@login_required
def get_project(project_id):
    db  = get_db()
    row = db.execute(
        'SELECT * FROM projects WHERE id = ? AND user_id = ?',
        (project_id, session['user_id'])
    ).fetchone()
    if not row:
        return jsonify({'error': 'المشروع غير موجود'}), 404
    p = json.loads(row['data'])
    p['id']        = row['id']
    p['status']    = row['status']
    p['createdAt'] = row['created_at']
    p['updatedAt'] = row['updated_at']
    return jsonify(p)


@app.route('/api/projects', methods=['POST'])
@login_required
def save_project():
    project = request.get_json(silent=True) or {}
    db      = get_db()
    now     = datetime.utcnow().isoformat()

    if not project.get('id'):
        project['id']        = 'proj_' + str(int(datetime.now().timestamp() * 1000)) + '_' + secrets.token_hex(4)
        project['createdAt'] = now

    status = project.get('status', 'draft')
    # البيانات المخزّنة لا تحتوي على الحقول الوصفية (تُحفظ في أعمدة منفصلة)
    data_to_store = {k: v for k, v in project.items() if k not in ('id', 'status', 'createdAt', 'updatedAt')}

    existing = db.execute(
        'SELECT id FROM projects WHERE id = ? AND user_id = ?',
        (project['id'], session['user_id'])
    ).fetchone()

    if existing:
        db.execute(
            'UPDATE projects SET data=?, status=?, updated_at=? WHERE id=? AND user_id=?',
            (json.dumps(data_to_store), status, now, project['id'], session['user_id'])
        )
    else:
        db.execute(
            'INSERT INTO projects (id, user_id, data, status, created_at, updated_at) VALUES (?,?,?,?,?,?)',
            (project['id'], session['user_id'], json.dumps(data_to_store), status, project.get('createdAt', now), now)
        )
    db.commit()
    project['updatedAt'] = now
    return jsonify(project)


@app.route('/api/projects/<project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    db = get_db()
    db.execute('DELETE FROM projects WHERE id = ? AND user_id = ?', (project_id, session['user_id']))
    db.commit()
    return jsonify({'ok': True})

# ---------------------------------------------------------------------------
# نقاط نهاية الإعدادات  /api/settings
# ---------------------------------------------------------------------------

@app.route('/api/settings', methods=['GET'])
@login_required
def get_settings():
    db  = get_db()
    row = db.execute('SELECT data FROM settings WHERE user_id = ?', (session['user_id'],)).fetchone()
    if row:
        return jsonify(json.loads(row['data']))
    return jsonify({'language': 'ar'})


@app.route('/api/settings', methods=['PUT'])
@login_required
def save_settings():
    data = request.get_json(silent=True) or {}
    db   = get_db()
    exists = db.execute('SELECT user_id FROM settings WHERE user_id = ?', (session['user_id'],)).fetchone()
    if exists:
        db.execute('UPDATE settings SET data=? WHERE user_id=?', (json.dumps(data), session['user_id']))
    else:
        db.execute('INSERT INTO settings (user_id, data) VALUES (?,?)', (session['user_id'], json.dumps(data)))
    db.commit()
    return jsonify({'ok': True})

# ---------------------------------------------------------------------------
# تشغيل التطبيق
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    print('=' * 60)
    print('  BIM Plan Pro - Flask Server')
    print('  قاعدة البيانات:', DATABASE)
    print(f'  الرابط: http://localhost:{port}')
    print('=' * 60)
    app.run(host='0.0.0.0', port=port, debug=debug)
