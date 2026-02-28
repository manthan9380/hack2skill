/* Traffic AI Analyzer — Frontend Logic */

// ─── DOM References ──────────────────────────────────────────────
const imageInput = document.getElementById('imageInput');
const uploadZone = document.getElementById('uploadZone');
const uploadContent = document.getElementById('uploadContent');
const previewWrapper = document.getElementById('previewWrapper');
const preview = document.getElementById('preview');
const browseBtn = document.getElementById('browseBtn');
const changeImageBtn = document.getElementById('changeImageBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const btnText = analyzeBtn.querySelector('.btn-text');
const btnLoading = analyzeBtn.querySelector('.btn-loading');
const errorMsg = document.getElementById('errorMsg');
const errorText = document.getElementById('errorText');
const resultsSection = document.getElementById('resultsSection');
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');

// Metric value elements
const vehiclesValue = document.getElementById('vehiclesValue');
const co2Value = document.getElementById('co2Value');
const greenValue = document.getElementById('greenValue');
const energyValue = document.getElementById('energyValue');
const energyBarFill = document.getElementById('energyBarFill');
const energyBarPct = document.getElementById('energyBarPct');

// Breakdown elements
const carCount = document.getElementById('carCount');
const motoCount = document.getElementById('motoCount');
const busCount = document.getElementById('busCount');
const truckCount = document.getElementById('truckCount');

// ─── Drag and Drop ───────────────────────────────────────────────
uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImageFile(file);
});

// Click on zone (not on a button) triggers file input
uploadZone.addEventListener('click', e => {
    if (e.target === browseBtn || e.target === changeImageBtn || e.target.closest('.change-btn')) return;
    if (!previewWrapper.classList.contains('hidden')) return; // already showing preview
    imageInput.click();
});
browseBtn.addEventListener('click', e => {
    e.stopPropagation();
    imageInput.click();
});
changeImageBtn.addEventListener('click', e => {
    e.stopPropagation();
    imageInput.click();
});

imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) loadImageFile(file);
});

function loadImageFile(file) {
    const reader = new FileReader();
    reader.onload = ev => {
        preview.src = ev.target.result;
        uploadContent.classList.add('hidden');
        previewWrapper.classList.remove('hidden');
        analyzeBtn.disabled = false;
        hideError();
        resultsSection.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// ─── Analyze ─────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
    const file = imageInput.files[0];
    if (!file) return;

    setLoading(true);
    hideError();
    resultsSection.classList.add('hidden');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let msg = `Server error (${response.status})`;
            try {
                const err = await response.json();
                msg = err.error || err.details || msg;
            } catch (_) { }
            throw new Error(msg);
        }

        const data = await response.json();
        renderResults(data);
    } catch (err) {
        showError(err.message);
        console.error('Analysis error:', err);
    } finally {
        setLoading(false);
    }
});

// ─── Loading State ────────────────────────────────────────────────
function setLoading(on) {
    analyzeBtn.disabled = on;
    btnText.classList.toggle('hidden', on);
    btnLoading.classList.toggle('hidden', !on);
}

// ─── Error Display ────────────────────────────────────────────────
function showError(msg) {
    errorText.textContent = msg;
    errorMsg.classList.remove('hidden');
}
function hideError() {
    errorMsg.classList.add('hidden');
}

// ─── Results Rendering ────────────────────────────────────────────
function renderResults(data) {
    // Animate counters
    animateCount(vehiclesValue, data.vehicles_detected, 0);
    animateCount(co2Value, data.co2_rate_g_per_min, 0);
    animateCount(greenValue, data.green_signal_time_seconds, 0);
    animateCount(energyValue, data.energy_score_percent, 0);

    // Energy bar
    const pct = Math.min(100, Math.max(0, data.energy_score_percent));
    energyBarPct.textContent = pct + '%';
    // Use rAF to trigger CSS transition
    requestAnimationFrame(() => {
        energyBarFill.style.width = '0%';
        requestAnimationFrame(() => {
            energyBarFill.style.width = pct + '%';
        });
    });

    // Status badge
    const s = (data.system_status || 'NORMAL').toUpperCase();
    statusText.textContent = s;
    statusBadge.className = 'status-badge';
    if (s === 'CLEAR') statusBadge.classList.add('status-clear');
    else if (s === 'NORMAL') statusBadge.classList.add('status-normal');
    else if (s === 'MODERATE') statusBadge.classList.add('status-moderate');
    else if (s === 'CONGESTED') statusBadge.classList.add('status-congested');

    // Breakdown
    const bd = data.vehicle_breakdown || {};
    carCount.textContent = bd.car ?? 0;
    motoCount.textContent = bd.motorcycle ?? 0;
    busCount.textContent = bd.bus ?? 0;
    truckCount.textContent = bd.truck ?? 0;

    // Show section
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Animated Counter ────────────────────────────────────────────
function animateCount(el, target, decimals = 0) {
    const duration = 900;
    const start = performance.now();
    const from = 0;

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const value = from + (target - from) * ease;
        el.textContent = value.toFixed(decimals);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(step);
}
