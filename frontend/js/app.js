// ============================================================
// SSCS — frontend/js/app.js
// Main application logic — all data from PHP backend API
// ============================================================

// ---- Charts ----
let dashboardChart;
let monitoringChart;

// ---- State (memory only, truth lives in DB) ----
let ships          = [];          // full ship list from API
let alertData      = [];          // all alerts from API
let selectedShipImo = null;
let chartLabels    = [];
let chartData      = [];

// ---- Pages ----
const componentsToLoad = ['navbar', 'dashboard', 'monitoring', 'history', 'alert', 'laporan', 'planning'];

// ==============================================================
// AUTH — check session on every page load
// ==============================================================
async function checkAuth() {
    const res = await api.get('/auth/me');
    if (!res.authenticated) {
        window.location.href = 'login.html';
    }
    return res.user;
}

// ==============================================================
// NAVIGATION
// ==============================================================
function showPage(pageId, pushState = true) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
    const lnk = document.getElementById('nav-' + pageId);
    if (lnk) lnk.classList.add('active');

    if (pushState) window.history.pushState(null, '', '#' + pageId);
}

window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1).split('?')[0];
    if (componentsToLoad.includes(hash)) showPage(hash, false);
});

// ==============================================================
// COMPONENT LOADING
// ==============================================================
async function loadComponents() {
    for (const comp of componentsToLoad) {
        const placeholder = document.getElementById(`${comp}-placeholder`);
        if (placeholder) {
            try {
                const res = await fetch(`components/${comp}.html?v=` + Date.now());
                placeholder.outerHTML = await res.text();
            } catch (e) {
                console.error(`Error loading ${comp}:`, e);
            }
        }
    }
}

// ==============================================================
// SHIP LIST — rendered from in-memory `ships` array
// ==============================================================
function renderShipList() {
    const container = document.getElementById('shipCardsContainer');
    if (!container) return;
    container.innerHTML = '';

    ships.forEach(ship => {
        if (parseInt(ship.is_stopped)) return;

        const isActive = ship.imo === selectedShipImo;
        const card     = document.createElement('div');
        const isConn   = parseInt(ship.is_connected);
        const hasEnergy = parseFloat(ship.total_energy) > 0;

        let dotColor = '#cbd5e1';
        if (isConn)                    dotColor = '#22c55e';
        else if (!isConn && hasEnergy) dotColor = '#dc2626';

        const statusDot = `<span style="width:8px;height:8px;background:${dotColor};border-radius:50%;display:inline-block;margin-right:5px;"></span>`;
        const borderStyle = isActive ? 'border:2px solid #256b9c;box-shadow:0 0 8px rgba(37,107,156,0.2);' : 'border:1px solid #e2e8f0;';

        card.style.cssText = `padding:15px;background:white;border-radius:8px;cursor:pointer;transition:0.2s;display:flex;justify-content:space-between;align-items:center;${borderStyle}`;
        if (!isActive) {
            card.onmouseover  = () => card.style.borderColor = '#256b9c';
            card.onmouseleave = () => card.style.borderColor = '#e2e8f0';
        }
        card.onclick = () => selectShip(ship.imo);
        card.innerHTML = `
            <div>
                <h4 style="margin-bottom:4px;color:${isActive ? '#256b9c' : '#0f172a'};font-size:15px;">${statusDot}${ship.name}</h4>
                <p style="color:#64748b;font-size:12px;margin-left:13px;">IMO: ${ship.imo}</p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color:${isActive ? '#256b9c' : '#cbd5e1'};font-size:14px;"></i>
        `;
        container.appendChild(card);
    });
}

function selectShip(imo) {
    const ship = ships.find(s => s.imo === imo);
    if (!ship) return;

    selectedShipImo = imo;

    const el = id => document.getElementById(id);
    if (el('shipName'))  el('shipName').innerText  = ship.name;
    if (el('shipType'))  el('shipType').innerText  = ship.type;
    if (el('shipIMO'))   el('shipIMO').innerText   = ship.imo;

    const isConn = parseInt(ship.is_connected);
    const energy = parseFloat(ship.total_energy);
    const power  = parseFloat(ship.realtime_power);

    if (el('realtimePower')) el('realtimePower').innerText = power.toLocaleString() + ' kW';
    if (el('totalEnergy'))   el('totalEnergy').innerText   = energy.toLocaleString() + ' kWh';
    if (el('co2Saved'))      el('co2Saved').innerText      = (energy * 0.0027).toFixed(2) + ' kg';

    const alertSpan = el('alertCount');
    if (alertSpan) {
        alertSpan.innerText = alertData.filter(a => a.imo === imo && a.status === 'Active').length;
    }

    const indic = el('pscStatusIndicator');
    const pscSt = el('pscStatus');
    const discBtn = el('disconnectPscBtn');
    if (indic) {
        if (isConn) {
            indic.className = 'success'; indic.innerText = 'Aman';
            indic.style.background = '#def7ec'; indic.style.color = '#03543f';
            if (discBtn) discBtn.style.display = 'flex';
        } else {
            indic.className = 'danger'; indic.innerText = 'Bahaya';
            indic.style.background = '#fde8e8'; indic.style.color = '#9b1c1c';
            if (discBtn) discBtn.style.display = 'none';
        }
        if (pscSt) pscSt.innerText = isConn ? 'Connected' : 'Disconnected';
    }

    renderShipList();
}

// ==============================================================
// SIMULATION POLLING (calls backend /api/simulation/tick)
// ==============================================================
let simulationInterval = null;

function startSimulationPolling() {
    if (simulationInterval) return; // already running
    simulationInterval = setInterval(async () => {
        try {
            const res = await api.get('/simulation/tick');
            if (!res.success) return;

            ships = res.ships;
            const stats = res.globalStats;

            // Update global dashboard stats
            setInner('globalTotalKapal',    stats.monitoredCount);
            setInner('globalKapalTerhubung', stats.activeConnections);
            setInner('globalRealtimeEnergy', stats.globalRealtimeSum.toLocaleString() + ' kW');
            setInner('globalTotalEnergy',    stats.globalTotalEnergy.toLocaleString() + ' kWh');
            setInner('globalCO2Saved',       stats.globalCO2 + ' kg');

            // kapalTerhubung (legacy id)
            setInner('kapalTerhubung', stats.activeConnections + ' Kapal');

            // Update global chart
            if (dashboardChart) {
                dashboardChart.data.labels.push('');
                dashboardChart.data.datasets[0].data.push(stats.globalTotalEnergy);
                if (dashboardChart.data.labels.length > 20) {
                    dashboardChart.data.labels.shift();
                    dashboardChart.data.datasets[0].data.shift();
                }
                dashboardChart.update();
            }

            // New alerts
            if (res.newAlerts && res.newAlerts.length > 0) {
                res.newAlerts.forEach(alert => {
                    const normalized = normalizeAlert(alert);
                    const exists = alertData.find(a => a.id === alert.id);
                    if (!exists) alertData.push(normalized);
                    showAlert(normalized);
                });
                renderAlert();
            }

            // Update monitoring panel for selected ship
            if (selectedShipImo) {
                const current = ships.find(s => s.imo === selectedShipImo);
                if (current) {
                    updateMonitoringPanel(current);
                }
            }

            renderShipList();

        } catch (e) {
            console.error('Simulation tick error:', e);
        }
    }, 3000);
}

function updateMonitoringPanel(ship) {
    const isConn = parseInt(ship.is_connected);
    const energy = parseFloat(ship.total_energy);
    const power  = parseFloat(ship.realtime_power);

    setInner('realtimePower', power.toLocaleString()  + ' kW');
    setInner('totalEnergy',   energy.toLocaleString() + ' kWh');
    setInner('co2Saved',      (energy * 0.0027).toFixed(2) + ' kg');

    const alertSpan = document.getElementById('alertCount');
    if (alertSpan) {
        alertSpan.innerText = alertData.filter(a => a.imo === ship.imo && a.status === 'Active').length;
    }

    const indic   = document.getElementById('pscStatusIndicator');
    const pscSt   = document.getElementById('pscStatus');
    const discBtn = document.getElementById('disconnectPscBtn');

    if (indic) {
        if (isConn) {
            indic.className = 'success'; indic.innerText = 'Aman';
            indic.style.background = '#def7ec'; indic.style.color = '#03543f';
            if (discBtn) discBtn.style.display = 'flex';
            if (pscSt)   pscSt.innerText = 'Connected';
        } else {
            indic.className = 'danger'; indic.innerText = 'Bahaya';
            indic.style.background = '#fde8e8'; indic.style.color = '#9b1c1c';
            if (discBtn) discBtn.style.display = 'none';
            if (pscSt)   pscSt.innerText = 'Disconnected';
        }
    }

    if (monitoringChart && !parseInt(ship.is_stopped)) {
        monitoringChart.data.labels.push('');
        monitoringChart.data.datasets[0].data.push(power);
        if (monitoringChart.data.labels.length > 20) {
            monitoringChart.data.labels.shift();
            monitoringChart.data.datasets[0].data.shift();
        }
        monitoringChart.update();
    }
}

// ==============================================================
// ALERTS
// ==============================================================
function normalizeAlert(a) {
    return {
        id:          a.id,
        ship:        a.ship || a.ship_name,
        imo:         a.imo,
        jenis:       a.jenis,
        level:       a.level,
        status:      a.status,
        startTimeMs: parseInt(a.start_time_ms),
        waktu:       a.waktu,
        resolvedAt:  a.resolved_at,
        deskripsi:   a.deskripsi,
    };
}

async function loadAlerts() {
    const res = await api.get('/alerts');
    if (!res.success) return;
    alertData = [
        ...res.active.map(normalizeAlert),
        ...res.resolved.map(normalizeAlert),
    ];
    updateAlertCounts(res.counts);
    renderAlert();
}

function updateAlertCounts(counts) {
    if (!counts) return;
    setInner('totalAlert',    counts.total       || 0);
    setInner('activeAlert',   counts.active_count  || 0);
    setInner('criticalAlert', counts.critical_count || 0);
}

function renderAlert() {
    const tbody        = document.getElementById('alertList');
    const historyTbody = document.getElementById('alertHistoryList');
    if (tbody)        tbody.innerHTML = '';
    if (historyTbody) historyTbody.innerHTML = '';

    let criticalCount = 0, activeCount = 0;
    alertData.forEach(item => {
        if (item.status === 'Active') { activeCount++; if (item.level === 'Critical') criticalCount++; }
    });

    setInner('totalAlert',    alertData.length);
    setInner('activeAlert',   activeCount);
    setInner('criticalAlert', criticalCount);

    const activeAlerts   = alertData.filter(a => a.status === 'Active').reverse();
    const resolvedAlerts = alertData.filter(a => a.status === 'Resolved').slice(-20).reverse();

    const levelStyle = level => {
        if (level === 'Critical') return 'font-weight:600;color:#7f1d1d;';
        if (level === 'High')     return 'font-weight:600;color:#dc2626;';
        if (level === 'Medium')   return 'font-weight:600;color:#ea580c;';
        return 'font-weight:600;color:#ca8a04;';
    };
    const levelIcon = level => ({ Critical: '🚨', High: '🔴', Medium: '🟠', Low: '🟡' })[level] || '';

    if (tbody) {
        activeAlerts.forEach(item => {
            const durationMs  = Date.now() - (item.startTimeMs || Date.now());
            const durHours    = Math.floor(durationMs / 3600000);
            const durMins     = Math.floor((durationMs % 3600000) / 60000);
            const durText     = durHours > 0 ? `${durHours} Jam ${durMins} Menit` : `${durMins} Menit`;
            const row         = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td><span style="font-weight:600;color:#1e293b;">${item.ship}</span></td>
                <td>${item.imo}</td>
                <td>${item.jenis}</td>
                <td style="${levelStyle(item.level)}">${levelIcon(item.level)} ${item.level}</td>
                <td>${item.waktu || '-'}</td>
                <td>${durText}</td>
                <td>
                    <button onclick="openAlertDetail('${item.id}')" style="background:#f1f5f9;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;color:#475569;font-size:12px;font-weight:600;">
                        <i class="fa-solid fa-eye" style="margin-right:4px;"></i>Detail
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    if (historyTbody) {
        resolvedAlerts.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td><span style="font-weight:600;color:#1e293b;">${item.ship}</span></td>
                <td style="${levelStyle(item.level)}">${levelIcon(item.level)} ${item.level}</td>
                <td>${item.resolvedAt || '-'}</td>
            `;
            historyTbody.appendChild(row);
        });
    }
}

async function resolveAlert(id) {
    const res = await api.put(`/alerts/${id}/resolve`);
    if (res.success) {
        const alertObj = alertData.find(a => a.id === id);
        if (alertObj) { alertObj.status = 'Resolved'; alertObj.resolvedAt = new Date().toLocaleString(); }
        renderAlert();
        showToast('Alert ' + id + ' berhasil di-resolve.', 'success');
    } else {
        showToast(res.message || 'Gagal resolve alert.', 'error');
    }
}

// ==============================================================
// STOP PSC
// ==============================================================
async function stopPsc(imo, alertId) {
    const res = await api.post(`/simulation/stop/${imo}`);
    if (res.success) {
        // Update local state
        const ship = ships.find(s => s.imo === imo);
        if (ship) { ship.is_stopped = 1; ship.is_connected = 0; ship.realtime_power = 0; }
        if (alertId) {
            const alertObj = alertData.find(a => a.id === alertId);
            if (alertObj) { alertObj.status = 'Resolved'; alertObj.resolvedAt = new Date().toLocaleString(); }
        }
        renderAlert();
        renderShipList();
        showToast('Koneksi PSC Kapal Berhasil Dihentikan.', 'success');
    } else {
        showToast(res.message || 'Gagal hentikan PSC.', 'error');
    }
}

async function disconnectCurrentShip() {
    if (!selectedShipImo || selectedShipImo === '-') return;
    await stopPsc(selectedShipImo, null);
    const available = ships.filter(s => !parseInt(s.is_stopped));
    if (available.length > 0) {
        selectShip(available[0].imo);
    } else {
        selectedShipImo = null;
        renderShipList();
    }
}

// ==============================================================
// ALERT DETAIL MODAL
// ==============================================================
function openAlertDetail(id) {
    const alertObj = alertData.find(a => a.id === id);
    if (!alertObj) return;

    let bgHeader = '', colorText = '', badgeBg = '', badgeText = '', warningIcon = '';
    if (alertObj.level === 'Critical') {
        bgHeader = 'linear-gradient(135deg,#df2029,#b9151b)'; badgeBg = '#fef08a'; badgeText = '#df2029'; colorText = '#df2029'; warningIcon = 'fa-triangle-exclamation';
    } else if (alertObj.level === 'High') {
        bgHeader = 'linear-gradient(135deg,#ef4444,#dc2626)'; badgeBg = '#fef08a'; badgeText = '#dc2626'; colorText = '#dc2626'; warningIcon = 'fa-triangle-exclamation';
    } else if (alertObj.level === 'Medium') {
        bgHeader = 'linear-gradient(135deg,#f97316,#ea580c)'; badgeBg = '#ffedd5'; badgeText = '#ea580c'; colorText = '#ea580c'; warningIcon = 'fa-circle-exclamation';
    } else {
        bgHeader = 'linear-gradient(135deg,#eab308,#ca8a04)'; badgeBg = '#fef9c3'; badgeText = '#ca8a04'; colorText = '#ca8a04'; warningIcon = 'fa-bell';
    }

    const durationMs = Date.now() - (alertObj.startTimeMs || Date.now());
    const durMins    = Math.max(1, Math.floor(durationMs / 60000));
    const durText    = alertObj.status === 'Active' ? durMins + ' Menit' : 'Resolved';
    const isResolved = alertObj.status === 'Resolved';

    const ship       = ships.find(s => s.imo === alertObj.imo) || {};
    const energiTerpakai = parseFloat(ship.total_energy || 0).toLocaleString();
    const dayaSaatIni    = parseFloat(ship.realtime_power || 0);
    const co2Reduksi     = (parseFloat(ship.total_energy || 0) * 0.05).toFixed(2);
    const dayaRata       = Math.max(200, dayaSaatIni - 25);
    const sttPscText  = alertObj.status === 'Active' ? 'Aktif' : 'Nonaktif';
    const sttPscColor = alertObj.status === 'Active' ? '#16a34a' : '#64748b';

    document.getElementById('alertDetailContent').innerHTML = `
        <div style="background:${bgHeader};padding:20px 25px;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h2 style="font-size:18px;font-weight:600;margin:0;">Detail Alert <span style="font-size:13px;font-weight:normal;margin-left:10px;opacity:0.9;">${alertObj.id}</span></h2>
                <button onclick="closeAlertDetail()" style="background:transparent;border:none;color:white;font-size:20px;cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:18px;font-weight:bold;display:flex;align-items:center;text-transform:uppercase;">
                    <i class="fa-solid ${warningIcon}" style="margin-right:10px;font-size:22px;"></i> ${alertObj.jenis}
                </div>
                <div style="background:${badgeBg};color:${badgeText};padding:6px 14px;border-radius:6px;font-weight:800;font-size:13px;text-transform:uppercase;">
                    <i class="fa-solid fa-triangle-exclamation" style="margin-right:6px;"></i>${alertObj.level}
                </div>
            </div>
        </div>
        <div style="padding:25px;background:#ffffff;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;border-bottom:1px solid #f1f5f9;padding-bottom:20px;margin-bottom:20px;">
                <div style="color:#475569;font-size:14px;grid-column:span 2;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;">
                        <div style="width:32px;height:32px;background:#f1f5f9;color:#64748b;display:flex;align-items:center;justify-content:center;border-radius:8px;margin-right:12px;"><i class="fa-solid fa-ship"></i></div>
                        <div>Nama Kapal <span style="font-weight:600;color:#1e293b;margin-left:8px;font-size:15px;">${alertObj.ship}</span></div>
                    </div>
                    <div style="font-weight:500;color:#475569;">${alertObj.imo}</div>
                </div>
                <div style="color:#475569;font-size:14px;grid-column:span 2;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;flex:1;">
                        <div style="width:32px;height:32px;background:#fff7ed;color:#f97316;display:flex;align-items:center;justify-content:center;border-radius:8px;margin-right:12px;"><i class="fa-regular fa-calendar-days"></i></div>
                        <div style="display:flex;flex-direction:column;">
                            <span style="font-size:12px;color:#64748b;">Waktu Terjadi</span>
                            <span style="font-weight:600;color:#1e293b;font-size:14px;">${alertObj.waktu}</span>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;flex:1;justify-content:flex-end;">
                        <i class="fa-regular fa-clock" style="margin-right:8px;"></i> Durasi <span style="font-weight:600;color:#1e293b;margin-left:8px;font-size:15px;">${durText}</span>
                    </div>
                </div>
            </div>
            <h4 style="font-size:16px;color:#1e293b;margin-bottom:12px;font-weight:700;">Detail Gangguan</h4>
            <div style="border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:25px;">
                <div style="color:${colorText};font-weight:bold;font-size:14px;margin-bottom:15px;display:flex;align-items:center;text-transform:uppercase;">
                    <i class="fa-solid ${warningIcon}" style="margin-right:8px;"></i>${alertObj.jenis.toUpperCase()} - HIGH POWER USAGE
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;font-size:14px;">
                    <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:15px;">
                        <span style="color:#64748b;">Energi Terpakai</span><span style="color:#1e293b;font-weight:600;">${energiTerpakai} kWh</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:15px;">
                        <span style="color:#64748b;">Reduksi CO2</span><span style="color:#1e293b;font-weight:600;">${co2Reduksi} kg</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                        <span style="color:#64748b;">Daya Saat Ini</span><span style="color:#1e293b;font-weight:600;">${dayaSaatIni} kW</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                        <span style="color:#64748b;">Status PSC</span><span style="color:${sttPscColor};font-weight:600;">${sttPscText}</span>
                    </div>
                </div>
            </div>
            <div style="display:flex;gap:15px;justify-content:space-between;">
                <button onclick="window.open('https://wa.me/6281334352191','_blank')" style="flex:1;padding:14px;background:white;border:1px solid #cbd5e1;border-radius:8px;font-weight:600;color:#475569;cursor:pointer;">
                    <i class="fa-solid fa-phone-volume" style="margin-right:8px;color:#64748b;font-size:16px;"></i>Hubungi Teknisi
                </button>
                ${!isResolved ? `
                <button onclick="animateResolve('${alertObj.id}')" style="flex:1;padding:14px;background:#16a34a;border:none;border-radius:8px;font-weight:600;color:white;cursor:pointer;">
                    <i class="fa-solid fa-circle-check" style="margin-right:8px;font-size:16px;"></i>Resolve
                </button>
                ` : `
                <button disabled style="flex:1;padding:14px;background:#cbd5e1;border:none;border-radius:8px;font-weight:600;color:white;cursor:not-allowed;">
                    <i class="fa-solid fa-check-double" style="margin-right:8px;font-size:16px;"></i>Resolved
                </button>
                `}
                <button onclick="animateStopPsc('${alertObj.imo}','${alertObj.id}')" style="flex:1;padding:14px;background:#dc2626;border:none;border-radius:8px;font-weight:600;color:white;cursor:pointer;">
                    <i class="fa-solid fa-power-off" style="margin-right:8px;font-size:16px;"></i>Stop PSC
                </button>
            </div>
        </div>
    `;
    document.getElementById('alertDetailModal').style.display = 'flex';
}

function closeAlertDetail() {
    document.getElementById('alertDetailModal').style.display = 'none';
}

function animateResolve(alertId) {
    showActionAnimation('resolve', () => { resolveAlert(alertId); closeAlertDetail(); });
}

function animateStopPsc(imo, alertId) {
    showActionAnimation('stop-psc', () => { stopPsc(imo, alertId); closeAlertDetail(); });
}

function showActionAnimation(type, callback) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;display:flex;justify-content:center;align-items:center;background:rgba(255,255,255,0.8);backdrop-filter:blur(4px);transition:opacity 0.3s;';
    const iconHTML = type === 'resolve'
        ? `<div style="font-size:80px;color:#16a34a;"><i class="fa-solid fa-circle-check"></i></div><div style="margin-top:20px;font-size:24px;font-weight:bold;color:#16a34a;">Berhasil Diatasi!</div>`
        : `<div style="font-size:80px;color:#dc2626;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-plug" style="transform:rotate(90deg);"></i><i class="fa-solid fa-bolt" style="color:#f59e0b;font-size:40px;margin:0 5px;"></i><i class="fa-solid fa-plug" style="transform:rotate(-90deg);"></i></div><div style="margin-top:20px;font-size:24px;font-weight:bold;color:#dc2626;">Koneksi PSC Terputus!</div>`;
    const content = document.createElement('div');
    content.style.cssText = 'text-align:center;display:flex;flex-direction:column;align-items:center;';
    content.innerHTML = iconHTML;
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => { document.body.removeChild(overlay); callback(); }, 300); }, 1500);
}

// ==============================================================
// ALERT POPUP MODAL (auto-shows on new alert)
// ==============================================================
let alertTimeout;
function showAlert(alertObj) {
    const modal = document.getElementById('alertModal');
    if (!modal) return;
    let levelColor = '#ef4444';
    if (alertObj.level === 'Critical') levelColor = '#b91c1c';
    else if (alertObj.level === 'Medium') levelColor = '#f97316';
    else if (alertObj.level === 'Low')   levelColor = '#eab308';

    modal.innerHTML = `
        <div class="modal-content" style="border-left:5px solid ${levelColor};border-radius:8px;width:400px;max-width:90%;background:white;padding:20px;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
            <h3 style="color:${levelColor};margin-bottom:15px;font-size:18px;display:flex;align-items:center;justify-content:space-between;">
                <span><i class="fa-solid fa-triangle-exclamation" style="margin-right:8px;font-size:20px;"></i>Gangguan: ${alertObj.level}</span>
                <button onclick="closeModal()" style="background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
            </h3>
            <div style="font-size:14px;line-height:1.6;color:#334155;">
                <p style="margin-bottom:5px;"><strong>Kapal:</strong> <span style="color:#0f172a;font-weight:600;">${alertObj.ship}</span> (IMO: ${alertObj.imo})</p>
                <p style="margin-bottom:10px;"><strong>Jenis:</strong> <span style="font-weight:600;color:${levelColor};">${alertObj.jenis}</span></p>
                <p style="font-size:13px;color:#64748b;background:#f8fafc;padding:10px;border-radius:6px;border:1px solid #e2e8f0;">Harap lakukan pengecekan pada menu Alert Monitoring.</p>
            </div>
            <div style="display:flex;gap:10px;margin-top:15px;">
                <button onclick="window.location.hash='alert';closeModal();" style="flex:1;padding:10px;background:${levelColor};color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Lihat Detail Alert</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    clearTimeout(alertTimeout);
    alertTimeout = setTimeout(closeModal, 8000);
}

function closeModal() {
    const modal = document.getElementById('alertModal');
    if (modal) modal.style.display = 'none';
}

// ==============================================================
// HISTORY
// ==============================================================
async function renderHistory() {
    const tbody  = document.getElementById('historyList');
    if (!tbody) return;

    const dateF   = document.getElementById('filterDate')?.value   || '';
    const imoF    = document.getElementById('filterShip')?.value   || '';
    const searchF = (document.getElementById('filterSearch')?.value || '').toLowerCase().trim();

    const params = new URLSearchParams();
    if (dateF) params.set('date', dateF);
    if (imoF)  params.set('imo',  imoF);

    const res = await api.get('/history?' + params.toString());
    if (!res.success) return;

    let all = [...res.history, ...res.active];

    // Client-side text search by ship name
    if (searchF) {
        all = all.filter(item => (item.ship || '').toLowerCase().includes(searchF));
    }

    const summary = res.summary;

    tbody.innerHTML = '';
    all.slice(0, 30).forEach((item, i) => {
        const badgeClass = item.status === 'Connected' ? 'badge-connected' : 'badge-disconnected';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${item.ship}</td>
            <td>${item.imo}</td>
            <td>${item.start_time || '-'}</td>
            <td>${item.end_time || '-'}</td>
            <td>${parseFloat(item.energy).toLocaleString()}</td>
            <td>${parseFloat(item.co2).toFixed(2)}</td>
            <td><span class="${badgeClass}">${item.status}</span></td>
        `;
        tbody.appendChild(row);
    });

    setInner('totalTransaksi',    summary.total       || 0);
    setInner('totalEnergiHistory', parseFloat(summary.total_energy || 0).toLocaleString() + ' kWh');
    setInner('totalCO2History',    parseFloat(summary.total_co2    || 0).toFixed(2) + ' kg');

    // Disconnected only table
    const tbodyDisc = document.getElementById('historyDisconnectedList');
    if (tbodyDisc) {
        tbodyDisc.innerHTML = '';
        let idx = 1;
        res.history.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${idx++}</td>
                <td style="font-weight:500;color:#0f172a;">${item.ship}</td>
                <td>${item.imo}</td>
                <td>${item.start_time || '-'}</td>
                <td>${item.end_time || '-'}</td>
                <td><span class="badge-disconnected">${item.status}</span></td>
            `;
            tbodyDisc.appendChild(row);
        });
    }
}

async function renderHistoryShipFilter() {
    const filterShip = document.getElementById('filterShip');
    if (!filterShip) return;
    filterShip.innerHTML = '<option value="">Semua Kapal</option>';
    ships.forEach(ship => {
        const opt = document.createElement('option');
        opt.value    = ship.imo;
        opt.innerText = ship.name;
        filterShip.appendChild(opt);
    });
}

// ==============================================================
// PLANNING
// ==============================================================
async function loadPlanning() {
    const res = await api.get('/planning');
    if (res.success) {
        window._planningData = res.data;
        renderPlanningList(res.data);
    }
}

function renderPlanningList(data) {
    const list = document.getElementById('planningList');
    if (!list) return;
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<li style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;"><i class="fa-solid fa-calendar-xmark" style="font-size:32px;margin-bottom:12px;display:block;"></i>Belum ada jadwal sandar.</li>';
        return;
    }

    data.forEach(p => {
        const li = document.createElement('li');
        li.className = 'planning-card';
        const etdText = p.etd ? `<span class="planning-meta-badge"><i class="fa-solid fa-flag-checkered"></i> ETD: ${p.etd}</span>` : '';
        const ppkText = p.no_ppk ? `<span class="planning-meta-badge"><i class="fa-solid fa-file-contract"></i> ${p.no_ppk}</span>` : '';
        const prcText = p.no_prc ? `<span class="planning-meta-badge"><i class="fa-solid fa-file-invoice"></i> ${p.no_prc}</span>` : '';
        const kegText = p.kegiatan ? `<span class="planning-meta-badge"><i class="fa-solid fa-boxes-stacked"></i> ${p.kegiatan}</span>` : '';
        const grtText = p.grt ? `<span class="planning-meta-badge"><i class="fa-solid fa-weight-scale"></i> GRT: ${Number(p.grt).toLocaleString()}</span>` : '';
        const loaText = p.loa ? `<span class="planning-meta-badge"><i class="fa-solid fa-ruler-horizontal"></i> LOA: ${p.loa}m</span>` : '';

        li.innerHTML = `
            <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    <h4 style="color:#1e293b;font-size:16px;margin:0;">${p.name}</h4>
                    <span class="planning-status">Scheduled</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
                    <span class="planning-meta-badge"><i class="fa-solid fa-location-dot"></i> ${p.dermaga}</span>
                    <span class="planning-meta-badge"><i class="fa-regular fa-clock"></i> ETA: ${p.date}</span>
                    ${etdText}${kegText}${ppkText}${prcText}${grtText}${loaText}
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;margin-left:16px;">
                <button onclick="runPlanning(${p.id})" title="Jalankan" style="background:#22c55e;color:white;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px;"><i class="fa-solid fa-play"></i> Run</button>
                <button onclick="editPlanning(${p.id})" title="Edit" style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;padding:7px 12px;border-radius:6px;cursor:pointer;font-size:13px;"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deletePlanning(${p.id}, '${p.name.replace(/'/g,'\\&apos;')}')" title="Hapus" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;padding:7px 12px;border-radius:6px;cursor:pointer;font-size:13px;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(li);
    });
}

async function addPlanning() {
    const name     = document.getElementById('planShipName').value.trim();
    const dermaga  = document.getElementById('planDermaga').value;
    const date     = document.getElementById('planDate').value.replace('T', ' ');
    const etd      = document.getElementById('planEtd').value.replace('T', ' ');
    const no_ppk   = document.getElementById('planNoPpk').value.trim();
    const no_prc   = document.getElementById('planNoPrc').value.trim();
    const kegiatan = document.getElementById('planKegiatan').value;
    const grt      = document.getElementById('planGrt').value;
    const loa      = document.getElementById('planLoa').value;

    if (!name || !dermaga || !date) {
        showToast('Nama kapal, dermaga, dan ETA wajib diisi!', 'error'); return;
    }

    const res = await api.post('/planning', { name, dermaga, date, etd, no_ppk, no_prc, kegiatan, grt, loa });
    if (res.success) {
        ['planShipName','planDermaga','planDate','planEtd','planNoPpk','planNoPrc','planGrt','planLoa'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('planKegiatan').value = 'BONGKAR';
        showToast('Jadwal berhasil ditambahkan.', 'success');
        loadPlanning();
    } else {
        showToast(res.message || 'Gagal tambah planning.', 'error');
    }
}

async function runPlanning(id) {
    const res = await api.post(`/planning/${id}/run`);
    if (res.success) {
        if (res.ship) ships.unshift(res.ship);
        showToast(res.message, 'success');
        loadPlanning();
        renderShipList();
        renderReportShipList();
        renderHistoryShipFilter();
    } else {
        showToast(res.message || 'Gagal jalankan planning.', 'error');
    }
}

// --- Edit Planning ---
function editPlanning(id) {
    const plan = window._planningData?.find(p => p.id == id);
    if (!plan) { showToast('Data tidak ditemukan.', 'error'); return; }

    document.getElementById('editPlanId').value       = plan.id;
    document.getElementById('editPlanShipName').value = plan.name;
    document.getElementById('editPlanDermaga').value  = plan.dermaga;
    document.getElementById('editPlanDate').value     = (plan.date || '').replace(' ', 'T');
    document.getElementById('editPlanEtd').value      = (plan.etd || '').replace(' ', 'T');
    document.getElementById('editPlanNoPpk').value    = plan.no_ppk || '';
    document.getElementById('editPlanNoPrc').value    = plan.no_prc || '';
    document.getElementById('editPlanKegiatan').value = plan.kegiatan || 'BONGKAR';
    document.getElementById('editPlanGrt').value      = plan.grt || '';
    document.getElementById('editPlanLoa').value      = plan.loa || '';

    document.getElementById('planEditModal').classList.add('active');
}

function closePlanEditModal() {
    document.getElementById('planEditModal').classList.remove('active');
}

async function submitEditPlanning() {
    const id       = document.getElementById('editPlanId').value;
    const name     = document.getElementById('editPlanShipName').value.trim();
    const dermaga  = document.getElementById('editPlanDermaga').value;
    const date     = document.getElementById('editPlanDate').value.replace('T', ' ');
    const etd      = document.getElementById('editPlanEtd').value.replace('T', ' ');
    const no_ppk   = document.getElementById('editPlanNoPpk').value.trim();
    const no_prc   = document.getElementById('editPlanNoPrc').value.trim();
    const kegiatan = document.getElementById('editPlanKegiatan').value;
    const grt      = document.getElementById('editPlanGrt').value;
    const loa      = document.getElementById('editPlanLoa').value;

    if (!name || !dermaga || !date) {
        showToast('Nama kapal, dermaga, dan ETA wajib diisi!', 'error'); return;
    }

    const res = await api.put(`/planning/${id}`, { name, dermaga, date, etd, no_ppk, no_prc, kegiatan, grt, loa });
    if (res.success) {
        closePlanEditModal();
        showToast('Jadwal berhasil diperbarui.', 'success');
        loadPlanning();
    } else {
        showToast(res.message || 'Gagal memperbarui jadwal.', 'error');
    }
}

async function deletePlanning(id, name) {
    if (!confirm(`Yakin hapus jadwal "${name}"?`)) return;
    const res = await api.delete(`/planning/${id}`);
    if (res.success) {
        showToast('Jadwal berhasil dihapus.', 'success');
        loadPlanning();
    } else {
        showToast(res.message || 'Gagal menghapus jadwal.', 'error');
    }
}

// ==============================================================
// LAPORAN / REPORT
// ==============================================================
function renderReportShipList(filter = '') {
    const container = document.getElementById('reportShipCardsContainer');
    if (!container) return;
    container.innerHTML = '';
    ships.forEach(ship => {
        if (filter && !ship.name.toLowerCase().includes(filter) && !ship.imo.includes(filter)) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><button onclick="downloadShipReport('${ship.imo}')" style="background:#0ea5e9;color:white;width:32px;height:32px;border:none;border-radius:6px;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"><i class="fa-solid fa-arrow-right"></i></button></td>
            <td style="color:#64748b;">${ship.no_ppk || '-'}</td>
            <td style="color:#64748b;">${ship.no_prc || '-'}</td>
            <td style="color:#64748b;">${ship.kegiatan || '-'}</td>
            <td style="color:#64748b;">${ship.type || '-'}</td>
            <td style="color:#64748b;">${ship.imo}</td>
            <td style="color:#64748b;">${ship.name}</td>
            <td style="color:#64748b;">${ship.grt || '-'}</td>
            <td style="color:#64748b;">${ship.loa || '-'}</td>
            <td style="color:#64748b;">${ship.voyage || '-'}</td>
        `;
        container.appendChild(tr);
    });
}

function filterReportShips() {
    const input = document.getElementById('searchReportShip')?.value.toLowerCase() || '';
    renderReportShipList(input);
}

async function downloadShipReport(imo) {
    const ship = ships.find(s => s.imo === imo);
    if (!ship) return;
    const res = await api.get(`/history?imo=${imo}`);
    if (!res.success) return;
    let csv = 'Waktu Mulai,Waktu Selesai,Nama Kapal,IMO,Energi (kWh)\n';
    res.history.forEach(h => {
        csv += `"${h.start_time}","${h.end_time || '-'}","${h.ship}","${h.imo}",${h.energy}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href  = URL.createObjectURL(blob);
    link.download = `Report_${ship.name.replace(/\s+/g, '_')}.csv`;
    link.click();
}

async function downloadReport() {
    const res = await api.get('/history');
    if (!res.success) return;
    let csv = 'Waktu Mulai,Waktu Selesai,Nama Kapal,IMO,Energi (kWh),CO2 (kg)\n';
    res.history.forEach(h => {
        csv += `"${h.start_time}","${h.end_time || '-'}","${h.ship}","${h.imo}",${h.energy},${h.co2}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href  = URL.createObjectURL(blob);
    link.download = 'PSC_Daily_Report.csv';
    link.click();
}

// ==============================================================
// TOAST NOTIFICATION
// ==============================================================
let toastTimeout;
function showToast(message, type = 'success') {
    const toast  = document.getElementById('toastNotification');
    const msgEl  = document.getElementById('toastMessage');
    const iconEl = document.getElementById('toastIcon');
    if (!toast || !msgEl || !iconEl) return;
    msgEl.innerText = message;
    if (type === 'success') {
        toast.style.borderLeftColor = '#22c55e'; iconEl.className = 'fa-solid fa-circle-check'; iconEl.style.color = '#22c55e';
    } else {
        toast.style.borderLeftColor = '#ef4444'; iconEl.className = 'fa-solid fa-circle-exclamation'; iconEl.style.color = '#ef4444';
    }
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(closeToast, 4000);
}

function closeToast() {
    const toast = document.getElementById('toastNotification');
    if (toast) toast.classList.remove('show');
}

// ==============================================================
// LOGOUT
// ==============================================================
async function logout() {
    await api.post('/auth/logout');
    window.location.href = 'login.html';
}

// ==============================================================
// UTILITY
// ==============================================================
function setInner(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

// ==============================================================
// INITIALISATION
// ==============================================================
window.onload = async function () {
    await checkAuth();
    await loadComponents();

    // Load initial page from hash
    const hash = window.location.hash.substring(1).split('?')[0];
    if (componentsToLoad.includes(hash)) showPage(hash, false);
    else showPage('dashboard', false);

    // Init charts
    const dashCtx = document.getElementById('dashboardChart');
    if (dashCtx) {
        dashboardChart = new Chart(dashCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Akumulasi Energi (kWh)', data: [], borderColor: '#22c55e', tension: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, animation: false },
        });
    }

    const monCtx = document.getElementById('monitoringChart');
    if (monCtx) {
        monitoringChart = new Chart(monCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Energi Real-Time (kW)', data: [], borderColor: '#3b82f6', tension: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, animation: false },
        });
    }

    // Load initial data from API
    const shipsRes = await api.get('/ships');
    if (shipsRes.success) ships = shipsRes.data;

    await loadAlerts();
    renderShipList();
    renderReportShipList();
    setTimeout(() => { renderHistoryShipFilter(); }, 300);

    // Kick off simulation polling
    startSimulationPolling();
};
