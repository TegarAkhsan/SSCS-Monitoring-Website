// ===============================
// GLOBAL VARIABLES & AUTH
// ===============================
if (localStorage.getItem("isLogin") !== "true") {
    window.location.href = "login.html";
}

let dashboardChart;
let monitoringChart;
let totalEnergy = 0;

// ===============================
// LOKAL DATABASE SYSTEM (localStorage)
// ===============================
const defaultShips = [
    { name: "MV. MEGHNA LIBERTY", type: "KPLCURAHKR", imo: "I000036365", noPpk: "V92690000470426", noPrc: "OP92690000410426", kegiatan: "MUAT", grt: 31877, loa: 189.99, voyage: "LUARNEGERI" },
    { name: "MV. SUN PLENTY", type: "Curah Kering", imo: "K001016851", noPpk: "V92690000460426", noPrc: "OP92690000400426", kegiatan: "BONGKAR", grt: 32415, loa: 189.99, voyage: "LUARNEGERI" },
    { name: "MV. GLORY DYNASTY", type: "KPLCARGO", imo: "I000013810", noPpk: "V92690000450326", noPrc: "OP92690000390326", kegiatan: "BONGKAR", grt: 6632, loa: 103.63, voyage: "LUARNEGERI" },
    { name: "MV. XIN HANG 9", type: "KPLCARGO", imo: "I000043068", noPpk: "V92690000440326", noPrc: "OP92690000380326", kegiatan: "BONGKAR", grt: 9160, loa: 136, voyage: "LUARNEGERI" },
    { name: "BALI STRAIT", type: "Curah Kering", imo: "K001015659", noPpk: "V92690000430326", noPrc: "OP92690000370326", kegiatan: "BONGKAR", grt: 10248, loa: 149.7, voyage: "DALAMNEGERI" },
    { name: "MV. ROSTRUM AUSTRALIA", type: "Curah Kering", imo: "K001016909", noPpk: "V92690000410326", noPrc: "OP92690000360326", kegiatan: "BONGKAR", grt: 25859, loa: 179.97, voyage: "LUARNEGERI" },
    { name: "MV. MALTEZA", type: "Curah Kering", imo: "K001016760", noPpk: "V92690000400326", noPrc: "OP92690000350326", kegiatan: "BONGKAR", grt: 31250, loa: 189.99, voyage: "LUARNEGERI" },
    { name: "MV. DK ARTEMIS", type: "Curah Kering", imo: "K001013556", noPpk: "V92690000380326", noPrc: "OP92690000340326", kegiatan: "BONGKAR", grt: 7506, loa: 110.49, voyage: "LUARNEGERI" },
    { name: "MV. DEVBULK DEMET", type: "KPLCARGO", imo: "I000027695", noPpk: "V92690000360326", noPrc: "OP92690000330326", kegiatan: "BONGKAR", grt: 19999, loa: 178.7, voyage: "LUARNEGERI" },
    { name: "XIN YI BO LI 01", type: "Curah Kering", imo: "K001015594", noPpk: "V92690000350326", noPrc: "OP92690000320326", kegiatan: "BONGKAR", grt: 3666, loa: 98.8, voyage: "LUARNEGERI" }
];

let ships = JSON.parse(localStorage.getItem("psc_ships")) || defaultShips;

// Reset ships database to ensure new data is loaded properly once
if (!localStorage.getItem("data_reset_v4")) {
    localStorage.removeItem("psc_ships");
    localStorage.removeItem("psc_history");
    localStorage.removeItem("psc_planning");
    localStorage.removeItem("psc_alert");
    localStorage.removeItem("psc_states");
    localStorage.removeItem("psc_sessions");
    localStorage.setItem("data_reset_v4", "true");
    
    ships = defaultShips;
}

let historyData = JSON.parse(localStorage.getItem("psc_history")) || [];
let planningData = JSON.parse(localStorage.getItem("psc_planning")) || [];
let alertData = JSON.parse(localStorage.getItem("psc_alert")) || [];
let shipStates = JSON.parse(localStorage.getItem("psc_states")) || {};
let activeSessions = JSON.parse(localStorage.getItem("psc_sessions")) || {};

function saveDB() {
    localStorage.setItem("psc_ships", JSON.stringify(ships));
    localStorage.setItem("psc_history", JSON.stringify(historyData));
    localStorage.setItem("psc_planning", JSON.stringify(planningData));
    localStorage.setItem("psc_alert", JSON.stringify(alertData));
    localStorage.setItem("psc_states", JSON.stringify(shipStates));
    localStorage.setItem("psc_sessions", JSON.stringify(activeSessions));
}

// ===============================
// NAVIGATION & COMPONENT LOADING
// ===============================
const componentsToLoad = ['navbar', 'dashboard', 'monitoring', 'history', 'alert', 'laporan', 'planning'];

async function loadComponents() {
    for (const comp of componentsToLoad) {
        const placeholder = document.getElementById(`${comp}-placeholder`);
        if (placeholder) {
            try {
                const response = await fetch(`components/${comp}.html?v=` + new Date().getTime());
                placeholder.outerHTML = await response.text();
            } catch (err) {
                console.error(`Error loading ${comp}:`, err);
            }
        }
    }
}

function showPage(pageId, pushState = true) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });

    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    // Update active state in the navbar
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.getElementById(`nav-${pageId}`);
    if (activeLink) activeLink.classList.add('active');

    // Update URL hash without reloading the page
    if (pushState) {
        window.history.pushState(null, "", "#" + pageId);
    }
}

// Handle browser Back/Forward navigation
window.addEventListener("hashchange", () => {
    let hash = window.location.hash.substring(1).split('?')[0];
    if (componentsToLoad.includes(hash)) {
        showPage(hash, false);
    }
});

// ===============================
// SHIP LIST & SELECTION
// ===============================
let selectedShipImo = null;

function renderShipList() {
    const container = document.getElementById("shipCardsContainer");
    if (!container) return;

    container.innerHTML = "";
    ships.forEach(ship => {
        if (shipStates[ship.imo] && shipStates[ship.imo].stopped) return;

        const isActive = ship.imo === selectedShipImo;
        const card = document.createElement("div");

        // Base styles
        let baseStyle = "padding: 15px; background: white; border-radius: 8px; cursor: pointer; transition: 0.2s; display: flex; justify-content: space-between; align-items: center;";
        let borderStyle = isActive ? "border: 2px solid #256b9c; box-shadow: 0 0 8px rgba(37, 107, 156, 0.2);" : "border: 1px solid #e2e8f0;";

        card.style.cssText = baseStyle + borderStyle;

        if (!isActive) {
            card.onmouseover = () => card.style.borderColor = "#256b9c";
            card.onmouseleave = () => card.style.borderColor = "#e2e8f0";
        }

        card.onclick = () => selectShip(ship.imo);

        // Calculate current connection status from state
        let statusDot = `<span style="width: 8px; height: 8px; background: #cbd5e1; border-radius: 50%; display: inline-block; margin-right: 5px;"></span>`;
        if (shipStates[ship.imo] && shipStates[ship.imo].connected) {
            statusDot = `<span style="width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block; margin-right: 5px;"></span>`;
        } else if (shipStates[ship.imo] && !shipStates[ship.imo].connected && shipStates[ship.imo].totalEnergy > 0) {
            statusDot = `<span style="width: 8px; height: 8px; background: #dc2626; border-radius: 50%; display: inline-block; margin-right: 5px;"></span>`;
        }

        card.innerHTML = `
            <div>
                <h4 style="margin-bottom: 4px; color: ${isActive ? '#256b9c' : '#0f172a'}; font-size: 15px;">${statusDot}${ship.name}</h4>
                <p style="color: #64748b; font-size: 12px; margin-left: 13px;">IMO: ${ship.imo}</p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: ${isActive ? '#256b9c' : '#cbd5e1'}; font-size: 14px;"></i>
        `;
        container.appendChild(card);
    });
}

function selectShip(imo) {
    const ship = ships.find(s => s.imo === imo);
    if (ship) {
        document.getElementById("shipName").innerText = ship.name;
        document.getElementById("shipType").innerText = ship.type;
        document.getElementById("shipIMO").innerText = ship.imo;

        if (!shipStates[imo]) {
            shipStates[imo] = { totalEnergy: 0, realtime: 0, connected: false, stopped: false };
        }
        
        const current = shipStates[imo];
        
        const realtimeEl = document.getElementById("realtimePower");
        if (realtimeEl) realtimeEl.innerText = current.realtime + " kW";

        totalEnergy = current.totalEnergy;
        const totalEl = document.getElementById("totalEnergy");
        if (totalEl) totalEl.innerText = totalEnergy.toLocaleString() + " kWh";
        
        const co2El = document.getElementById("co2Saved");
        if (co2El) co2El.innerText = (totalEnergy * 0.0027).toFixed(2) + " kg";

        const dashAlertCount = document.getElementById("alertCount");
        if (dashAlertCount) {
            const activeAlertsForShip = alertData.filter(a => a.imo === imo && a.status === "Active").length;
            dashAlertCount.innerText = activeAlertsForShip;
        }

        const pscStatusIndicator = document.getElementById("pscStatusIndicator");
        const disconnectBtn = document.getElementById("disconnectPscBtn");
        
        if (pscStatusIndicator) {
            if (current.connected) {
                pscStatusIndicator.className = "success";
                pscStatusIndicator.innerText = "Aman";
                pscStatusIndicator.style.background = "#def7ec";
                pscStatusIndicator.style.color = "#03543f";
                if (disconnectBtn) disconnectBtn.style.display = "flex";
            } else {
                pscStatusIndicator.className = "danger";
                pscStatusIndicator.innerText = "Bahaya";
                pscStatusIndicator.style.background = "#fde8e8";
                pscStatusIndicator.style.color = "#9b1c1c";
                if (disconnectBtn) disconnectBtn.style.display = "none";
            }
        }

        const pscStatus = document.getElementById("pscStatus");
        if (pscStatus) {
            pscStatus.innerText = current.connected ? "Connected" : "Disconnected";
        }

        selectedShipImo = imo; // Save selected ship ID
        renderShipList(); // Re-render to show active stylistic state
    }
}

// ===============================
// INIT CHARTS & COMPONENTS
// ===============================
window.onload = async function () {
    await loadComponents();

    // Load page from URL hash, default to dashboard
    let hash = window.location.hash.substring(1).split('?')[0];
    if (componentsToLoad.includes(hash)) {
        showPage(hash, false); // false to avoid unnecessary pushState on load
    } else {
        showPage('dashboard', false);
    }

    const dashCtx = document.getElementById("dashboardChart");
    if (dashCtx) {
        dashboardChart = new Chart(dashCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Akumulasi Energi (kWh)',
                    data: [],
                    borderColor: '#22c55e',
                    tension: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false
            }
        });
    }

    const monitorCtx = document.getElementById("monitoringChart");
    if (monitorCtx) {
        monitoringChart = new Chart(monitorCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Energi Real-Time (kWh)',
                    data: [],
                    borderColor: '#3b82f6',
                    tension: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false
            }
        });
    }

    // Initialize Ship List
    renderShipList();
    renderReportShipList();
    setTimeout(() => {
        renderHistoryShipFilter();
        renderAlert();
    }, 500); // delay to ensure history component loaded

    startEnergySimulation();
};

// ===============================
// ENERGY SIMULATION
// ===============================
function startEnergySimulation() {
    setInterval(() => {

        const selectedIMO = document.getElementById("shipIMO")?.innerText || "-";

        // Global variables for dashboard aggregation
        let activeConnections = 0;
        let globalRealtimeSum = 0;
        let globalTotalEnergySum = 0;
        let monitoredKapalCount = 0;

        ships.forEach(ship => {
            if (!shipStates[ship.imo]) {
                shipStates[ship.imo] = { totalEnergy: 0, realtime: 0, connected: false, stopped: false };
            }

            if (shipStates[ship.imo].stopped) {
                shipStates[ship.imo].realtime = 0;
                shipStates[ship.imo].connected = false;
                
                globalTotalEnergySum += shipStates[ship.imo].totalEnergy;
            } else {
                monitoredKapalCount++;
                const value = Math.floor(Math.random() * 50) + 200;
                const connected = value > 210;

                if (connected) activeConnections++;

                shipStates[ship.imo].realtime = value;
                shipStates[ship.imo].connected = connected;

                if (connected) {
                    shipStates[ship.imo].totalEnergy += value;
                }

                globalRealtimeSum += value;
                globalTotalEnergySum += shipStates[ship.imo].totalEnergy;

                // Pass true for connection status so the continuous monitoring session isn't broken
                addHistory(ship.imo, value, true);

                if (value > 240) {
                    generateAlert(value, ship.imo);
                }
            }
        });

        // UPDATE UI FOR GLOBAL DASHBOARD
        const kapalTerhubung = document.getElementById("kapalTerhubung");
        if (kapalTerhubung) kapalTerhubung.innerText = activeConnections + " Kapal";

        const totalKapalEl = document.getElementById("globalTotalKapal");
        if (totalKapalEl) totalKapalEl.innerText = monitoredKapalCount;

        const globalKapalEl = document.getElementById("globalKapalTerhubung");
        if (globalKapalEl) globalKapalEl.innerText = activeConnections;

        const globalRealtimeEl = document.getElementById("globalRealtimeEnergy");
        if (globalRealtimeEl) globalRealtimeEl.innerText = globalRealtimeSum.toLocaleString() + " kW";

        const globalTotalEnergyEl = document.getElementById("globalTotalEnergy");
        if (globalTotalEnergyEl) globalTotalEnergyEl.innerText = globalTotalEnergySum.toLocaleString() + " kWh";

        const globalCO2El = document.getElementById("globalCO2Saved");
        const globalCO2 = (globalTotalEnergySum * 0.0027).toFixed(2);
        if (globalCO2El) globalCO2El.innerText = globalCO2 + " kg";

        // GLOBAL DASHBOARD CHART (Akumulasi Energi Semua Kapal)
        if (dashboardChart) {
            dashboardChart.data.labels.push("");
            dashboardChart.data.datasets[0].data.push(globalTotalEnergySum);
            if (dashboardChart.data.labels.length > 20) {
                dashboardChart.data.labels.shift();
                dashboardChart.data.datasets[0].data.shift();
            }
            dashboardChart.update();
        }

        // UPDATE UI FOR SELECTED SHIP (MONITORING PAGE)
        if (selectedIMO !== "-" && shipStates[selectedIMO]) {
            const current = shipStates[selectedIMO];
            const value = current.realtime;
            const isConnected = current.connected;

            // UPDATE REALTIME CARD
            const realtime = document.getElementById("realtimePower");
            if (realtime) realtime.innerText = value + " kW";

            // AKUMULASI
            const totalEnergy = current.totalEnergy; // Use local totalEnergy for selected ship
            const totalEl = document.getElementById("totalEnergy");
            if (totalEl) totalEl.innerText = totalEnergy.toLocaleString() + " kWh";

            // CO2 ESTIMATION
            const co2 = (totalEnergy * 0.0027).toFixed(2);
            const co2El = document.getElementById("co2Saved");
            if (co2El) co2El.innerText = co2 + " kg";

            // STATUS PSC DYNAMIC
            const pscStatus = document.getElementById("pscStatus");
            const pscStatusIndicator = document.getElementById("pscStatusIndicator");
            const disconnectBtn = document.getElementById("disconnectPscBtn");
            if (pscStatusIndicator) {
                if (isConnected) {
                    if (pscStatus) pscStatus.innerText = "Connected";
                    pscStatusIndicator.className = "success";
                    pscStatusIndicator.innerText = "Aman";
                    pscStatusIndicator.style.background = "#def7ec";
                    pscStatusIndicator.style.color = "#03543f";
                    if (disconnectBtn) disconnectBtn.style.display = "flex";
                } else {
                    if (pscStatus) pscStatus.innerText = "Disconnected";
                    pscStatusIndicator.className = "danger";
                    pscStatusIndicator.innerText = "Bahaya";
                    pscStatusIndicator.style.background = "#fde8e8";
                    pscStatusIndicator.style.color = "#9b1c1c";
                    if (disconnectBtn) disconnectBtn.style.display = "none";
                }
            }

            // MONITORING CHART FOR LOCAL SHIP
            if (monitoringChart && !current.stopped) {
                monitoringChart.data.labels.push("");
                monitoringChart.data.datasets[0].data.push(value);
                if (monitoringChart.data.labels.length > 20) {
                    monitoringChart.data.labels.shift();
                    monitoringChart.data.datasets[0].data.shift();
                }
                monitoringChart.update();
            }

            // UPDATE MONITORING ALERT COUNT FOR SPECIFIC SHIP
            const dashAlertCount = document.getElementById("alertCount");
            if (dashAlertCount) {
                const activeAlertsForShip = alertData.filter(a => a.imo === selectedIMO && a.status === "Active").length;
                dashAlertCount.innerText = activeAlertsForShip;
            }
        }

        // Re-render ship list periodically to update status dots
        renderShipList();
        
        // Simpan state setiap tick simulasi
        saveDB();

    }, 3000);
}

function generateAlert(value, imo) {
    const ship = ships.find(s => s.imo === imo);
    if (!ship) return;

    let level = "";
    let jenis = "";

    if (value > 260) {
        level = "Critical";
        const criticalTypes = ["Sistem PSC tidak bisa digunakan", "Sistem monitoring error", "Gangguan listrik besar"];
        jenis = criticalTypes[Math.floor(Math.random() * criticalTypes.length)];
    } else if (value > 240) {
        level = "High";
        const highTypes = ["Overload", "Over Voltage", "Under Voltage", "Arus berlebih"];
         jenis = highTypes[Math.floor(Math.random() * highTypes.length)];
    } else if (value > 220) {
        level = "Medium";
        const medTypes = ["High Power Usage", "Fluktuasi tegangan", "Koneksi PSC tidak stabil"];
        jenis = medTypes[Math.floor(Math.random() * medTypes.length)];
    } else if (value > 200) {
        if (Math.random() > 0.8) {
            level = "Low";
            const lowTypes = ["Fluktuasi daya kecil", "Tegangan sedikit turun", "Tegangan sedikit naik", "Pemakaian energi mulai meningkat"];
            jenis = lowTypes[Math.floor(Math.random() * lowTypes.length)];
        } else {
            return;
        }
    } else {
        return; // no alert
    }

    // Check if there is already an active alert for this ship with the same level
    const existingAlert = alertData.find(a => a.imo === imo && a.status === "Active" && a.level === level);
    if (existingAlert) {
        // Already active, do not flood the array
        return;
    }

    const alertItem = {
        id: "ALT-" + Date.now() + Math.floor(Math.random() * 1000), // added randomizer for unique keys
        ship: ship.name,
        imo: ship.imo,
        jenis: jenis,
        level: level,
        status: "Active",
        startTimeMs: Date.now(),
        waktu: new Date().toLocaleString()
    };

    alertData.push(alertItem);
    renderAlert();
    if(typeof renderShipList === "function") renderShipList();
    if(typeof showAlert === "function") showAlert(alertItem);
}

function renderAlert() {
    const tbody = document.getElementById("alertList");
    const historyTbody = document.getElementById("alertHistoryList");
    
    if (tbody) tbody.innerHTML = "";
    if (historyTbody) historyTbody.innerHTML = "";

    let criticalCount = 0;
    let activeCount = 0;

    alertData.forEach(item => {
        if (item.status === "Active") {
            activeCount++;
            if (item.level === "Critical") criticalCount++;
        }
    });

    const activeAlerts = alertData.filter(a => a.status === "Active").reverse();
    const resolvedAlerts = alertData.filter(a => a.status === "Resolved").slice(-20).reverse();

    if (tbody) {
        activeAlerts.forEach(item => {
            const row = document.createElement("tr");

            let levelStyle = "font-weight: 600; ";
            if (item.level === "Critical") levelStyle += "color: #7f1d1d;";
            else if (item.level === "High") levelStyle += "color: #dc2626;";
            else if (item.level === "Medium") levelStyle += "color: #ea580c;";
            else if (item.level === "Low") levelStyle += "color: #ca8a04;";

            const durationMs = Date.now() - (item.startTimeMs || Date.now());
            const durHours = Math.floor(durationMs / 3600000);
            const durMins = Math.floor((durationMs % 3600000) / 60000);
            const durText = durHours > 0 ? `${durHours} Jam ${durMins} Menit` : `${durMins} Menit`;

            let levelIcon = "";
            if (item.level === "Low") levelIcon = "🟡";
            if (item.level === "Medium") levelIcon = "🟠";
            if (item.level === "High") levelIcon = "🔴";
            if (item.level === "Critical") levelIcon = "🚨";

            row.innerHTML = `
                <td>${item.id}</td>
                <td><span style="font-weight: 600; color: #1e293b;">${item.ship}</span></td>
                <td>${item.imo}</td>
                <td>${item.jenis}</td>
                <td style="${levelStyle}">${levelIcon} ${item.level}</td>
                <td>${item.waktu || "-"}</td>
                <td>${durText}</td>
                <td>
                    <button onclick="openAlertDetail('${item.id}')" style="background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; color: #475569; font-size: 12px; font-weight: 600;"><i class="fa-solid fa-eye" style="margin-right: 4px;"></i> Detail</button>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    if (historyTbody) {
        resolvedAlerts.forEach(item => {
            const row = document.createElement("tr");

            let levelStyle = "font-weight: 600; ";
            if (item.level === "Critical") levelStyle += "color: #7f1d1d;";
            else if (item.level === "High") levelStyle += "color: #dc2626;";
            else if (item.level === "Medium") levelStyle += "color: #ea580c;";
            else if (item.level === "Low") levelStyle += "color: #ca8a04;";

            let levelIcon = "";
            if (item.level === "Low") levelIcon = "🟡";
            if (item.level === "Medium") levelIcon = "🟠";
            if (item.level === "High") levelIcon = "🔴";
            if (item.level === "Critical") levelIcon = "🚨";

            row.innerHTML = `
                <td>${item.id}</td>
                <td><span style="font-weight: 600; color: #1e293b;">${item.ship}</span></td>
                <td style="${levelStyle}">${levelIcon} ${item.level}</td>
                <td>${item.resolvedAt || "-"}</td>
            `;

            historyTbody.appendChild(row);
        });
    }

    const totalAlertEl = document.getElementById("totalAlert");
    if (totalAlertEl) totalAlertEl.innerText = alertData.length;
    
    const criticalAlertEl = document.getElementById("criticalAlert");
    if (criticalAlertEl) criticalAlertEl.innerText = criticalCount;
    
    const activeAlertEl = document.getElementById("activeAlert");
    if (activeAlertEl) activeAlertEl.innerText = activeCount;
}

function resolveAlert(id) {
    const alertObj = alertData.find(a => a.id === id);
    if (!alertObj) return;
    
    alertObj.status = "Resolved";
    alertObj.resolvedAt = new Date().toLocaleString();
    
    saveDB();
    renderAlert();
    
    if(typeof showToast === "function") {
        showToast("Alert " + id + " berhasil di-resolve.", "success");
    } else {
        alert("Alert " + id + " berhasil di-resolve.");
    }
}

function stopPsc(imo, alertId) {
    if (!shipStates[imo]) {
        shipStates[imo] = { totalEnergy: 0, realtime: 0, connected: false, stopped: false };
    }
    shipStates[imo].stopped = true;
    shipStates[imo].realtime = 0;
    shipStates[imo].connected = false;
    
    if (alertId) {
        const alertObj = alertData.find(a => a.id === alertId);
        if (alertObj && alertObj.status === "Active") {
            alertObj.status = "Resolved";
            alertObj.resolvedAt = new Date().toLocaleString();
            alertObj.deskripsi = "Dimatikan paksa (Stop PSC) via sistem.";
        }
    }

    addHistory(imo, 0, false);
    saveDB();
    renderAlert();
    renderShipList();
    
    if(typeof showToast === "function") {
        showToast("Koneksi PSC Kapal Berhasil Dihentikan.", "success");
    } else {
        alert("Koneksi PSC Kapal Berhasil Dihentikan.");
    }
}

function disconnectCurrentShip() {
    if (selectedShipImo && selectedShipImo !== "-") {
        stopPsc(selectedShipImo);
        
        const availableShips = ships.filter(s => !(shipStates[s.imo] && shipStates[s.imo].stopped));
        
        if (availableShips.length > 0) {
            selectShip(availableShips[0].imo);
        } else {
            document.getElementById("shipName").innerText = "Tidak ada kapal terpilih";
            document.getElementById("shipIMO").innerText = "-";
            document.getElementById("shipType").innerText = "-";
            
            const realtimeEl = document.getElementById("realtimePower");
            if (realtimeEl) realtimeEl.innerText = "0 kW";
            const totalEl = document.getElementById("totalEnergy");
            if (totalEl) totalEl.innerText = "0 kWh";
            const co2El = document.getElementById("co2Saved");
            if (co2El) co2El.innerText = "0 kg";
            const alertCount = document.getElementById("alertCount");
            if (alertCount) alertCount.innerText = "0";
            
            const pscStatusIndicator = document.getElementById("pscStatusIndicator");
            if (pscStatusIndicator) {
                pscStatusIndicator.className = "danger";
                pscStatusIndicator.innerText = "Kosong";
                pscStatusIndicator.style.background = "#f1f5f9";
                pscStatusIndicator.style.color = "#64748b";
            }
            const btn = document.getElementById("disconnectPscBtn");
            if (btn) btn.style.display = "none";
            
            selectedShipImo = null;
            renderShipList();
        }
    }
}

function openAlertDetail(id) {
    const alertObj = alertData.find(a => a.id === id);
    if (!alertObj) return;

    let bgHeader = "";
    let colorText = "";
    let badgeBg = "";
    let badgeText = "";
    let warningIcon = "";

    if (alertObj.level === "Critical") {
        bgHeader = "linear-gradient(135deg, #df2029, #b9151b)";
        badgeBg = "#fef08a"; badgeText = "#df2029";
        colorText = "#df2029";
        warningIcon = "fa-triangle-exclamation";
    } else if (alertObj.level === "High") {
        bgHeader = "linear-gradient(135deg, #ef4444, #dc2626)";
        badgeBg = "#fef08a"; badgeText = "#dc2626";
        colorText = "#dc2626";
        warningIcon = "fa-triangle-exclamation";
    } else if (alertObj.level === "Medium") {
        bgHeader = "linear-gradient(135deg, #f97316, #ea580c)";
        badgeBg = "#ffedd5"; badgeText = "#ea580c";
        colorText = "#ea580c";
        warningIcon = "fa-circle-exclamation";
    } else {
        bgHeader = "linear-gradient(135deg, #eab308, #ca8a04)";
        badgeBg = "#fef9c3"; badgeText = "#ca8a04";
        colorText = "#ca8a04";
        warningIcon = "fa-bell";
    }

    const durationMs = Date.now() - (alertObj.startTimeMs || Date.now());
    const durMins = Math.max(1, Math.floor(durationMs / 60000));
    const durText = alertObj.status === "Active" ? (durMins + " Menit") : "Resolved";

    let energiTerpakai = "0";
    let dayaSaatIni = "0";
    let co2Reduksi = "0";
    
    if (shipStates[alertObj.imo]) {
        energiTerpakai = shipStates[alertObj.imo].totalEnergy.toLocaleString();
        dayaSaatIni = shipStates[alertObj.imo].realtime;
        co2Reduksi = (shipStates[alertObj.imo].totalEnergy * 0.05).toFixed(2);
    } else {
        energiTerpakai = (Math.random() * 15 + 5).toFixed(1);
        dayaSaatIni = (Math.random() * 60 + 260).toFixed(0);
        co2Reduksi = (parseFloat(energiTerpakai) * 0.05).toFixed(2);
    }
    const dayaRata = Math.max(200, dayaSaatIni - 25);
    
    const sttPscText = alertObj.status === "Active" ? "Aktif" : "Nonaktif";
    const sttPscColor = alertObj.status === "Active" ? "#16a34a" : "#64748b";
    const isResolved = alertObj.status === "Resolved";
    
    document.getElementById("alertDetailContent").innerHTML = `
        <div style="background: ${bgHeader}; padding: 20px 25px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h2 style="font-size: 18px; font-weight: 600; margin: 0; display: flex; align-items: center; font-family: 'Inter', sans-serif;">
                    Detail Alert <span style="font-size: 13px; font-weight: normal; margin-left: 10px; opacity: 0.9;">${alertObj.id}</span>
                </h2>
                <button onclick="closeAlertDetail()" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; opacity: 0.8; transition: 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 18px; font-weight: bold; display: flex; align-items: center; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fa-solid ${warningIcon}" style="margin-right: 10px; font-size: 22px;"></i> ${alertObj.jenis}
                </div>
                <div style="background: ${badgeBg}; color: ${badgeText}; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 13px; text-transform: uppercase; display: flex; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <i class="fa-solid fa-triangle-exclamation" style="margin-right: 6px;"></i> ${alertObj.level}
                </div>
            </div>
        </div>
        
        <div style="padding: 25px; background: #ffffff;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; justify-content: space-between; color: #475569; font-size: 14px; grid-column: span 2;">
                    <div style="display: flex; align-items: center;">
                        <div style="width: 32px; height: 32px; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-right: 12px;"><i class="fa-solid fa-ship"></i></div>
                        <div>Nama Kapal <span style="font-weight: 600; color: #1e293b; margin-left: 8px; font-size: 15px;">${alertObj.ship}</span></div>
                    </div>
                    <div style="font-weight: 500; color: #475569;">${alertObj.imo}</div>
                </div>
                
                <div style="display: flex; align-items: center; color: #475569; font-size: 14px; grid-column: span 2;">
                    <div style="display: flex; align-items: center;">
                        <div style="width: 32px; height: 32px; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-right: 12px;"><i class="fa-solid fa-triangle-exclamation"></i></div>
                        <div>Jenis Gangguan <span style="font-weight: 600; color: #1e293b; margin-left: 8px; font-size: 15px;">${alertObj.jenis}</span></div>
                    </div>
                </div>

                <div style="display: flex; align-items: center; color: #475569; font-size: 14px; justify-content: space-between; grid-column: span 2;">
                    <div style="display: flex; align-items: center; flex: 1;">
                        <div style="width: 32px; height: 32px; background: #fff7ed; color: #f97316; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-right: 12px;"><i class="fa-regular fa-calendar-days"></i></div>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 12px; color: #64748b;">Waktu Terjadi</span>
                            <span style="font-weight: 600; color: #1e293b; font-size: 14px;">${alertObj.waktu} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 11px; margin-left: 4px; color: #94a3b8;"></i></span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; flex: 1; justify-content: flex-end;">
                        <i class="fa-regular fa-clock" style="margin-right: 8px;"></i> Durasi <span style="font-weight: 600; color: #1e293b; margin-left: 8px; font-size: 15px;">${durText}</span>
                    </div>
                </div>

                <div style="display: flex; align-items: center; color: #475569; font-size: 14px; justify-content: space-between; grid-column: span 2;">
                    <div style="display: flex; align-items: center; flex: 1;">
                        <div style="width: 32px; height: 32px; background: #eff6ff; color: #3b82f6; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-right: 12px;"><i class="fa-solid fa-bolt"></i></div>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 12px; color: #64748b;">Energi Terpakai</span>
                            <span style="font-weight: 600; color: #1e293b; font-size: 15px;">${energiTerpakai} kWh</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; flex: 1; justify-content: flex-end;">
                        <i class="fa-solid fa-arrow-trend-up" style="margin-right: 8px;"></i> Daya Rata-rata <span style="font-weight: 600; color: #1e293b; margin-left: 8px; font-size: 15px;">${dayaRata} kW</span>
                    </div>
                </div>
            </div>

            <h4 style="font-size: 16px; color: #1e293b; margin-bottom: 12px; font-weight: 700;">Detail Gangguan</h4>
            <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 25px;">
                <div style="color: ${colorText}; font-weight: bold; font-size: 14px; margin-bottom: 15px; display: flex; align-items: center; text-transform: uppercase;">
                    <i class="fa-solid ${warningIcon}" style="margin-right: 8px;"></i> ${alertObj.jenis.toUpperCase()} - HIGH POWER USAGE
                </div>
                <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 15px; display: flex; font-size: 14px;">
                    <span style="color: #64748b; width: 120px;">Penyebab</span>
                    <span style="color: #1e293b; font-weight: 500;">Daya kapal melebihi batas sistem</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px;">
                        <span style="color: #64748b;">Batas Maks</span>
                        <span style="color: #1e293b; font-weight: 600;">250 kW</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px;">
                        <span style="color: #64748b;">Reduksi Emisi CO2</span>
                        <span style="color: #1e293b; font-weight: 600;">${co2Reduksi} kg</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #64748b;">Daya Saat Ini</span>
                        <span style="color: #1e293b; font-weight: 600;">${dayaSaatIni} kW</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #64748b; display: flex; align-items: center;"><i class="fa-solid fa-bolt" style="color: #10b981; margin-right: 6px;"></i> Status PSC</span>
                        <span style="color: ${sttPscColor}; font-weight: 600;"><i class="fa-solid ${alertObj.status === 'Active' ? 'fa-circle-check' : 'fa-circle-xmark'}" style="margin-right: 4px;"></i> ${sttPscText}</span>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 15px; justify-content: space-between;">
                <button onclick="window.open('https://wa.me/6281334352191', '_blank')" style="flex: 1; padding: 14px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 600; color: #475569; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <i class="fa-solid fa-phone-volume" style="margin-right: 8px; color: #64748b; font-size: 16px;"></i> Hubungi Teknisi
                </button>
                ${!isResolved ? `
                <button onclick="animateResolve('${alertObj.id}')" style="flex: 1; padding: 14px; background: #16a34a; border: none; border-radius: 8px; font-weight: 600; color: white; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.2);" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                    <i class="fa-solid fa-circle-check" style="margin-right: 8px; font-size: 16px;"></i> Resolve
                </button>
                ` : `
                <button disabled style="flex: 1; padding: 14px; background: #cbd5e1; border: none; border-radius: 8px; font-weight: 600; color: white; display: flex; justify-content: center; align-items: center; cursor: not-allowed;">
                    <i class="fa-solid fa-check-double" style="margin-right: 8px; font-size: 16px;"></i> Resolved
                </button>
                `}
                <button onclick="animateStopPsc('${alertObj.imo}', '${alertObj.id}')" style="flex: 1; padding: 14px; background: #dc2626; border: none; border-radius: 8px; font-weight: 600; color: white; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">
                    <i class="fa-solid fa-power-off" style="margin-right: 8px; font-size: 16px;"></i> Stop PSC
                </button>
            </div>
        </div>
    `;

    document.getElementById("alertDetailModal").style.display = "flex";
}

function closeAlertDetail() {
    document.getElementById("alertDetailModal").style.display = "none";
}

function animateResolve(alertId) {
    showActionAnimation('resolve', () => {
        resolveAlert(alertId);
        closeAlertDetail();
    });
}

function animateStopPsc(imo, alertId) {
    showActionAnimation('stop-psc', () => {
        stopPsc(imo, alertId);
        closeAlertDetail();
    });
}

function showActionAnimation(type, callback) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; display: flex; justify-content: center; align-items: center; background: rgba(255,255,255,0.8); backdrop-filter: blur(4px); transition: opacity 0.3s;";
    
    let iconHTML = '';
    if (type === 'resolve') {
        iconHTML = `<div style="font-size: 80px; color: #16a34a; animation: bounceIn 0.5s ease-out both;"><i class="fa-solid fa-circle-check"></i></div>
                    <div style="margin-top: 20px; font-size: 24px; font-weight: bold; color: #16a34a; animation: fadeInUp 0.5s ease-out 0.2s both;">Berhasil Diatasi!</div>`;
    } else {
        iconHTML = `<div style="font-size: 80px; color: #dc2626; display: flex; align-items: center; justify-content: center; animation: shakeBreak 0.7s ease-out both;">
                        <i class="fa-solid fa-plug" style="transform: rotate(90deg);"></i>
                        <i class="fa-solid fa-bolt flash-bolt" style="color: #f59e0b; font-size: 40px; margin: 0 5px;"></i>
                        <i class="fa-solid fa-plug" style="transform: rotate(-90deg);"></i>
                    </div>
                    <div style="margin-top: 20px; font-size: 24px; font-weight: bold; color: #dc2626; animation: fadeInUp 0.5s ease-out 0.2s both;">Koneksi PSC Terputus!</div>`;
    }
    
    const content = document.createElement("div");
    content.style.cssText = "text-align: center; display: flex; flex-direction: column; align-items: center;";
    content.innerHTML = iconHTML;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    if (!document.getElementById("action-animations")) {
        const style = document.createElement("style");
        style.id = "action-animations";
        style.innerHTML = `
            @keyframes bounceIn {
                0% { opacity: 0; transform: scale(0.3); }
                50% { opacity: 1; transform: scale(1.05); }
                70% { transform: scale(0.9); }
                100% { transform: scale(1); }
            }
            @keyframes fadeInUp {
                0% { opacity: 0; transform: translateY(20px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes shakeBreak {
                0% { transform: translateX(0) scale(1); gap: 0px; }
                10%, 30%, 50% { transform: translateX(-10px) scale(1.1); gap: 0px; }
                20%, 40%, 60% { transform: translateX(10px) scale(1.1); gap: 0px; }
                70%, 100% { transform: translateX(0) scale(1.1); gap: 80px; }
            }
            .flash-bolt {
                animation: flash 0.3s infinite;
            }
            @keyframes flash {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        const bolt = overlay.querySelector('.flash-bolt');
        if (bolt) bolt.style.display = 'none';
    }, 400);

    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(overlay);
            callback();
        }, 300);
    }, 1500);
}
// ===============================
// ALERT MODAL
// ===============================
let alertTimeout;
function showAlert(alertObj) {
    const modal = document.getElementById("alertModal");
    if (!modal) return;
    
    let levelColor = "#ef4444";
    if (alertObj && alertObj.level === "Critical") levelColor = "#b91c1c";
    else if (alertObj && alertObj.level === "Medium") levelColor = "#f97316";
    else if (alertObj && alertObj.level === "Low") levelColor = "#eab308";
    
    const shipName = alertObj ? alertObj.ship : "Kapal";
    const jenis = alertObj ? alertObj.jenis : "Konsumsi daya tinggi";
    const IMO = alertObj ? alertObj.imo : "-";

    modal.innerHTML = `
        <div class="modal-content" style="border-left: 5px solid ${levelColor}; border-radius: 8px; width: 400px; max-width: 90%; background: white; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
            <h3 style="color: ${levelColor}; margin-bottom: 15px; font-size: 18px; display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fa-solid fa-triangle-exclamation" style="margin-right: 8px; font-size: 20px;"></i> Gangguan: ${alertObj ? alertObj.level : 'High'}</span>
                <button onclick="closeModal()" style="background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
            </h3>
            <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                <p style="margin-bottom: 5px;"><strong>Kapal:</strong> <span style="color: #0f172a; font-weight: 600;">${shipName}</span> (IMO: ${IMO})</p>
                <p style="margin-bottom: 10px;"><strong>Jenis:</strong> <span style="font-weight: 600; color: ${levelColor};">${jenis}</span></p>
                <p style="font-size: 13px; color: #64748b; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">Harap lakukan pengecekan pada menu Alert Monitoring untuk penanganan.</p>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button onclick="window.location.hash='alert'; closeModal();" style="flex: 1; padding: 10px; background: ${levelColor}; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; opacity: 0.9;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.9'">Lihat Detail Alert</button>
            </div>
        </div>
    `;

    modal.style.display = "flex";

    clearTimeout(alertTimeout);
    alertTimeout = setTimeout(() => {
        closeModal();
    }, 8000);
}

function closeModal() {
    const modal = document.getElementById("alertModal");
    if (modal) modal.style.display = "none";
}

// ===============================
// HISTORY
// ===============================
function addHistory(imo, value, connected) {
    const ship = ships.find(s => s.imo === imo);
    if (!ship) return;

    if (connected) {
        if (!activeSessions[imo]) {
            activeSessions[imo] = {
                id: "PSC-" + Date.now() + Math.floor(Math.random() * 100),
                startTime: new Date().toLocaleString(),
                dateOnly: new Date().toISOString().split("T")[0],
                ship: ship.name,
                imo: ship.imo,
                energy: 0,
                co2: 0,
                status: "Connected",
                operasi: "On The Move"
            };
        }
        activeSessions[imo].energy += value;
        activeSessions[imo].co2 = (activeSessions[imo].energy * 0.0027).toFixed(2);
    } else {
        if (activeSessions[imo]) {
            let session = activeSessions[imo];
            session.endTime = new Date().toLocaleString();
            session.status = "Disconnected";
            session.operasi = "Done";
            historyData.push(session);
            if (historyData.length > 300) historyData.shift();
            delete activeSessions[imo];
        }
    }
    
    // The simulation loop renders history dynamically in the background, 
    // but typically we should only re-render if we are on the page. We will let the tick handle it.
    renderHistory();
}

function renderHistory() {
    const tbody = document.getElementById("historyList");
    if (!tbody) return;

    const filterDate = document.getElementById("filterDate")?.value || "";
    const filterShipIMO = document.getElementById("filterShip")?.value || "";

    tbody.innerHTML = "";

    let totalEnergi = 0;
    let totalCO2 = 0;

    // Combine finished history and currently active sessions
    const activeDataArr = Object.values(activeSessions).map(s => ({...s, endTime: "Sedang Berjalan"}));
    const allHistoryData = [...historyData, ...activeDataArr];

    const filteredData = allHistoryData.filter(item => {
        const matchDate = !filterDate || item.dateOnly === filterDate;
        const matchShip = !filterShipIMO || item.imo === filterShipIMO;
        return matchDate && matchShip;
    });

    filteredData.forEach(item => {
        totalEnergi += Number(item.energy);
        totalCO2 += Number(item.co2);
    });

    // Display max 30 recent items
    filteredData.slice(-30).reverse().forEach((item, index) => {
        const row = document.createElement("tr");

        const badgeClass =
            item.status === "Connected"
                ? "badge-connected"
                : "badge-disconnected";

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.ship}</td>
            <td>${item.imo}</td>
            <td>${item.startTime || item.time}</td>
            <td>${item.endTime || "-"}</td>
            <td>${item.energy}</td>
            <td>${item.co2}</td>
            <td><span class="${badgeClass}">${item.status}</span></td>
        `;

        tbody.appendChild(row);
    });

    // Update Summary
    document.getElementById("totalTransaksi").innerText = filteredData.length;
    document.getElementById("totalEnergiHistory").innerText = totalEnergi.toLocaleString() + " kWh";
    document.getElementById("totalCO2History").innerText = totalCO2.toFixed(2) + " kg";

    // Populate Second Table (Disconnected Ships Only)
    const tbodyDisconnected = document.getElementById("historyDisconnectedList");
    if (tbodyDisconnected) {
        tbodyDisconnected.innerHTML = "";
        
        let disconnectIndex = 1;
        // historyData alone (without activeSessions) is our disconnected log
        const disconnectedData = historyData.filter(item => {
            const matchDate = !filterDate || item.dateOnly === filterDate;
            const matchShip = !filterShipIMO || item.imo === filterShipIMO;
            return matchDate && matchShip;
        });

        disconnectedData.slice(-30).reverse().forEach((item) => {
            const row = document.createElement("tr");
            
            row.innerHTML = `
                <td>${disconnectIndex++}</td>
                <td style="font-weight: 500; color: #0f172a;">${item.ship}</td>
                <td>${item.imo}</td>
                <td>${item.startTime || item.time || "-"}</td>
                <td>${item.endTime || "-"}</td>
                <td><span class="badge-disconnected">${item.status}</span></td>
            `;
            tbodyDisconnected.appendChild(row);
        });
    }
}
// ===============================
// PLANNING SANDAR
// ===============================
function addPlanning() {
    const name = document.getElementById("planShipName").value;
    const dermaga = document.getElementById("planDermaga").value;
    const date = document.getElementById("planDate").value;

    if (!name || !dermaga || !date) {
        if(typeof showToast === "function") showToast("Lengkapi data planning!", "error");
        else alert("Lengkapi data planning!");
        return;
    }

    // Format Date safely
    const formattedDate = date.replace("T", " ");

    planningData.push({ name, dermaga, date: formattedDate });

    document.getElementById("planShipName").value = "";
    document.getElementById("planDermaga").value = "";
    document.getElementById("planDate").value = "";
    
    saveDB();
    renderPlanningList();
}

function renderPlanningList() {
    const list = document.getElementById("planningList");
    if(!list) return;
    list.innerHTML = "";
    planningData.forEach((p, index) => {
        const li = document.createElement("li");
        li.className = "planning-card";
        li.innerHTML = `
            <div>
                <h4 style="color: #1e293b; margin-bottom: 5px; font-size: 16px;">${p.name}</h4>
                <p style="color: #64748b; font-size: 13px;"><i class="fa-solid fa-location-dot" style="margin-right: 5px;"></i> ${p.dermaga} &nbsp;|&nbsp; <i class="fa-regular fa-clock" style="margin-left: 5px; margin-right: 5px;"></i> ${p.date}</p>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <span class="planning-status">Scheduled</span>
                <button onclick="runPlanning(${index})" style="background: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;"><i class="fa-solid fa-play"></i> Run</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function runPlanning(index) {
    const p = planningData[index];
    if (!p) return;
    
    // Create new IMO dynamically
    const newImo = "7" + Math.floor(Math.random() * 1000000);
    const newShip = { name: p.name, type: "General Cargo", imo: newImo };
    
    // Add to ships top
    ships.unshift(newShip);
    
    // Initialize state
    shipStates[newImo] = { totalEnergy: 0, realtime: 0, connected: false };
    
    // Remove from planning queue
    planningData.splice(index, 1);
    
    saveDB();
    
    // Re-render
    renderPlanningList();
    renderShipList();
    renderReportShipList();
    renderHistoryShipFilter();
    
    if(typeof showToast === "function") {
        showToast("Kapal " + p.name + " berhasil dipindahkan ke antrean Monitoring.", "success");
    } else {
        alert("Kapal " + p.name + " berhasil dipindahkan ke antrean Monitoring.");
    }
}

// ===============================
// TOAST NOTIFICATION
// ===============================
let toastTimeout;
function showToast(message, type = "success") {
    const toast = document.getElementById("toastNotification");
    const msgEl = document.getElementById("toastMessage");
    const iconEl = document.getElementById("toastIcon");

    if (!toast || !msgEl || !iconEl) return;

    msgEl.innerText = message;

    if (type === "success") {
        toast.style.borderLeftColor = "#22c55e";
        iconEl.className = "fa-solid fa-circle-check";
        iconEl.style.color = "#22c55e";
    } else if (type === "error") {
        toast.style.borderLeftColor = "#ef4444";
        iconEl.className = "fa-solid fa-circle-exclamation";
        iconEl.style.color = "#ef4444";
    }

    toast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        closeToast();
    }, 4000);
}

function closeToast() {
    const toast = document.getElementById("toastNotification");
    if (toast) {
        toast.classList.remove("show");
    }
}

// ===============================
// DOWNLOAD REPORTS
// ===============================
function renderReportShipList(filter = "") {
    const container = document.getElementById("reportShipCardsContainer");
    if (!container) return;

    container.innerHTML = "";
    ships.forEach((ship, index) => {
        if (filter && !ship.name.toLowerCase().includes(filter) && !ship.imo.includes(filter)) {
            return; // Skip if filter doesn't match
        }

        const tr = document.createElement("tr");

        const aksiBtn = `
                <button onclick="downloadShipReport('${ship.imo}')" style="background: #0ea5e9; color: white; width: 32px; height: 32px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(14,165,233,0.2);">
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
        `;

        tr.innerHTML = `
            <td>${aksiBtn}</td>
            <td style="color: #64748b;">${ship.noPpk || "-"}</td>
            <td style="color: #64748b;">${ship.noPrc || "-"}</td>
            <td style="color: #64748b;">${ship.kegiatan || "-"}</td>
            <td style="color: #64748b;">${ship.type || "-"}</td>
            <td style="color: #64748b;">${ship.imo || "-"}</td>
            <td style="color: #64748b;">${ship.name || "-"}</td>
            <td style="color: #64748b;">${ship.grt || "-"}</td>
            <td style="color: #64748b;">${ship.loa || "-"}</td>
            <td style="color: #64748b;">${ship.voyage || "-"}</td>
        `;
        container.appendChild(tr);
    });
}

function renderHistoryShipFilter() {
    const filterShip = document.getElementById("filterShip");
    if (!filterShip) return;

    filterShip.innerHTML = '<option value="">Semua Kapal</option>';
    ships.forEach(ship => {
        const option = document.createElement("option");
        option.value = ship.imo;
        option.innerText = ship.name;
        filterShip.appendChild(option);
    });
}

function filterReportShips() {
    const input = document.getElementById("searchReportShip")?.value.toLowerCase() || "";
    renderReportShipList(input);
}

function downloadShipReport(imo) {
    const ship = ships.find(s => s.imo === imo);
    if (!ship) return;

    let totalEnergiKapal = 0;
    
    let csvData = "Waktu,Nama Kapal,IMO,Energi (kWh)\n";

    historyData.forEach(h => {
        if (h.imo === imo) {
            totalEnergiKapal += h.energy;
            csvData += `"${h.startTime || h.time}","${h.ship}","${h.imo}",${h.energy}\n`;
        }
    });

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Report_${ship.name.replace(/\s+/g, "_")}.csv`;
    link.click();
}

function downloadReport() {
    let csvData = "Waktu,Nama Kapal,IMO,Energi (kWh),Estimasi CO2 (kg)\n";

    historyData.forEach(h => {
        csvData += `"${h.startTime || h.time}","${h.ship}","${h.imo}",${h.energy},${(h.energy * 0.0027).toFixed(2)}\n`;
    });

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "PSC_Daily_Report.csv";
    link.click();
}

// ===============================
// LOGOUT
// ===============================
function logout() {
    localStorage.removeItem("isLogin");
    window.location.href = "login.html";
}