// Show / Hide Password
function togglePassword() {
    const password = document.getElementById("password");
    password.type = password.type === "password" ? "text" : "password";
}

// Enable or Disable Login Button based on input
const userInput = document.getElementById("username");
const passInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

function checkInputs() {
    if (userInput.value.trim() !== "" && passInput.value.trim() !== "") {
        loginBtn.removeAttribute("disabled");
    } else {
        loginBtn.setAttribute("disabled", "true");
    }
}

// Add event listeners for dynamic typing
userInput.addEventListener("input", checkInputs);
passInput.addEventListener("input", checkInputs);
userInput.addEventListener("keyup", checkInputs);
passInput.addEventListener("keyup", checkInputs);

// Login Validation
document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const user = userInput.value;
    const pass = passInput.value;
    const errorBox = document.getElementById("loginError");

    // Akun admin standard
    if (user === "admin" && pass === "admin123") {
        // Simpan status login
        localStorage.setItem("isLogin", "true");
        window.location.href = "index.html";
    } else {
        errorBox.style.display = "block";
    }
});
