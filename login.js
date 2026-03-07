// Show / Hide Password
function togglePassword() {
    const password = document.getElementById("password");
    password.type = password.type === "password" ? "text" : "password";
}

// Login Validation
document.getElementById("loginForm").addEventListener("submit", function(e){
    e.preventDefault();

    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const errorText = document.getElementById("loginError");

    // Akun dummy standard
    if((user === "admin" && pass === "1234") || (user === "admin" && pass === "admin123")){
        // Simpan status login
        localStorage.setItem("isLogin", "true");
        window.location.href = "index.html";
    } else {
        errorText.style.display = "block";
        errorText.textContent = "Username atau password salah!";
    }
});
