// ===============================
// GLOBAL VARIABLES & AUTH
// ===============================
if (localStorage.getItem("isLogin") !== "true") {
    window.location.href = "login.html";
}

let dashboardChart;
let monitoringChart;
let totalEnergy = 0;
let historyData = [];
let planningData = [];
let alertData = [];
let shipStates = {};

// ===============================
// DATA KAPAL ASLI
// ===============================
const ships = [
    { name: "MT SK LINE 1", type: "Oil Tanker", imo: "9705940" },
    { name: "MT NONI T", type: "Oil Tanker", imo: "9520754" },
    { name: "MT ACCORD", type: "Oil Tanker", imo: "9274020" },
    { name: "MP MR TANKER 1", type: "Chemical/Oil", imo: "9472763" },
    { name: "MT SHOKAI", type: "Oil & Chemical", imo: "9940710" },
    { name: "BUNGA KELANA 10", type: "Oil Tanker", imo: "9292981" }
];

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

function showPage(pageId) {
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
}

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
        let activeConnections = 0;

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

            // ADD TO HISTORY BACKGROUND
            addHistory(ship.imo, value, connected);
        });

        // UPDATE UI FOR SELECTED SHIP
        if (selectedIMO !== "-" && shipStates[selectedIMO]) {
            const current = shipStates[selectedIMO];
            const value = current.realtime;
            const isConnected = current.connected;

            // UPDATE REALTIME CARD
            const realtime = document.getElementById("realtimeEnergy");
            if (realtime) realtime.innerText = value + " kWh";

            // AKUMULASI
            totalEnergy = current.totalEnergy;
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

            // DASHBOARD CHART
            if (dashboardChart) {
                dashboardChart.data.labels.push("");
                dashboardChart.data.datasets[0].data.push(totalEnergy);
                if (dashboardChart.data.labels.length > 20) {
                    dashboardChart.data.labels.shift();
                    dashboardChart.data.datasets[0].data.shift();
                }
                dashboardChart.update();
            }

            // MONITORING CHART
            if (monitoringChart) {
                monitoringChart.data.labels.push("");
                monitoringChart.data.datasets[0].data.push(value);
                if (monitoringChart.data.labels.length > 20) {
                    monitoringChart.data.labels.shift();
                    monitoringChart.data.datasets[0].data.shift();
                }
                monitoringChart.update();
            }

            // ALERT CONDITION
            if (value > 240) {
                generateAlert(value, selectedIMO);
                showAlert();
            }

            // UPDATE DASHBOARD ALERT COUNT
            const dashAlertCount = document.getElementById("alertCount");
            if (dashAlertCount) {
                const activeAlertsForShip = alertData.filter(a => a.imo === selectedIMO && a.status === "Active").length;
                dashAlertCount.innerText = activeAlertsForShip;
            }
        }

        // UPDATE GLOBAL KAPAL TERHUBUNG & GLOBAL EMISI
        const kapalTerhubung = document.getElementById("kapalTerhubung");
        if (kapalTerhubung) kapalTerhubung.innerText = activeConnections + " Kapal";
        const globalKapalTerhubung = document.getElementById("globalKapalTerhubung");
        if (globalKapalTerhubung) globalKapalTerhubung.innerText = activeConnections;

        let totalGlobalEnergy = 0;
        Object.values(shipStates).forEach(state => {
            totalGlobalEnergy += state.totalEnergy;
        });

        const globalCO2Saved = document.getElementById("globalCO2Saved");
        if (globalCO2Saved) {
            const globalCO2 = (totalGlobalEnergy * 0.0027).toFixed(2);
            globalCO2Saved.innerText = globalCO2 + " kg";
        }

        // Re-render ship list periodically to update status dots
        renderShipList();

    }, 3000);
}

function generateAlert(value, imo) {
    const ship = ships.find(s => s.imo === imo);
    if (!ship) return;

    let level = "";
    let jenis = "";

    if (value > 260) {
        level = "Critical";
        jenis = "Overload Critical";
    } else if (value > 240) {
        level = "High";
        jenis = "High Power Usage";
    } else if (value > 220) {
        level = "Medium";
        jenis = "Abnormal Usage";
    } else {
        return; // no alert
    }

    const alertItem = {
        id: "ALT-" + Date.now(),
        ship: ship.name,
        imo: ship.imo,
        jenis: jenis,
        level: level,
        status: "Active"
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

        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.ship}</td>
            <td>${item.imo}</td>
            <td>${item.jenis}</td>
            <td class="level-${item.level.toLowerCase()}">${item.level}</td>
            <td>${item.status}</td>
        `;

        tbody.appendChild(row);
    });

    document.getElementById("totalAlert").innerText = alertData.length;
    document.getElementById("criticalAlert").innerText = criticalCount;
    document.getElementById("activeAlert").innerText = activeCount;
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

    const historyItem = {
        id: "PSC-" + Date.now() + Math.floor(Math.random() * 100),
        time: new Date().toLocaleString(),
        dateOnly: new Date().toISOString().split("T")[0],
        ship: ship.name,
        imo: ship.imo,
        energy: value,
        co2: (value * 0.0027).toFixed(2),
        status: connected ? "Connected" : "Disconnected",
        operasi: connected ? "On The Move" : "Done"
    };

    historyData.push(historyItem);

    // Prevent the array from growing infinitely and crashing memory
    if (historyData.length > 300) {
        historyData.shift();
    }

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

    const filteredData = historyData.filter(item => {
        const matchDate = !filterDate || item.dateOnly === filterDate;
        const matchShip = !filterShipIMO || item.imo === filterShipIMO;
        return matchDate && matchShip;
    });

    filteredData.forEach(item => {
        totalEnergi += Number(item.energy);
        totalCO2 += Number(item.co2);
    });

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
            <td>${item.time}</td>
            <td>${item.energy}</td>
            <td>${item.co2}</td>
            <td><span class="${badgeClass}">${item.status}</span></td>
        `;

        tbody.appendChild(row);
    });

    // Update Summary
    document.getElementById("totalTransaksi").innerText = filteredData.length;
    document.getElementById("totalEnergiHistory").innerText = totalEnergi + " kWh";
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
        alert("Lengkapi data planning!");
        return;
    }

    planningData.push({ name, dermaga, date });

    const list = document.getElementById("planningList");
    list.innerHTML = "";

    planningData.forEach(p => {
        const li = document.createElement("li");
        li.innerText = `${p.name} - ${p.dermaga} - ${p.date}`;
        list.appendChild(li);
    });

    document.getElementById("planShipName").value = "";
    document.getElementById("planDate").value = "";
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
        tr.style.borderBottom = "1px solid #f1f5f9";

        tr.innerHTML = `
            <td style="padding: 12px;">${index + 1}</td>
            <td style="padding: 12px; font-weight: 600;">${ship.name}</td>
            <td style="padding: 12px;">${ship.imo}</td>
            <td style="padding: 12px;">${ship.type}</td>
            <td style="padding: 12px; text-align: center;">
                <button onclick="downloadShipReport('${ship.imo}')" style="background: #10b981; color: white; padding: 6px 12px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;">
                    Unduh
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