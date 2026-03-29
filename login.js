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
const regPassInput = document.getElementById("regPassword");
const registerBtn = document.getElementById("registerBtn");

function checkInputs() {
    if (userInput.value.trim() !== "" && passInput.value.trim() !== "") {
        loginBtn.removeAttribute("disabled");
    } else {
        loginBtn.setAttribute("disabled", "true");
    }

    if (regUserInput.value.trim() !== "" && regPassInput.value.trim() !== "") {
        registerBtn.removeAttribute("disabled");
    } else {
        registerBtn.setAttribute("disabled", "true");
    }
}

// Add event listeners for dynamic typing
userInput.addEventListener("input", checkInputs);
passInput.addEventListener("input", checkInputs);
regUserInput.addEventListener("input", checkInputs);
regPassInput.addEventListener("input", checkInputs);

// Tab switching
function switchTab(tab) {
    document.getElementById("loginError").style.display = "none";
    document.getElementById("registerSuccess").style.display = "none";
    
    if (tab === 'login') {
        document.getElementById("tabLogin").classList.add("active");
        document.getElementById("tabRegister").classList.remove("active");
        document.getElementById("loginForm").style.display = "block";
        document.getElementById("registerForm").style.display = "none";
        document.getElementById("formTitle").innerText = "Welcome Back";
        document.getElementById("formSubtitle").innerText = "Please sign in to your account";
    } else {
        document.getElementById("tabRegister").classList.add("active");
        document.getElementById("tabLogin").classList.remove("active");
        document.getElementById("registerForm").style.display = "block";
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("formTitle").innerText = "Create Account";
        document.getElementById("formSubtitle").innerText = "Register to access the system";
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
    const pass = regPassInput.value.trim();
    
    let users = JSON.parse(localStorage.getItem("registeredUsers")) || [];
    
    // Check if user already exists
    if (user === "admin" || users.some(u => u.username === user)) {
        alert("Username already exists!");
        return;
    }
    
    // Save new user
    users.push({ username: user, password: pass });
    localStorage.setItem("registeredUsers", JSON.stringify(users));
    
    // Show success message and switch to login
    document.getElementById("registerSuccess").style.display = "block";
    regUserInput.value = "";
    regPassInput.value = "";
    
    setTimeout(() => {
        switchTab('login');
    }, 1000);
});
