// Show / Hide Password
function togglePassword(inputId) {
    const password = document.getElementById(inputId);
    password.type = password.type === "password" ? "text" : "password";
}

// Enable or Disable Login/Register Button based on input
const userInput = document.getElementById("username");
const passInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

const regUserInput = document.getElementById("regUsername");
const regEmailInput = document.getElementById("regEmail");
const regPassInput = document.getElementById("regPassword");
const regConfirmPassInput = document.getElementById("regConfirmPassword");
const registerBtn = document.getElementById("registerBtn");

const forgotEmailInput = document.getElementById("forgotEmail");
const forgotBtn = document.getElementById("forgotBtn");

function checkInputs() {
    if (userInput.value.trim() !== "" && passInput.value.trim() !== "") {
        loginBtn.removeAttribute("disabled");
    } else {
        loginBtn.setAttribute("disabled", "true");
    }

    if (regUserInput.value.trim() !== "" && regEmailInput.value.trim() !== "" && regPassInput.value.trim() !== "" && regConfirmPassInput.value.trim() !== "") {
        registerBtn.removeAttribute("disabled");
    } else {
        registerBtn.setAttribute("disabled", "true");
    }
    
    if (forgotEmailInput && forgotBtn) {
        if (forgotEmailInput.value.trim() !== "") {
            forgotBtn.removeAttribute("disabled");
        } else {
            forgotBtn.setAttribute("disabled", "true");
        }
    }
}

// Add event listeners for dynamic typing
userInput.addEventListener("input", checkInputs);
passInput.addEventListener("input", checkInputs);
regUserInput.addEventListener("input", checkInputs);
regEmailInput.addEventListener("input", checkInputs);
regPassInput.addEventListener("input", checkInputs);
regConfirmPassInput.addEventListener("input", checkInputs);
if (forgotEmailInput) {
    forgotEmailInput.addEventListener("input", checkInputs);
}

// Tab switching
function switchTab(tab) {
    document.getElementById("loginError").style.display = "none";
    document.getElementById("registerSuccess").style.display = "none";
    
    const sscsDesc = document.getElementById("sscsDescription");
    const mainTabs = document.getElementById("mainTabs");
    
    if (tab === 'login') {
        document.getElementById("tabLogin").classList.add("active");
        document.getElementById("tabRegister").classList.remove("active");
        document.getElementById("loginForm").style.display = "block";
        document.getElementById("registerForm").style.display = "none";
        document.getElementById("forgotForm").style.display = "none";
        document.getElementById("formTitle").innerText = "Welcome Back";
        document.getElementById("formSubtitle").innerText = "Please sign in to your account";
        if(sscsDesc) sscsDesc.style.display = "block";
        if(mainTabs) mainTabs.style.display = "flex";
    } else if (tab === 'register') {
        document.getElementById("tabRegister").classList.add("active");
        document.getElementById("tabLogin").classList.remove("active");
        document.getElementById("registerForm").style.display = "block";
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("forgotForm").style.display = "none";
        document.getElementById("formTitle").innerText = "Create Account";
        document.getElementById("formSubtitle").innerText = "Register to access the system";
        if(sscsDesc) sscsDesc.style.display = "none";
        if(mainTabs) mainTabs.style.display = "flex";
    } else if (tab === 'forgot') {
        document.getElementById("forgotForm").style.display = "block";
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("registerForm").style.display = "none";
        document.getElementById("formTitle").innerText = "Forgot Password?";
        document.getElementById("formSubtitle").innerText = "Enter email to reset password";
        if(sscsDesc) sscsDesc.style.display = "none";
        if(mainTabs) mainTabs.style.display = "none";
    }
}

// Login Validation
document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const user = userInput.value;
    const pass = passInput.value;
    const errorBox = document.getElementById("loginError");
    
    // Get registered users from localStorage
    let users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
    
    // Check if it's admin or a registered user
    const isRegistered = users.some(u => u.username === user && u.password === pass);

    if ((user === "admin" && pass === "admin123") || isRegistered) {
        // Simpan status login
        localStorage.setItem("isLogin", "true");
        window.location.href = "index.html";
    } else {
        errorBox.style.display = "block";
    }
});

// Registration Logic
document.getElementById("registerForm").addEventListener("submit", function (e) {
    e.preventDefault();
    
    const user = regUserInput.value.trim();
    const email = regEmailInput.value.trim();
    const pass = regPassInput.value.trim();
    const confirmPass = regConfirmPassInput.value.trim();
    
    if (pass !== confirmPass) {
        alert("Passwords do not match!");
        return;
    }
    
    let users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
    
    // Check if user already exists
    if (user === "admin" || users.some(u => u.username === user || u.email === email)) {
        alert("Username or Email already exists!");
        return;
    }
    
    // Save new user
    users.push({ username: user, email: email, password: pass });
    localStorage.setItem("registeredUsers", JSON.stringify(users));
    
    // Show success message and switch to login
    document.getElementById("registerSuccess").style.display = "block";
    regUserInput.value = "";
    regEmailInput.value = "";
    regPassInput.value = "";
    regConfirmPassInput.value = "";
    
    setTimeout(() => {
        switchTab('login');
    }, 1500);
});

// Forgot Password Logic
if (document.getElementById("forgotForm")) {
    document.getElementById("forgotForm").addEventListener("submit", function (e) {
        e.preventDefault();
        const email = forgotEmailInput.value.trim();
        let users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
        
        const userExists = users.some(u => u.email === email);
        
        if(userExists) {
            alert("A password reset link has been sent to " + email);
            forgotEmailInput.value = "";
            switchTab('login');
        } else {
            alert("Email not found in our records!");
        }
    });
}
