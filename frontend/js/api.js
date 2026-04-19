// ============================================================
// API Helper — frontend/js/api.js
// Base URL points to the PHP backend folder
// ============================================================

const API_BASE = '../backend';

/**
 * Generic API request helper.
 * @param {string} method  - HTTP method: GET, POST, PUT
 * @param {string} endpoint - e.g. '/auth/login'
 * @param {object|null} data - body payload (will be JSON-encoded)
 * @returns {Promise<object>}
 */
async function apiRequest(method, endpoint, data = null) {
    const options = {
        method,
        credentials: 'include', // send cookies/session
        headers: { 'Content-Type': 'application/json' },
    };
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    const res = await fetch(API_BASE + endpoint, options);
    const json = await res.json();
    if (!res.ok && res.status !== 401) {
        console.warn(`[API ${method} ${endpoint}]`, json.message || res.status);
    }
    return json;
}

// Shorthand helpers
const api = {
    get:    (endpoint)       => apiRequest('GET',    endpoint),
    post:   (endpoint, data) => apiRequest('POST',   endpoint, data),
    put:    (endpoint, data) => apiRequest('PUT',    endpoint, data),
    delete: (endpoint)       => apiRequest('DELETE', endpoint),
};
