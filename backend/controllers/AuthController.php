<?php
// ============================================================
// Controller: Auth
// ============================================================
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class AuthController {
    private User $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    // POST /api/auth/login
    public function login(): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $username = trim($body['username'] ?? '');
        $password = $body['password'] ?? '';

        if (!$username || !$password) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Username dan password wajib diisi.']);
            return;
        }

        $user = $this->userModel->findByUsername($username);

        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Username atau password salah.']);
            return;
        }

        $_SESSION['user_id']   = $user['id'];
        $_SESSION['username']  = $user['username'];
        $_SESSION['role']      = $user['role'];

        echo json_encode([
            'success' => true,
            'message' => 'Login berhasil.',
            'user'    => [
                'id'       => $user['id'],
                'username' => $user['username'],
                'email'    => $user['email'],
                'role'     => $user['role'],
            ],
        ]);
    }

    // POST /api/auth/register
    public function register(): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $username = trim($body['username'] ?? '');
        $email    = trim($body['email']    ?? '');
        $password = $body['password'] ?? '';
        $confirm  = $body['confirm_password'] ?? '';

        if (!$username || !$email || !$password) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Semua field wajib diisi.']);
            return;
        }

        if ($password !== $confirm) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Password tidak cocok.']);
            return;
        }

        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Password minimal 6 karakter.']);
            return;
        }

        if ($this->userModel->usernameExists($username)) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Username sudah digunakan.']);
            return;
        }

        if ($this->userModel->emailExists($email)) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Email sudah terdaftar.']);
            return;
        }

        $this->userModel->create($username, $email, $password, 'operator');

        echo json_encode(['success' => true, 'message' => 'Registrasi berhasil. Silakan login.']);
    }

    // POST /api/auth/logout
    public function logout(): void {
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Logout berhasil.']);
    }

    // GET /api/auth/me
    public function me(): void {
        $userId = AuthMiddleware::optional();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['success' => false, 'authenticated' => false]);
            return;
        }

        $user = $this->userModel->findById($userId);
        if (!$user) {
            session_destroy();
            http_response_code(401);
            echo json_encode(['success' => false, 'authenticated' => false]);
            return;
        }

        echo json_encode([
            'success'       => true,
            'authenticated' => true,
            'user'          => $user,
        ]);
    }
}
