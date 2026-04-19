// ============================================================
// SSCS — frontend/login.js (refactored: uses backend API)
// ============================================================

// Show/Hide password toggle
function togglePassword(inputId) {
    const el = document.getElementById(inputId);
    el.type = el.type === 'password' ? 'text' : 'password';
}

// Tab switching
function switchTab(tab) {
    document.getElementById('loginError').style.display     = 'none';
    document.getElementById('registerSuccess').style.display = 'none';

    const sscsDesc = document.getElementById('sscsDescription');
    const mainTabs = document.getElementById('mainTabs');

    const show = id => document.getElementById(id).style.display = 'block';
    const hide = id => document.getElementById(id).style.display = 'none';

    hide('loginForm'); hide('registerForm'); hide('forgotForm');
    document.getElementById('tabLogin')?.classList.remove('active');
    document.getElementById('tabRegister')?.classList.remove('active');

    if (tab === 'login') {
        document.getElementById('tabLogin').classList.add('active');
        show('loginForm');
        document.getElementById('formTitle').innerText    = 'Welcome Back';
        document.getElementById('formSubtitle').innerText = 'Please sign in to your account';
        if (sscsDesc) sscsDesc.style.display = 'block';
        if (mainTabs) mainTabs.style.display  = 'flex';
    } else if (tab === 'register') {
        document.getElementById('tabRegister').classList.add('active');
        show('registerForm');
        document.getElementById('formTitle').innerText    = 'Create Account';
        document.getElementById('formSubtitle').innerText = 'Register to access the system';
        if (sscsDesc) sscsDesc.style.display = 'none';
        if (mainTabs) mainTabs.style.display  = 'flex';
    } else if (tab === 'forgot') {
        show('forgotForm');
        document.getElementById('formTitle').innerText    = 'Forgot Password?';
        document.getElementById('formSubtitle').innerText = 'Enter email to reset password';
        if (sscsDesc) sscsDesc.style.display = 'none';
        if (mainTabs) mainTabs.style.display  = 'none';
    }
}

// Enable/disable submit buttons
function checkInputs() {
    const u = document.getElementById('username')?.value.trim();
    const p = document.getElementById('password')?.value.trim();
    const btn = document.getElementById('loginBtn');
    if (btn) btn.disabled = !(u && p);

    const ru = document.getElementById('regUsername')?.value.trim();
    const re = document.getElementById('regEmail')?.value.trim();
    const rp = document.getElementById('regPassword')?.value.trim();
    const rc = document.getElementById('regConfirmPassword')?.value.trim();
    const rbtn = document.getElementById('registerBtn');
    if (rbtn) rbtn.disabled = !(ru && re && rp && rc);

    const fe = document.getElementById('forgotEmail')?.value.trim();
    const fbtn = document.getElementById('forgotBtn');
    if (fbtn) fbtn.disabled = !fe;
}

document.querySelectorAll('input').forEach(el => el.addEventListener('input', checkInputs));
checkInputs();

// ---- LOGIN ----
document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorBox = document.getElementById('loginError');
    const btn      = document.getElementById('loginBtn');

    btn.disabled    = true;
    btn.textContent = 'Signing in...';

    const res = await fetch('../backend/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    }).then(r => r.json()).catch(() => ({ success: false, message: 'Server tidak bisa dihubungi.' }));

    if (res.success) {
        window.location.href = 'index.html';
    } else {
        errorBox.textContent    = res.message || 'Login gagal. Periksa username & password.';
        errorBox.style.display  = 'block';
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
});

// ---- REGISTER ----
document.getElementById('registerForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username         = document.getElementById('regUsername').value.trim();
    const email            = document.getElementById('regEmail').value.trim();
    const password         = document.getElementById('regPassword').value;
    const confirm_password = document.getElementById('regConfirmPassword').value;
    const successBox       = document.getElementById('registerSuccess');
    const errorBox         = document.getElementById('loginError');
    const btn              = document.getElementById('registerBtn');

    btn.disabled    = true;
    btn.textContent = 'Registering...';

    const res = await fetch('../backend/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, confirm_password }),
    }).then(r => r.json()).catch(() => ({ success: false, message: 'Server tidak bisa dihubungi.' }));

    if (res.success) {
        successBox.textContent   = res.message;
        successBox.style.display = 'block';
        errorBox.style.display   = 'none';
        document.getElementById('regUsername').value         = '';
        document.getElementById('regEmail').value            = '';
        document.getElementById('regPassword').value         = '';
        document.getElementById('regConfirmPassword').value  = '';
        setTimeout(() => switchTab('login'), 1500);
    } else {
        errorBox.textContent   = res.message || 'Registrasi gagal.';
        errorBox.style.display = 'block';
    }
    btn.disabled    = false;
    btn.textContent = 'Register';
});

// ---- FORGOT PASSWORD ----
document.getElementById('forgotForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    // Placeholder - would implement email reset flow
    alert('Link reset password telah dikirim ke email Anda (demo).');
    document.getElementById('forgotEmail').value = '';
    switchTab('login');
});
