<?php
// ============================================================
// Middleware: Auth Check
// ============================================================

class AuthMiddleware {
    /**
     * Require a valid session. Returns the user_id if authenticated,
     * otherwise sends 401 and exits.
     */
    public static function require(): int {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthenticated. Please login.']);
            exit;
        }
        return (int) $_SESSION['user_id'];
    }

    /**
     * Optional auth — returns user_id or null without aborting.
     */
    public static function optional(): ?int {
        return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
    }
}
