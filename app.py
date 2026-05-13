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
from flask import Flask, request, jsonify, session, send_from_directory, g, redirect, url_for
from werkzeug.middleware.proxy_fix import ProxyFix
from authlib.integrations.flask_client import OAuth

# ---------------------------------------------------------------------------
# إعداد التطبيق
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, 'bimplan.db')

# ---------------------------------------------------------------------------
# تحديد نوع قاعدة البيانات: Postgres على Render / SQLite محلياً
# ---------------------------------------------------------------------------
_DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()
# Render أحياناً يستخدم postgres:// — psycopg2 يحتاج postgresql://
if _DATABASE_URL.startswith('postgres://'):
    _DATABASE_URL = 'postgresql://' + _DATABASE_URL[len('postgres://'):]
IS_POSTGRES = bool(_DATABASE_URL)

if IS_POSTGRES:
    import psycopg2
    import psycopg2.extras
    DB_IntegrityError = psycopg2.IntegrityError
else:
    DB_IntegrityError = sqlite3.IntegrityError

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')

# مفتاح الجلسة — ثابت حتى لا تنتهي جلسات المستخدمين عند إعادة تشغيل الخادم
app.secret_key = os.environ.get('SECRET_KEY', 'bimplanpro-dev-key-do-not-use-in-production')
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'

# تطبيق ProxyFix للعمل خلف Render's load balancer (HTTPS)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# ---------------------------------------------------------------------------
# قاعدة البيانات — طبقة موحّدة (Postgres / SQLite)
# ---------------------------------------------------------------------------

class _Result:
    """نتيجة استعلام موحّدة لكلا المحركين."""
    def __init__(self, cursor, lastrowid=None):
        self._cursor = cursor
        self.lastrowid = lastrowid
        self.rowcount = cursor.rowcount if cursor is not None else 0

    def fetchone(self):
        return self._cursor.fetchone() if self._cursor is not None else None

    def fetchall(self):
        return self._cursor.fetchall() if self._cursor is not None else []


class _SQLiteConn:
    """غلاف اتصال SQLite يوحّد الواجهة مع Postgres."""
    def __init__(self, conn):
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA foreign_keys = ON')
        self._conn = conn

    def execute(self, sql, params=()):
        cur = self._conn.execute(sql, params)
        return _Result(cur, lastrowid=cur.lastrowid)

    def insert_returning_id(self, sql, params=()):
        cur = self._conn.execute(sql, params)
        return cur.lastrowid

    def executescript(self, sql):
        self._conn.executescript(sql)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


class _PostgresConn:
    """غلاف اتصال Postgres يحاكي واجهة SQLite (؟ → %s، fetchone/fetchall، lastrowid)."""
    def __init__(self, conn):
        self._conn = conn

    @staticmethod
    def _rewrite(sql):
        # تحويل علامات الاستفهام إلى %s دون لمس النصوص المقتبسة (المشروع لا يستخدم ? داخل نصوص)
        return sql.replace('?', '%s')

    def execute(self, sql, params=()):
        cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(self._rewrite(sql), params)
        # إذا كان الاستعلام يُرجع صفوفاً (SELECT أو RETURNING) — اترك الـcursor مفتوحاً
        if cur.description is not None:
            return _Result(cur)
        result = _Result(None)
        result.rowcount = cur.rowcount
        cur.close()
        return result

    def insert_returning_id(self, sql, params=()):
        sql_pg = self._rewrite(sql).rstrip().rstrip(';')
        if 'RETURNING' not in sql_pg.upper():
            sql_pg += ' RETURNING id'
        cur = self._conn.cursor()
        cur.execute(sql_pg, params)
        new_id = cur.fetchone()[0]
        cur.close()
        return new_id

    def executescript(self, sql):
        cur = self._conn.cursor()
        cur.execute(sql)
        cur.close()

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def _open_connection():
    if IS_POSTGRES:
        return _PostgresConn(psycopg2.connect(_DATABASE_URL))
    return _SQLiteConn(sqlite3.connect(DATABASE))


def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = _open_connection()
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


# DDL مختلف بين المحرّكين
_SCHEMA_SQLITE = '''
    CREATE TABLE IF NOT EXISTS users (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        email           TEXT    UNIQUE NOT NULL,
        password_hash   TEXT    DEFAULT '',
        name            TEXT    DEFAULT '',
        company         TEXT    DEFAULT '',
        photo           TEXT    DEFAULT '',
        company_logo    TEXT    DEFAULT '',
        provider        TEXT    DEFAULT 'password',
        role            TEXT    DEFAULT 'user',
        plan            TEXT    DEFAULT 'starter',
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
    CREATE TABLE IF NOT EXISTS team_members (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id    INTEGER NOT NULL,
        email       TEXT    NOT NULL,
        name        TEXT    DEFAULT '',
        invited_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(owner_id, email),
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
'''

_SCHEMA_POSTGRES = '''
    CREATE TABLE IF NOT EXISTS users (
        id              SERIAL  PRIMARY KEY,
        email           TEXT    UNIQUE NOT NULL,
        password_hash   TEXT    DEFAULT '',
        name            TEXT    DEFAULT '',
        company         TEXT    DEFAULT '',
        photo           TEXT    DEFAULT '',
        company_logo    TEXT    DEFAULT '',
        provider        TEXT    DEFAULT 'password',
        role            TEXT    DEFAULT 'user',
        plan            TEXT    DEFAULT 'starter',
        created_at      TEXT    DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.US'))
    );
    CREATE TABLE IF NOT EXISTS projects (
        id          TEXT    PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data        TEXT    NOT NULL,
        status      TEXT    DEFAULT 'draft',
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
        user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        data        TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS team_members (
        id          SERIAL  PRIMARY KEY,
        owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email       TEXT    NOT NULL,
        name        TEXT    DEFAULT '',
        invited_at  TEXT    DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.US')),
        UNIQUE(owner_id, email)
    );
'''


def init_db():
    """إنشاء جداول قاعدة البيانات إن لم تكن موجودة."""
    if IS_POSTGRES:
        conn = psycopg2.connect(_DATABASE_URL)
        cur = conn.cursor()
        cur.execute(_SCHEMA_POSTGRES)
        # Migrations (تعمل بأمان حتى لو كانت الأعمدة موجودة)
        for col, ddl in [
            ('provider', "TEXT DEFAULT 'password'"),
            ('role',     "TEXT DEFAULT 'user'"),
            ('plan',     "TEXT DEFAULT 'starter'"),
        ]:
            cur.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {ddl}")
        conn.commit()
        cur.close()
        conn.close()
    else:
        conn = sqlite3.connect(DATABASE)
        conn.executescript(_SCHEMA_SQLITE)
        for col, ddl in [
            ('provider', "TEXT DEFAULT 'password'"),
            ('role',     "TEXT DEFAULT 'user'"),
            ('plan',     "TEXT DEFAULT 'starter'"),
        ]:
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col} {ddl}")
                conn.commit()
            except Exception:
                pass  # العمود موجود مسبقاً
        conn.commit()
        conn.close()


# تهيئة قاعدة البيانات عند بدء التطبيق
init_db()

# ---------------------------------------------------------------------------
# إعداد Google OAuth
# ---------------------------------------------------------------------------
oauth = OAuth(app)
google_oauth = oauth.register(
    name='google',
    client_id=os.environ.get('GOOGLE_CLIENT_ID', ''),
    client_secret=os.environ.get('GOOGLE_CLIENT_SECRET', ''),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile', 'prompt': 'select_account'}
)

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
# Decorator: تأكيد صلاحيات المشرف
# ---------------------------------------------------------------------------

def _admin_emails():
    raw = os.environ.get('ADMIN_EMAILS', '')
    return {e.strip().lower() for e in raw.split(',') if e.strip()}


def _resolve_role(email: str) -> str:
    """إرجاع 'admin' إن كان البريد ضمن ADMIN_EMAILS ، وإلا 'user'."""
    return 'admin' if email.lower() in _admin_emails() else 'user'


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'يجب تسجيل الدخول أولاً'}), 401
        db = get_db()
        u = db.execute('SELECT role FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        if not u or (u['role'] or 'user') != 'admin':
            return jsonify({'error': 'هذه الصفحة للمشرف فقط'}), 403
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
    role    = _resolve_role(email)
    user_id = db.insert_returning_id(
        'INSERT INTO users (email, password_hash, name, provider, role) VALUES (?, ?, ?, ?, ?)',
        (email, pw_hash, name, 'password', role)
    )
    db.commit()

    session['user_id'] = user_id
    return jsonify({'id': user_id, 'email': email, 'name': name, 'company': '', 'photo': '', 'company_logo': '', 'provider': 'password', 'role': role}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'البريد الإلكتروني وكلمة المرور مطلوبان'}), 400

    db   = get_db()
    user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()

    # حساب Google لا يملك كلمة مرور
    if user and not user['password_hash']:
        return jsonify({'error': 'هذا الحساب مسجّل بحساب Google. يرجى الدخول عبر "تسجيل الدخول بحساب Google"'}), 401

    # رسالة موحدة لمنع تخمين وجود الحسابات (OWASP)
    if not user or not verify_password(password, user['password_hash']):
        return jsonify({'error': 'البريد الإلكتروني أو كلمة المرور غير صحيحة'}), 401

    session['user_id'] = user['id']
    # تحديث الدور ديناميكياً إن تغيّرت ADMIN_EMAILS
    desired_role = _resolve_role(user['email'])
    if (user['role'] or 'user') != desired_role:
        db.execute('UPDATE users SET role=? WHERE id=?', (desired_role, user['id']))
        db.commit()
    return jsonify({
        'id':           user['id'],
        'email':        user['email'],
        'name':         user['name'],
        'company':      user['company'],
        'photo':        user['photo'],
        'company_logo': user['company_logo'],
        'provider':     user['provider'] or 'password',
        'role':         desired_role,
        'plan':         user['plan'] or 'starter'
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
        'provider':     user['provider'] or 'password',
        'role':         user['role'] or 'user',
        'plan':         user['plan'] or 'starter'
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
# Google OAuth مسارات
# ---------------------------------------------------------------------------

@app.route('/api/auth/google/login')
def google_login():
    if not os.environ.get('GOOGLE_CLIENT_ID'):
        return '<h2>Google OAuth غير مُهيَّأ. أضف GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET في إعدادات Render.</h2>', 503
    redirect_uri = url_for('google_callback', _external=True)
    return google_oauth.authorize_redirect(redirect_uri)


@app.route('/api/auth/google/callback')
def google_callback():
    try:
        token     = google_oauth.authorize_access_token()
        user_info = token.get('userinfo') or {}
    except Exception:
        return redirect('/?auth_error=google_failed')

    email = (user_info.get('email') or '').strip().lower()
    name  = user_info.get('name', '')
    photo = user_info.get('picture', '')

    if not email:
        return redirect('/?auth_error=no_email')

    db   = get_db()
    user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()

    desired_role = _resolve_role(email)
    if user:
        # تحديث الصورة والمزوّد والدور لحساب موجود
        new_name = name if not user['name'] else user['name']
        db.execute(
            'UPDATE users SET photo=?, name=?, provider=?, role=? WHERE id=?',
            (photo, new_name, 'google.com', desired_role, user['id'])
        )
        db.commit()
        user_id = user['id']
    else:
        user_id = db.insert_returning_id(
            'INSERT INTO users (email, password_hash, name, photo, provider, role) VALUES (?, ?, ?, ?, ?, ?)',
            (email, '', name, photo, 'google.com', desired_role)
        )
        db.commit()

    session['user_id'] = user_id
    return redirect('/')


# ---------------------------------------------------------------------------
# لوحة تحكم المشرف
# ---------------------------------------------------------------------------

@app.route('/admin')
@admin_required
def admin_panel():
    return send_from_directory(BASE_DIR, 'admin.html')


@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_list_users():
    db   = get_db()
    rows = db.execute(
        'SELECT id, email, name, company, photo, provider, role, plan, created_at FROM users ORDER BY created_at DESC'
    ).fetchall()
    users = [dict(r) for r in rows]
    return jsonify(users)


# ---------------------------------------------------------------------------
# Plans + Team Sharing (Day 4 Round 4 features)
# ---------------------------------------------------------------------------

VALID_PLANS = {'starter', 'pro', 'enterprise'}
PLAN_RANK = {'starter': 0, 'pro': 1, 'enterprise': 2}
TEAM_LIMIT_BY_PLAN = {'starter': 0, 'pro': 5, 'enterprise': 999}


def _user_plan(user_row):
    return (user_row['plan'] or 'starter') if user_row else 'starter'


def _has_plan(user_row, min_plan):
    return PLAN_RANK.get(_user_plan(user_row), 0) >= PLAN_RANK.get(min_plan, 0)


@app.route('/api/plan', methods=['GET'])
@login_required
def get_plan():
    """إرجاع باقة المستخدم الحالية + حدودها."""
    db   = get_db()
    user = db.execute('SELECT plan FROM users WHERE id=?', (session['user_id'],)).fetchone()
    plan = _user_plan(user)
    return jsonify({
        'plan':       plan,
        'team_limit': TEAM_LIMIT_BY_PLAN.get(plan, 0),
        'features': {
            'company_logo':    plan in ('pro', 'enterprise'),
            'team_sharing':    plan in ('pro', 'enterprise'),
            'templates_library': plan == 'enterprise',
        }
    })


@app.route('/api/plan', methods=['POST'])
@login_required
def upgrade_plan():
    """ترقية/تغيير الباقة (تجربة — بدون دفع فعلي)."""
    data = request.get_json(silent=True) or {}
    new_plan = (data.get('plan') or '').strip().lower()
    if new_plan not in VALID_PLANS:
        return jsonify({'error': 'باقة غير صالحة'}), 400
    db = get_db()
    db.execute('UPDATE users SET plan=? WHERE id=?', (new_plan, session['user_id']))
    db.commit()
    return jsonify({'ok': True, 'plan': new_plan})


# ----- Team Sharing (Pro: up to 5, Enterprise: unlimited) -----

@app.route('/api/team', methods=['GET'])
@login_required
def list_team():
    db      = get_db()
    user    = db.execute('SELECT plan FROM users WHERE id=?', (session['user_id'],)).fetchone()
    plan    = _user_plan(user)
    limit   = TEAM_LIMIT_BY_PLAN.get(plan, 0)
    members = db.execute(
        'SELECT id, email, name, invited_at FROM team_members WHERE owner_id=? ORDER BY invited_at DESC',
        (session['user_id'],)
    ).fetchall()
    return jsonify({
        'plan':    plan,
        'limit':   limit,
        'count':   len(members),
        'members': [dict(m) for m in members]
    })


@app.route('/api/team', methods=['POST'])
@login_required
def add_team_member():
    if not _has_plan_or_403():
        return _has_plan_or_403()
    data  = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    name  = (data.get('name') or '').strip()
    if not email or '@' not in email:
        return jsonify({'error': 'بريد إلكتروني غير صالح'}), 400
    db    = get_db()
    user  = db.execute('SELECT plan, email FROM users WHERE id=?', (session['user_id'],)).fetchone()
    plan  = _user_plan(user)
    if plan == 'starter':
        return jsonify({'error': 'ميزة المشاركة مع الفريق متاحة في باقتي «المحترف» و«المؤسّسي» فقط'}), 403
    if email == (user['email'] or '').lower():
        return jsonify({'error': 'لا يمكن إضافة بريدك الخاص'}), 400
    limit = TEAM_LIMIT_BY_PLAN.get(plan, 0)
    count = db.execute('SELECT COUNT(*) AS c FROM team_members WHERE owner_id=?', (session['user_id'],)).fetchone()['c']
    if count >= limit:
        return jsonify({'error': f'وصلت إلى الحد الأقصى ({limit}) لباقة {plan}'}), 403
    try:
        db.execute(
            'INSERT INTO team_members (owner_id, email, name) VALUES (?, ?, ?)',
            (session['user_id'], email, name)
        )
        db.commit()
    except DB_IntegrityError:
        db.rollback()
        return jsonify({'error': 'هذا العضو مُضاف مسبقاً'}), 400
    return jsonify({'ok': True}), 201


@app.route('/api/team/<int:member_id>', methods=['DELETE'])
@login_required
def remove_team_member(member_id):
    db = get_db()
    res = db.execute(
        'DELETE FROM team_members WHERE id=? AND owner_id=?',
        (member_id, session['user_id'])
    )
    db.commit()
    if res.rowcount == 0:
        return jsonify({'error': 'العضو غير موجود'}), 404
    return jsonify({'ok': True})


def _has_plan_or_403():
    """Helper retained for future per-route gating (currently inlined)."""
    return True


# ----- Templates Library (Enterprise only) -----

TEMPLATES_LIBRARY = [
    {
        'id': 'lod',
        'name_ar': 'مصفوفة LOD',
        'name_en': 'LOD Matrix',
        'desc_ar': 'مستويات تطوير النموذج لكل تخصص ومرحلة (100/200/300/350/400/500).',
        'desc_en': 'Level of Development per discipline and stage.',
        'tags': ['ISO 19650-1', 'AIA', 'LOD'],
        'sections': [
            'Architecture (LOD 100→400)',
            'Structure (LOD 200→400)',
            'MEP (LOD 200→400)',
            'Civil / Site (LOD 200→350)',
            'As-built (LOD 500)'
        ]
    },
    {
        'id': 'eir',
        'name_ar': 'متطلبات تبادل المعلومات (EIR)',
        'name_en': 'Exchange Information Requirements',
        'desc_ar': 'وثيقة EIR كاملة وفق ISO 19650-2 — متطلبات صاحب العمل من المعلومات.',
        'desc_en': 'Full EIR template aligned with ISO 19650-2.',
        'tags': ['ISO 19650-2', 'Appointing Party'],
        'sections': [
            'Information Standard',
            'Information Production Methods',
            'Information Delivery',
            'Acceptance Criteria',
            'Reference Information & Shared Resources'
        ]
    },
    {
        'id': 'oir',
        'name_ar': 'متطلبات معلومات المؤسسة (OIR)',
        'name_en': 'Organizational Information Requirements',
        'desc_ar': 'متطلبات معلومات المؤسسة لإدارة أصولها بعد التسليم.',
        'desc_en': 'Organizational-level information requirements.',
        'tags': ['ISO 19650-3', 'Asset Management'],
        'sections': [
            'Strategic Goals',
            'Asset Information Triggers',
            'Stakeholders & Decisions',
            'Information Needs by Function'
        ]
    },
    {
        'id': 'pir',
        'name_ar': 'متطلبات معلومات المشروع (PIR)',
        'name_en': 'Project Information Requirements',
        'desc_ar': 'متطلبات معلومات المشروع المشتقة من OIR + متطلبات صاحب العمل.',
        'desc_en': 'Project-level information requirements derived from OIR.',
        'tags': ['ISO 19650-2', 'Project'],
        'sections': [
            'Key Project Decisions',
            'Plain-language Questions',
            'Project Milestones',
            'Information Triggers'
        ]
    },
    {
        'id': 'midp',
        'name_ar': 'خطة تسليم معلومات المشروع الرئيسية (MIDP)',
        'name_en': 'Master Information Delivery Plan',
        'desc_ar': 'تجميع لكل TIDPs مع تواريخ التسليم والمسؤولية والصيغ المطلوبة.',
        'desc_en': 'Aggregated TIDPs with delivery dates and responsibilities.',
        'tags': ['ISO 19650-2', 'Delivery'],
        'sections': [
            'Container Naming Convention',
            'TIDP Aggregation',
            'Milestone-by-Milestone Deliverables',
            'Responsibility Matrix',
            'Acceptance Workflow'
        ]
    }
]


@app.route('/api/templates', methods=['GET'])
@login_required
def list_templates():
    db   = get_db()
    user = db.execute('SELECT plan FROM users WHERE id=?', (session['user_id'],)).fetchone()
    if not _has_plan(user, 'enterprise'):
        return jsonify({
            'error':       'مكتبة القوالب الموسّعة متاحة في باقة «المؤسّسي» فقط',
            'required_plan': 'enterprise',
            'your_plan':   _user_plan(user)
        }), 403
    return jsonify({'templates': TEMPLATES_LIBRARY})


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
