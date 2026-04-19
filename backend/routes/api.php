<?php
// ============================================================
// Router: /backend/routes/api.php
// ============================================================
// Parse the request URI and dispatch to the correct controller.
// ============================================================

require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/ShipController.php';
require_once __DIR__ . '/../controllers/AlertController.php';
require_once __DIR__ . '/../controllers/HistoryController.php';
require_once __DIR__ . '/../controllers/PlanningController.php';
require_once __DIR__ . '/../controllers/SimulationController.php';

$method = $_SERVER['REQUEST_METHOD'];

// Strip the base path prefix to get the route segments
// e.g. /sscs-monitoring-website/backend/auth/login -> [auth, login]
$basePath = '/backend';
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalise: remove base path
$pos = strpos($uri, $basePath);
if ($pos !== false) {
    $uri = substr($uri, $pos + strlen($basePath));
}

$uri = rtrim($uri, '/');
if (empty($uri)) $uri = '/';

$segments = array_values(array_filter(explode('/', ltrim($uri, '/'))));
// segments[0] = resource, segments[1] = id/sub-resource ...

$resource = $segments[0] ?? '';
$param1   = $segments[1] ?? null;
$param2   = $segments[2] ?? null;

// ---- Route Dispatch ----

switch ($resource) {

    // ==============================
    // AUTH
    // ==============================
    case 'auth':
        $ctrl = new AuthController();
        switch ($param1) {
            case 'login':
                if ($method === 'POST') { $ctrl->login(); break; }
                break;
            case 'register':
                if ($method === 'POST') { $ctrl->register(); break; }
                break;
            case 'logout':
                if ($method === 'POST') { $ctrl->logout(); break; }
                break;
            case 'me':
                if ($method === 'GET') { $ctrl->me(); break; }
                break;
            default:
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Auth route not found.']);
        }
        break;

    // ==============================
    // SHIPS
    // ==============================
    case 'ships':
        $ctrl = new ShipController();
        if ($param1 === null) {
            // /api/ships
            if ($method === 'GET')  { $ctrl->index(); break; }
            if ($method === 'POST') { $ctrl->store(); break; }
        }
        if ($param1 && $param2 === 'stop') {
            // /api/ships/{imo}/stop
            if ($method === 'PUT' || $method === 'POST') { $ctrl->stop($param1); break; }
        }
        if ($param1) {
            // /api/ships/{imo}
            if ($method === 'GET') { $ctrl->show($param1); break; }
        }
        http_response_code(405); echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
        break;

    // ==============================
    // ALERTS
    // ==============================
    case 'alerts':
        $ctrl = new AlertController();
        if ($param1 === null) {
            if ($method === 'GET') { $ctrl->index(); break; }
        }
        if ($param1 && $param2 === 'resolve') {
            // /api/alerts/{id}/resolve
            if ($method === 'PUT' || $method === 'POST') { $ctrl->resolve($param1); break; }
        }
        if ($param1) {
            if ($method === 'GET') { $ctrl->show($param1); break; }
        }
        http_response_code(405); echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
        break;

    // ==============================
    // HISTORY
    // ==============================
    case 'history':
        $ctrl = new HistoryController();
        if ($method === 'GET') { $ctrl->index(); break; }
        http_response_code(405); echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
        break;

    // ==============================
    // PLANNING
    // ==============================
    case 'planning':
        $ctrl = new PlanningController();
        if ($param1 === null) {
            if ($method === 'GET')  { $ctrl->index(); break; }
            if ($method === 'POST') { $ctrl->store(); break; }
        }
        if ($param1 && $param2 === 'run') {
            // /api/planning/{id}/run
            if ($method === 'PUT' || $method === 'POST') { $ctrl->run((int)$param1); break; }
        }
        if ($param1 && $param2 === null) {
            // /api/planning/{id}
            if ($method === 'PUT')    { $ctrl->update((int)$param1);  break; }
            if ($method === 'DELETE') { $ctrl->destroy((int)$param1); break; }
        }
        http_response_code(405); echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
        break;

    // ==============================
    // SIMULATION
    // ==============================
    case 'simulation':
        $ctrl = new SimulationController();
        if ($param1 === 'tick' && $method === 'GET') { $ctrl->tick(); break; }
        if ($param1 === 'stop' && $param2 && ($method === 'PUT' || $method === 'POST')) {
            $ctrl->stop($param2); break;
        }
        http_response_code(404); echo json_encode(['success' => false, 'message' => 'Simulation route not found.']);
        break;

    // ==============================
    // DEFAULT
    // ==============================
    default:
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'API route not found: ' . $uri]);
        break;
}
