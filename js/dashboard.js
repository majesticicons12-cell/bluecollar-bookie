const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api';

const PANEL_TITLES = {
    dashboard: 'Dashboard',
    leads: 'Leads',
    appointments: 'Appointments',
    settings: 'Settings',
    admin: 'Admin Panel'
};

let token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Sidebar nav
    document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
        item.addEventListener('click', () => {
            const panel = item.dataset.panel;
            switchPanel(panel);
            // Close mobile sidebar
            document.getElementById('sidebar').classList.remove('open');
        });
    });

    // Mobile toggle
    document.getElementById('mobileToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    // Save profile
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);

    // Lead search
    document.getElementById('leadSearch').addEventListener('input', loadLeads);
    document.getElementById('leadStatusFilter').addEventListener('change', loadLeads);

    // Appt filter
    document.getElementById('apptStatusFilter').addEventListener('change', loadAppointments);

    loadAll();
});

function switchPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item[data-panel]').forEach(n => n.classList.remove('active'));
    const panel = document.getElementById('panel-' + name);
    if (panel) panel.classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-panel="${name}"]`);
    if (navItem) navItem.classList.add('active');
    document.getElementById('panelTitle').textContent = PANEL_TITLES[name] || name;
}

async function loadAll() {
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
            throw new Error('Failed to load');
        }

        const profile = await profileRes.json();
        const stats = await statsRes.json();
        renderDashboard(profile.user, stats);
        renderSettings(profile.user);
    } catch (error) {
        console.error('Load error:', error);
    }
}

function renderDashboard(user, stats) {
    // Sidebar
    document.getElementById('sidebarAvatar').textContent = (user.name || 'U')[0].toUpperCase();
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserPlan').textContent = (user.plan || 'pro').toUpperCase();

    // Stats
    document.getElementById('totalLeads').textContent = stats.stats.totalLeads;
    document.getElementById('qualifiedLeads').textContent = stats.stats.qualifiedLeads;
    document.getElementById('todayAppointments').textContent = stats.stats.todayAppointments;
    document.getElementById('upcomingAppointments').textContent = stats.stats.upcomingAppointments;

    // Recent leads
    const recentEl = document.getElementById('recentLeads');
    if (stats.recentLeads.length > 0) {
        recentEl.innerHTML = stats.recentLeads.map(lead => `
            <div class="lead-item">
                <div class="lead-info">
                    <h4>${lead.name || 'Unknown'}</h4>
                    <p>${lead.service_type || 'No service'} - ${lead.phone}</p>
                </div>
                <span class="lead-status ${lead.status}">${lead.status}</span>
            </div>
        `).join('');
    }

    // Upcoming appointments
    const upcomingEl = document.getElementById('upcomingList');
    if (stats.upcomingAppointments.length > 0) {
        upcomingEl.innerHTML = stats.upcomingAppointments.map(appt => `
            <div class="appointment-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--gray-100);">
                <div class="appt-info">
                    <h4>${appt.client_name}</h4>
                    <p>${appt.service_type}${appt.address ? ' - ' + appt.address : ''}</p>
                </div>
                <div class="appt-time" style="text-align:right;">
                    <div class="date" style="font-weight:600;color:var(--dark);font-size:0.9rem;">${appt.date}</div>
                    <div class="time" style="color:var(--gray-500);font-size:0.8rem;">${appt.time}</div>
                </div>
            </div>
        `).join('');
    }

    // Business number
    const businessNumber = user.twilio_number || 'Not assigned';
    document.getElementById('businessNumber').textContent = businessNumber;

    const setupComplete = user.setup_status === 'complete';
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

    // Admin nav
    if (user.role === 'admin') {
        document.getElementById('adminNavItem').style.display = 'flex';
    }

    // Load leads and appointments for their panels
    loadLeads();
    loadAppointments();
}

function renderSettings(user) {
    document.getElementById('settingsName').value = user.name || '';
    document.getElementById('settingsEmail').value = user.email || '';
    document.getElementById('settingsPhone').value = user.phone || '';
    document.getElementById('settingsBusiness').value = user.business_name || '';

    const planNames = { basic: 'Basic Plan', pro: 'Pro Plan', premium: 'Premium Plan' };
    const planDescs = { basic: 'Up to 50 leads/month', pro: 'Up to 200 leads/month', premium: 'Unlimited leads' };
    document.getElementById('settingsPlanName').textContent = planNames[user.plan] || 'Pro Plan';
    document.getElementById('settingsPlanDesc').textContent = planDescs[user.plan] || 'Access to all features';

    const setupStatuses = {
        not_started: 'Setup not started',
        needs_forwarding: 'Call forwarding needed',
        testing: 'Testing in progress',
        complete: 'Complete'
    };
    document.getElementById('settingsSetupStatus').textContent = setupStatuses[user.setup_status] || user.setup_status;
}

async function saveProfile() {
    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await fetch(`${API_URL}/dashboard/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: document.getElementById('settingsName').value,
                phone: document.getElementById('settingsPhone').value,
                business_name: document.getElementById('settingsBusiness').value
            })
        });

        if (res.ok) {
            alert('Profile updated!');
            loadAll();
        } else {
            alert('Failed to save');
        }
    } catch (e) {
        alert('Network error');
    }

    btn.disabled = false;
    btn.textContent = 'Save Changes';
}

async function loadLeads() {
    const search = document.getElementById('leadSearch').value;
    const status = document.getElementById('leadStatusFilter').value;
    let url = `${API_URL}/leads?limit=50`;
    if (status) url += `&status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const tbody = document.getElementById('leadsTableBody');

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray-400);">No leads found</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(lead => `
            <tr>
                <td><strong>${lead.name || 'Unknown'}</strong></td>
                <td>${lead.phone}</td>
                <td>${lead.service_type || '-'}</td>
                <td><span class="lead-status ${lead.status}">${lead.status}</span></td>
                <td style="color:var(--gray-500);font-size:0.85rem;">${lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Load leads error:', e);
    }
}

async function loadAppointments() {
    const status = document.getElementById('apptStatusFilter').value;
    let url = `${API_URL}/appointments?limit=50`;
    if (status) url += `&status=${status}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const container = document.getElementById('appointmentsList');

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-state">No appointments</div>';
            return;
        }

        container.innerHTML = data.map(appt => `
            <div class="appt-card">
                <div class="appt-card-info">
                    <h4>${appt.client_name}</h4>
                    <p>${appt.service_type}${appt.address ? ' - ' + appt.address : ''}</p>
                </div>
                <div style="display:flex;align-items:center;gap:16px;">
                    <div class="appt-card-time">
                        <div class="date">${appt.date}</div>
                        <div class="time">${appt.time}</div>
                    </div>
                    <span class="appt-status ${appt.status}">${appt.status}</span>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Load appointments error:', e);
    }
}
