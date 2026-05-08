const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api';

let token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    loadDashboard();
});

async function loadDashboard() {
    try {
        const [profileRes, statsRes] = await Promise.all([
            fetch(`${API_URL}/dashboard/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_URL}/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        if (!profileRes.ok || !statsRes.ok) {
            if (profileRes.status === 401 || statsRes.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'index.html';
                return;
            }
            throw new Error('Failed to load dashboard');
        }

        const profile = await profileRes.json();
        const stats = await statsRes.json();

        document.getElementById('userName').textContent = profile.user.name;
        document.getElementById('greetingText').textContent = `Welcome back, ${profile.user.name}!`;

        document.getElementById('totalLeads').textContent = stats.stats.totalLeads;
        document.getElementById('qualifiedLeads').textContent = stats.stats.qualifiedLeads;
        document.getElementById('todayAppointments').textContent = stats.stats.todayAppointments;
        document.getElementById('upcomingAppointments').textContent = stats.stats.upcomingAppointments;

        const recentLeadsEl = document.getElementById('recentLeads');
        if (stats.recentLeads.length > 0) {
            recentLeadsEl.innerHTML = stats.recentLeads.map(lead => `
                <div class="lead-item">
                    <div class="lead-info">
                        <h4>${lead.name || 'Unknown'}</h4>
                        <p>${lead.service_type || 'No service specified'} - ${lead.phone}</p>
                    </div>
                    <span class="lead-status ${lead.status}">${lead.status}</span>
                </div>
            `).join('');
        }

        const upcomingEl = document.getElementById('upcomingList');
        if (stats.upcomingAppointments.length > 0) {
            upcomingEl.innerHTML = stats.upcomingAppointments.map(appt => `
                <div class="appointment-item">
                    <div class="appt-info">
                        <h4>${appt.client_name}</h4>
                        <p>${appt.service_type} - ${appt.address || 'No address'}</p>
                    </div>
                    <div class="appt-time">
                        <div class="date">${appt.date}</div>
                        <div class="time">${appt.time}</div>
                    </div>
                </div>
            `).join('');
        }

        const businessNumber = profile.user.twilio_number || 'Not assigned';
        document.getElementById('businessNumber').textContent = businessNumber;

        const setupComplete = profile.user.setup_status === 'complete';
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        if (setupComplete) {
            statusDot.classList.add('active');
            statusText.textContent = 'Active';
            document.getElementById('setupBanner').style.display = 'none';
        } else {
            statusDot.classList.remove('active');
            statusText.textContent = 'Setup Required';
            document.getElementById('setupBanner').style.display = 'block';
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}
