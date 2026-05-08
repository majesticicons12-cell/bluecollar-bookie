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
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('section-' + btn.dataset.section).classList.add('active');
        });
    });
    document.getElementById('userSearch').addEventListener('input', renderUsers);
    loadAdmin();
});

async function loadAdmin() {
    try {
        const [statsRes, usersRes, logsRes] = await Promise.all([
            fetch(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_URL}/admin/logs`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (statsRes.status === 401 || usersRes.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }

        const stats = await statsRes.json();
        const users = await usersRes.json();
        const logs = await logsRes.json();

        document.getElementById('adminTotalUsers').textContent = stats.stats.totalUsers;
        document.getElementById('adminActiveSubs').textContent = stats.stats.activeSubscriptions;
        document.getElementById('adminTotalLeads').textContent = stats.stats.totalLeads;
        document.getElementById('adminTotalAppts').textContent = stats.stats.totalAppointments;
        document.getElementById('adminSetupComplete').textContent = stats.stats.completedSetup;

        const planBars = document.getElementById('planBars');
        planBars.innerHTML = Object.entries(stats.stats.planDistribution).map(([plan, count]) =>
            `<div class="plan-bar ${plan}"><span class="plan-name">${plan.charAt(0).toUpperCase() + plan.slice(1)}</span>${count}</div>`
        ).join('');

        window._allUsers = users.users;
        renderUsers();

        const logsBody = document.getElementById('logsTableBody');
        logsBody.innerHTML = (logs.logs || []).map(log =>
            `<tr>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>${log.admin_id?.slice(0,8)}...</td>
                <td>${log.action}</td>
                <td>${log.target_user_id?.slice(0,8)}...</td>
                <td>${JSON.stringify(log.details || {})}</td>
            </tr>`
        ).join('');
    } catch (error) {
        console.error('Admin load error:', error);
    }
}

function renderUsers() {
    const query = (document.getElementById('userSearch').value || '').toLowerCase();
    const filtered = (window._allUsers || []).filter(u =>
        u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query)
    );
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = filtered.map(user => `
        <tr>
            <td><strong>${user.name || 'N/A'}</strong></td>
            <td>${user.email}</td>
            <td>${user.business_name || '-'}</td>
            <td>
                <select class="plan-select" data-user-id="${user.id}" data-field="plan">
                    <option value="basic" ${user.plan === 'basic' ? 'selected' : ''}>Basic</option>
                    <option value="pro" ${user.plan === 'pro' ? 'selected' : ''}>Pro</option>
                    <option value="premium" ${user.plan === 'premium' ? 'selected' : ''}>Premium</option>
                </select>
            </td>
            <td>
                <select class="plan-select" data-user-id="${user.id}" data-field="subscription_status">
                    <option value="active" ${user.subscription_status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${user.subscription_status === 'inactive' ? 'selected' : ''}>Inactive</option>
                    <option value="cancelled" ${user.subscription_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td><span class="pill ${user.setup_status}">${user.setup_status || 'not_started'}</span></td>
            <td>${user.phone || '-'}</td>
            <td>
                <button class="action-btn save" onclick="saveUser('${user.id}')">Save</button>
                <button class="action-btn danger" onclick="deleteUser('${user.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function saveUser(userId) {
    const selects = document.querySelectorAll(`[data-user-id="${userId}"]`);
    const updates = {};
    selects.forEach(sel => {
        updates[sel.dataset.field] = sel.value;
    });
    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}/plan`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(updates)
        });
        if (res.ok) alert('User updated');
    } catch (e) { alert('Failed to update'); }
}

async function deleteUser(userId) {
    if (!confirm('Delete this user permanently?')) return;
    try {
        await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        loadAdmin();
    } catch (e) { alert('Failed to delete'); }
}
