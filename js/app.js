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
    { name: "MT SK LINE 1", type: "Oil Tanker", imo: "9705940" },
    { name: "MT NONI T", type: "Oil Tanker", imo: "9520754" },
    { name: "MT ACCORD", type: "Oil Tanker", imo: "9274020" },
    { name: "MP MR TANKER 1", type: "Chemical/Oil", imo: "9472763" },
    { name: "MT SHOKAI", type: "Oil & Chemical", imo: "9940710" },
    { name: "BUNGA KELANA 10", type: "Oil Tanker", imo: "9292981" }
];

let ships = JSON.parse(localStorage.getItem("psc_ships")) || defaultShips;
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

        // Load total energy for the selected ship
        if (!shipStates[imo]) {
            shipStates[imo] = { totalEnergy: 0, realtime: 0, connected: false };
        }
        totalEnergy = shipStates[imo].totalEnergy;
        document.getElementById("totalEnergy").innerText = totalEnergy.toLocaleString() + " kWh";
        document.getElementById("co2Saved").innerText = (totalEnergy * 0.0027).toFixed(2) + " kg";

        // Optional: Ensure chart smoothly transitions instead of jumping
        // Since active connection handles pushing new data each tick, switching ship
        // implicitly continues chart data (it won't clear history)

        selectedShipImo = imo; // Save selected ship ID
        renderShipList(); // Re-render to show active stylistic state

        // Removed showPage('dashboard') since we are already on that layout
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
                animation: false
            }
        });
    }

    // Initialize Ship List
    renderShipList();
    renderReportShipList();
    setTimeout(renderHistoryShipFilter, 500); // delay to ensure history component loaded

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

        ships.forEach(ship => {
            const value = Math.floor(Math.random() * 50) + 200;
            const connected = value > 210;

            if (connected) activeConnections++;

            if (!shipStates[ship.imo]) {
                shipStates[ship.imo] = { totalEnergy: 0, realtime: 0, connected: false };
            }

            shipStates[ship.imo].realtime = value;
            shipStates[ship.imo].connected = connected;

            if (connected) {
                shipStates[ship.imo].totalEnergy += value;
            }

            // Increment global sums
            globalRealtimeSum += value;
            globalTotalEnergySum += shipStates[ship.imo].totalEnergy;

            // ADD TO HISTORY BACKGROUND
            addHistory(ship.imo, value, connected);

            // ALERT CONDITION FOR EVERY SHIP
            if (value > 240) {
                generateAlert(value, ship.imo);
            }
        });

        // UPDATE UI FOR GLOBAL DASHBOARD
        const kapalTerhubung = document.getElementById("kapalTerhubung");
        if (kapalTerhubung) kapalTerhubung.innerText = activeConnections + " Kapal";

        const totalKapalEl = document.getElementById("globalTotalKapal");
        if (totalKapalEl) totalKapalEl.innerText = ships.length;

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
            if (pscStatus && pscStatusIndicator) {
                if (isConnected) {
                    pscStatus.innerText = "Connected";
                    pscStatusIndicator.className = "success";
                    pscStatusIndicator.innerText = "Aman";
                    pscStatusIndicator.style.background = "#def7ec";
                    pscStatusIndicator.style.color = "#03543f";
                } else {
                    pscStatus.innerText = "Disconnected";
                    pscStatusIndicator.className = "danger";
                    pscStatusIndicator.innerText = "Bahaya";
                    pscStatusIndicator.style.background = "#fde8e8";
                    pscStatusIndicator.style.color = "#9b1c1c";
                }
            }

            // MONITORING CHART FOR LOCAL SHIP
            if (monitoringChart) {
                monitoringChart.data.labels.push("");
                monitoringChart.data.datasets[0].data.push(value);
                if (monitoringChart.data.labels.length > 20) {
                    monitoringChart.data.labels.shift();
                    monitoringChart.data.datasets[0].data.shift();
                }
                monitoringChart.update();
            }

            // POPUP ALERT CONDITION
            if (value > 240) {
                showAlert();
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
}

function renderAlert() {

    const tbody = document.getElementById("alertList");
    if (!tbody) return;

    tbody.innerHTML = "";

    let criticalCount = 0;
    let activeCount = 0;

    alertData.slice(-20).reverse().forEach(item => {

        if (item.level === "Critical") criticalCount++;
        if (item.status === "Active") activeCount++;

        const row = document.createElement("tr");

        let levelStyle = "font-weight: 600; ";
        if (item.level === "Critical") levelStyle += "color: #7f1d1d;";
        else if (item.level === "High") levelStyle += "color: #dc2626;";
        else if (item.level === "Medium") levelStyle += "color: #ea580c;";
        else if (item.level === "Low") levelStyle += "color: #ca8a04;";

        const durationMs = Date.now() - (item.startTimeMs || Date.now());
        const durHours = Math.floor(durationMs / 3600000);
        const durText = durHours > 0 ? `${durHours} Jam` : `< 1 Jam`;

        let levelIcon = "";
        if (item.level === "Low") levelIcon = "🟡";
        if (item.level === "Medium") levelIcon = "🟠";
        if (item.level === "High") levelIcon = "🔴";
        if (item.level === "Critical") levelIcon = "🚨"; // Customize mark

        row.innerHTML = `
            <td>${item.id}</td>
            <td><span style="font-weight: 600; color: #1e293b;">${item.ship}</span></td>
            <td>${item.imo}</td>
            <td>${item.jenis}</td>
            <td style="${levelStyle}">${levelIcon} ${item.level}</td>
            <td>${item.waktu || "-"}</td>
            <td>${item.status === "Active" ? durText : "-"}</td>
            <td>
                <button onclick="openAlertDetail('${item.id}')" style="background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; color: #475569; font-size: 12px; font-weight: 600;"><i class="fa-solid fa-eye" style="margin-right: 4px;"></i> Detail</button>
            </td>
        `;

        tbody.appendChild(row);
    });

    document.getElementById("totalAlert").innerText = alertData.length;
    document.getElementById("criticalAlert").innerText = criticalCount;
    document.getElementById("activeAlert").innerText = activeCount;
}

function openAlertDetail(id) {
    const alertObj = alertData.find(a => a.id === id);
    if (!alertObj) return;
    
    document.getElementById("alertDetailContent").innerHTML = `
        <p><strong>ID Alert:</strong> ${alertObj.id}</p>
        <p><strong>Waktu Kejadian:</strong> ${alertObj.waktu || "-"}</p>
        <p><strong>Kapal:</strong> ${alertObj.ship} (IMO: ${alertObj.imo})</p>
        <p><strong>Level:</strong> <span style="font-weight: bold;">${alertObj.level}</span></p>
        <p><strong>Jenis Gangguan:</strong> ${alertObj.jenis}</p>
        <br>
        <p style="background: #f8fafc; padding: 10px; border-radius: 6px;">Detail teknis untuk gangguan <strong>${alertObj.jenis}</strong> pada sistem ${alertObj.ship}. Harap melakukan pengecekan pada panel PSC secepatnya.</p>
    `;
    document.getElementById("alertDetailModal").style.display = "block";
}

function closeAlertDetail() {
    document.getElementById("alertDetailModal").style.display = "none";
}
// ===============================
// ALERT MODAL
// ===============================
let alertTimeout;
function showAlert() {
    const modal = document.getElementById("alertModal");
    if (modal && modal.style.display !== "block") {
        modal.style.display = "block";

        clearTimeout(alertTimeout);
        alertTimeout = setTimeout(() => {
            closeModal();
        }, 5000);
    }
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

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="font-weight: 600; color: #1e293b;">${ship.name}</td>
            <td>${ship.imo}</td>
            <td>${ship.type}</td>
            <td style="text-align: center;">
                <button onclick="downloadShipReport('${ship.imo}')" style="background: #10b981; color: white; padding: 6px 12px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s;">
                    <i class="fa-solid fa-download" style="margin-right: 5px;"></i> Unduh
                </button>
            </td>
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
    let detailHistory = "";

    historyData.forEach(h => {
        if (h.imo === imo) {
            totalEnergiKapal += h.energy;
            detailHistory += `${h.time} - ${h.energy} kWh\n`;
        }
    });

    let report = `PSC ENERGY REPORT: ${ship.name} (IMO: ${ship.imo})\n\n`;
    report += "Total Energi: " + totalEnergiKapal + " kWh\n";
    report += "Estimasi CO2: " + (totalEnergiKapal * 0.0027).toFixed(2) + " kg\n\n";
    report += "Detail History:\n" + (detailHistory || "Tidak ada data riwayat.");

    const blob = new Blob([report], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Report_${ship.name.replace(/\s+/g, "_")}.txt`;
    link.click();
}

function downloadReport() {

    let report = "PSC DAILY ENERGY REPORT\n\n";
    report += "Total Energi: " + totalEnergy + " kWh\n";
    report += "Estimasi CO2: " + (totalEnergy * 0.0027).toFixed(2) + " kg\n\n";
    report += "Detail History:\n";

    historyData.forEach(h => {
        report += `${h.time} - ${h.ship} (IMO: ${h.imo}) - ${h.energy} kWh\n`;
    });

    const blob = new Blob([report], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "PSC_Daily_Report.txt";
    link.click();
}

// ===============================
// LOGOUT
// ===============================
function logout() {
    localStorage.removeItem("isLogin");
    window.location.href = "login.html";
}