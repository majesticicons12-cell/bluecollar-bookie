const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api';

let token = localStorage.getItem('token');
let currentCarrier = null;
let selectedMethod = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    checkSetupStatus();
    initEventListeners();
});

function initEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    document.getElementById('assignNumberBtn').addEventListener('click', assignNumber);

    document.querySelectorAll('.carrier-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.carrier-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            currentCarrier = btn.dataset.carrier;
            loadInstructions();
        });
    });

    document.getElementById('copyNumberBtn').addEventListener('click', copyNumber);
    document.getElementById('forwardingDoneBtn').addEventListener('click', () => goToStep(3));
    document.getElementById('testCallBtn').addEventListener('click', sendTestCall);
    document.getElementById('testSuccessBtn').addEventListener('click', () => confirmTest(true));
    document.getElementById('testFailBtn').addEventListener('click', () => confirmTest(false));
    document.getElementById('retryTestBtn').addEventListener('click', () => {
        document.getElementById('troubleshootingPanel').style.display = 'none';
        document.getElementById('testResult').style.display = 'none';
        document.getElementById('testCallBtn').style.display = '';
    });
    document.getElementById('retryBtn').addEventListener('click', checkSetupStatus);
}

async function checkSetupStatus() {
    try {
        const res = await fetch(`${API_URL}/numbers/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to check status');

        const data = await res.json();

        if (data.complete) {
            showStep('stepComplete');
        } else if (data.status === 'Needs Forwarding' || data.status === 'Number Assigned') {
            goToStep(2);
            await loadNumberInfo();
        } else if (data.status === 'Testing') {
            goToStep(3);
        } else {
            goToStep(1);
        }
    } catch (error) {
        console.error('Status check error:', error);
        showStep('stepError');
        document.getElementById('errorMessage').textContent = 'Could not load setup status. Please refresh.';
    }
}

async function loadNumberInfo() {
    try {
        const res = await fetch(`${API_URL}/numbers/info`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load number info');

        const data = await res.json();
        document.getElementById('twilioNumber').textContent = data.number || 'Loading...';
    } catch (error) {
        console.error('Load number error:', error);
    }
}

async function assignNumber() {
    showStep('stepLoading');

    try {
        const areaCode = document.getElementById('areaCode').value || null;

        const res = await fetch(`${API_URL}/numbers/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ areaCode })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to assign number');
        }

        document.getElementById('twilioNumber').textContent = data.number;
        goToStep(2);
    } catch (error) {
        console.error('Assign number error:', error);
        showStep('stepError');
        document.getElementById('errorMessage').textContent = error.message;
    }
}

async function loadInstructions() {
    if (!currentCarrier) return;

    try {
        const res = await fetch(`${API_URL}/numbers/instructions?carrier=${currentCarrier}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load instructions');

        const data = await res.json();

        const listEl = document.getElementById('instructionsList');
        listEl.innerHTML = '';

        data.instructions.forEach(section => {
            section.steps.forEach(step => {
                const stepEl = document.createElement('div');
                stepEl.className = 'instruction-step';
                stepEl.innerHTML = `
                    <span class="step-icon">${step.icon}</span>
                    <span class="step-text">${step.text}</span>
                `;
                listEl.appendChild(stepEl);
            });
        });

        const tipCode = document.querySelector('.tip-card code');
        if (tipCode) {
            tipCode.textContent = `*61*${data.twilioNumber}#`;
        }

        document.getElementById('instructionsPanel').style.display = 'block';
        document.getElementById('forwardingDoneBtn').style.display = 'block';
    } catch (error) {
        console.error('Load instructions error:', error);
    }
}

function copyNumber() {
    const number = document.getElementById('twilioNumber').textContent;
    navigator.clipboard.writeText(number).then(() => {
        const btn = document.getElementById('copyNumberBtn');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy Number'; }, 2000);
    });
}

async function sendTestCall() {
    const btn = document.getElementById('testCallBtn');
    btn.disabled = true;
    btn.textContent = 'Calling...';

    try {
        const res = await fetch(`${API_URL}/numbers/test-call`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to send test call');
        }

        btn.style.display = 'none';
        document.getElementById('testResult').style.display = 'block';
    } catch (error) {
        console.error('Test call error:', error);
        btn.disabled = false;
        btn.textContent = 'Send Test Call';
        alert(error.message);
    }
}

async function confirmTest(success) {
    try {
        const res = await fetch(`${API_URL}/numbers/test-confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ success })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to confirm test');
        }

        if (success) {
            goToStep(4);
            await loadSummary();
        } else {
            document.getElementById('troubleshootingPanel').style.display = 'block';
            const listEl = document.getElementById('troubleshootingList');
            listEl.innerHTML = '';
            data.troubleshooting.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                listEl.appendChild(li);
            });
            document.getElementById('testResult').style.display = 'none';
        }
    } catch (error) {
        console.error('Confirm test error:', error);
        alert(error.message);
    }
}

async function loadSummary() {
    try {
        const res = await fetch(`${API_URL}/numbers/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            document.getElementById('summaryNumber').textContent = data.number || '-';
        }
    } catch (error) {
        console.error('Load summary error:', error);
    }
}

function goToStep(step) {
    document.querySelectorAll('.setup-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');

    document.querySelectorAll('.progress-step').forEach(el => {
        const stepNum = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (stepNum === step) el.classList.add('active');
        if (stepNum < step) el.classList.add('completed');
    });
}

function showStep(stepId) {
    document.querySelectorAll('.setup-step').forEach(el => el.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}
