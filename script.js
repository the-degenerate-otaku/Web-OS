// Never knew I could type 90 lines of code in 50 mins that too js on a cup off coffee
let z = 10;
let nasaInterval = null;

function openWindow(id) {
    document.getElementById(id).classList.remove("hidden");

    // Check for 'window-nasa' (matches your HTML icon trigger)
    if (id === 'window-nasa') {
        fetchSpaceStationData();
        if (!nasaInterval) {
            nasaInterval = setInterval(fetchSpaceStationData, 5000); // Check every 5 seconds
        }
    }
}

function closeWindow(id) {
    document.getElementById(id).classList.add("hidden");

    if (id === 'window-nasa' && nasaInterval) {
        clearInterval(nasaInterval);
        nasaInterval = null;
    }
}

async function fetchSpaceStationData() {
    const container = document.getElementById('nasa-content');
    if (!container) return;

    try {
        const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        if (!response.ok) throw new Error('Uplink failure');
        const data = await response.json();

        // Cleared up the broken tags and matched your CSS classes cleanly!
        container.innerHTML = `
            <div class="telemetry-line">> SATELLITE ID: <span class="telemetry-val">${data.id} (ISS)</span></div>
            <div class="telemetry-line">> LATITUDE    : <span class="telemetry-val">${data.latitude.toFixed(4)}°</span></div>
            <div class="telemetry-line">> LONGITUDE   : <span class="telemetry-val">${data.longitude.toFixed(4)}°</span></div>
            <div class="telemetry-line">> VELOCITY    : <span class="telemetry-val">${Math.round(data.velocity)} km/h</span></div>
            <div class="telemetry-line">> ALTITUDE    : <span class="telemetry-val">${data.altitude.toFixed(2)} km</span></div>
            <div class="telemetry-line" style="color: #a6e3a1; margin-top: 15px; font-size:11px;">● LIVE SIGNAL STABLE</div>
        `;
    } catch (error) {
        container.innerHTML = '<p style="color: #f38ba8; font-family: monospace;">[ERROR] Uplink Lost. Retrying synchronization...</p>';
    }
}