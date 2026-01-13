import { PIPELINES, STAGES, FIRM_STATUS } from './data.js';

// Supabase Configuration
const SUPABASE_URL = 'https://zkpkvrnmqqrymwwzaiau.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcGt2cm5tcXFyeW13d3phaWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjk4MDksImV4cCI6MjA4MzkwNTgwOX0.Dvdgn_k8V4v_b4dJa_M-Qf7tz1pJ6SAywOwpPeQL4mI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Management
const state = {
    view: 'dashboard',
    firms: [],
    loading: true,
    activePipeline: PIPELINES.STAFFING,
    selectedMember: null,
    user: {
        name: 'Alex Morgan',
        role: 'Sales Manager'
    }
};

// Utils
const formatCurrency = (val) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val || 0);

// Components
const components = {
    avatar: (text, size = 'small') => `<div class="avatar-${size}">${text || '?'}</div>`,
    tag: (text) => `<span class="tag">${text}</span>`,
    pill: (text, type = 'blue') => `<span class="val-pill pill-${type}">${text || ''}</span>`
};

// Data Actions
async function fetchFirms() {
    state.loading = true;
    render();

    const { data, error } = await supabase
        .from('firms')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching firms:', error);
    } else {
        state.firms = data;
    }

    state.loading = false;
    render();
}

// View Templates
const views = {
    loading: () => `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:60vh; color:var(--text-secondary);">
            <div class="loading-spinner"></div>
            <p style="margin-top:20px;">Synchronizing with AVFarr Cloud...</p>
        </div>
    `,

    dashboard: () => {
        const totalValue = state.firms.reduce((acc, f) => acc + (parseFloat(f.value) || 0), 0);
        return `
            <div class="dash-hero animated">
                <h1>Welcome Back, ${state.user.name}</h1>
                <p>You have <span class="pipeline-value">${state.firms.length}</span> active opportunities in the cloud.</p>
                <p>Total Pipeline Value: <span class="pipeline-value">${formatCurrency(totalValue)}</span></p>
            </div>
            
            <div class="dash-stats animated" style="animation-delay: 0.1s">
                <div class="stat-card-new">
                    <div class="stat-icon-wrap icon-green">£</div>
                    <div class="stat-info">
                        <div class="stat-label">Network Value</div>
                        <div class="stat-value">${formatCurrency(totalValue)}</div>
                    </div>
                </div>
                <div class="stat-card-new">
                    <div class="stat-icon-wrap icon-blue">👥</div>
                    <div class="stat-info">
                        <div class="stat-label">Active Members</div>
                        <div class="stat-value">${state.firms.length}</div>
                    </div>
                </div>
                <div class="stat-card-new">
                    <div class="stat-icon-wrap icon-purple">🏗️</div>
                    <div class="stat-info">
                        <div class="stat-label">Guild Projects</div>
                        <div class="stat-value">8</div>
                    </div>
                </div>
            </div>

            <div class="dash-chart-card animated" style="margin-top: 40px; animation-delay: 0.2s">
                <div class="chart-header">Pipeline Distribution (Active Members)</div>
                <div class="pipeline-dist-chart" style="height: 300px; display: flex; align-items: flex-end; gap: 15px; padding: 20px; background: white; border-radius: 20px; border: 1px solid var(--border-light);">
                    ${Object.values(STAGES).slice(0, 10).map((stage, i) => {
            const count = state.firms.filter(f => f.stage === stage).length;
            const height = (count / (state.firms.length || 1)) * 100;
            return `
                            <div class="chart-column" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                                <div class="chart-bar" title="${stage}: ${count}" style="width: 100%; height: ${count > 0 ? height : 2}%; background-color: var(--brand-primary); border-radius: 6px; transition: all 0.3s ease;"></div>
                                <span class="bar-label" style="font-size: 11px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60px;">${stage.split(' ')[0]}</span>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    },

    firms: () => `
        <div class="view-title-row animated">
            <div class="view-title-group">
                <h1>Members</h1>
                <p>Manage accounting firms and network transitions.</p>
            </div>
            <div class="button-group">
                <input type="file" id="xls-bulk" style="display:none" onchange="app.handleImport(event)">
                <button class="mini-btn" onclick="document.getElementById('xls-bulk').click()">📥 Bulk Import</button>
                <button class="btn-primary" onclick="app.showAddModal('member')">+ Add Member</button>
            </div>
        </div>

        <div class="filter-bar animated">
            <input type="text" placeholder="Search by name or company..." class="search-input" oninput="app.searchFirms(this.value)">
            <button class="mini-btn" onclick="app.refreshData()">🔄 Refresh</button>
        </div>

        <div class="members-table-wrap animated">
            <table class="members-table">
                <thead>
                    <tr>
                        <th style="width: 25%">Name</th>
                        <th style="width: 25%">Company</th>
                        <th style="width: 20%">Pipeline</th>
                        <th style="width: 15%">Stage</th>
                        <th style="width: 15%">Value</th>
                    </tr>
                </thead>
                <tbody id="member-table-body">
                    ${state.firms.map(f => `
                        <tr>
                            <td><div class="name-cell">${components.avatar(f.avatar_text || (f.contact_name ? f.contact_name[0] : '?'))} <span>${f.contact_name || 'No Contact'}</span></div></td>
                            <td>${f.name}</td>
                            <td>${components.pill(f.pipeline || 'General', (f.pipeline || '').includes('Deals') ? 'purple' : 'blue')}</td>
                            <td>${components.pill(f.stage || 'Interest', 'green')}</td>
                            <td><strong>${formatCurrency(f.value)}</strong></td>
                            <td><button class="mini-btn" onclick="app.viewMember('${f.id}')">View</button></td>
                        </tr>
                    `).join('')}
                    ${state.firms.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:100px; color:var(--text-muted);">No members found in cloud.</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `,

    pipelines: () => {
        const guildStages = state.activePipeline === PIPELINES.STAFFING
            ? [STAGES.INTEREST, STAGES.BOOKED, STAGES.COMPLETED, STAGES.SOURCING, STAGES.SIGNED, STAGES.PAYMENT]
            : [STAGES.INTENT, STAGES.MANDATE, STAGES.MATCHMAKING, STAGES.INTRODUCTIONS, STAGES.DUE_DILIGENCE, STAGES.COMPLETION];

        return `
            <div class="view-title-row animated">
                <h1>Pipelines</h1>
                <button class="btn-primary" onclick="app.showAddModal('deal')">+ Add Deal</button>
            </div>

            <div class="pipeline-selector animated">
                <label class="pipeline-option">
                    <input type="radio" name="pipe-select" ${state.activePipeline === PIPELINES.STAFFING ? 'checked' : ''} onchange="app.switchPipeline('${PIPELINES.STAFFING}')">
                    Staffing Guild
                </label>
                <label class="pipeline-option">
                    <input type="radio" name="pipe-select" ${state.activePipeline === PIPELINES.DEALS ? 'checked' : ''} onchange="app.switchPipeline('${PIPELINES.DEALS}')">
                    Deals Guild
                </label>
            </div>

            <div class="kanban-board animated">
                ${guildStages.map(stage => {
            const stageFirms = state.firms.filter(f => f.stage === stage && f.pipeline === state.activePipeline);
            const stageTotal = stageFirms.reduce((acc, f) => acc + (parseFloat(f.value) || 0), 0);

            return `
                        <div class="kanban-col">
                            <div class="col-head">
                                <h3>${stage}</h3>
                                <div class="col-count-bubble">${stageFirms.length}</div>
                            </div>
                            <div class="col-value-summary">${formatCurrency(stageTotal)}</div>
                            <div class="kanban-list">
                                ${stageFirms.map(f => `
                                    <div class="kanban-card" onclick="app.viewMember('${f.id}')">
                                        <div class="card-title-row">
                                            <strong>${f.name}</strong>
                                        </div>
                                        <div class="card-subtext">${f.contact_name || ''}</div>
                                        <div class="card-value">${formatCurrency(f.value)}</div>
                                        <div class="card-tags">${(f.tags || []).map(t => components.tag(t)).join('')}</div>
                                    </div>
                                `).join('')}
                                ${stageFirms.length === 0 ? '<div style="border: 2px dashed #cbd5e1; padding: 20px; border-radius: 10px; text-align: center; color: #94a3b8; font-size: 12px;">Drop here</div>' : ''}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    memberDetail: () => {
        const m = state.selectedMember;
        if (!m) return 'Member not found';
        return `
            <div class="view-title-row animated">
                <button class="mini-btn" onclick="app.navTo('firms')">← Back to Members</button>
                <div class="button-group">
                    <button class="mini-btn" onclick="app.deleteMember('${m.id}')">🗑️ Delete</button>
                    <button class="btn-primary">Action Record</button>
                </div>
            </div>

            <div class="detail-layout animated" style="width: 100%;">
                <div class="profile-card">
                    <div class="lg-avatar">${m.avatar_text || (m.contact_name ? m.contact_name[0] : '?')}</div>
                    <div class="profile-info">
                        <h2>${m.contact_name || 'No Name'}</h2>
                        <p>${m.name}</p>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 25px; flex: 1;">
                    <div class="dash-chart-card">
                        <h3>Tasks</h3>
                        <div style="background:#f8fafc; padding:30px; border-radius:12px; text-align:center; color:var(--text-muted); margin-top:15px;">
                            No tasks tracked for this customer.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

// Global App Logic
window.app = {
    navTo: (view) => {
        state.view = view;
        render();
    },
    viewMember: (id) => {
        state.selectedMember = state.firms.find(f => f.id === id);
        state.view = 'memberDetail';
        render();
    },
    switchPipeline: (pipe) => {
        state.activePipeline = pipe;
        render();
    },
    refreshData: () => {
        fetchFirms();
    },
    closeModal: () => {
        document.getElementById('modal-container').style.display = 'none';
    },
    showAddModal: (type) => {
        const isMember = type === 'member';
        const title = isMember ? 'Add New Member Firm' : 'Add New Deal';
        const body = `
            <div class="form-group">
                <label>${isMember ? 'Company Name' : 'Project/Deal Name'}</label>
                <input type="text" id="f-name" placeholder="e.g. Nexus Accounting">
            </div>
            <div class="form-group">
                <label>Contact Partner</label>
                <input type="text" id="f-contact" placeholder="e.g. Liam Brown">
            </div>
            <div class="form-group">
                <label>Opportunity Value (£)</label>
                <input type="number" id="f-value" value="50000">
            </div>
            <div class="form-group">
                <label>Pipeline</label>
                <select id="f-pipeline">
                    <option value="${PIPELINES.STAFFING}">Staffing Guild</option>
                    <option value="${PIPELINES.DEALS}">Deals Guild</option>
                </select>
            </div>
        `;

        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = body;
        document.getElementById('modal-container').style.display = 'flex';

        document.getElementById('modal-submit').onclick = async () => {
            const name = document.getElementById('f-name').value;
            const contact = document.getElementById('f-contact').value;
            const val = document.getElementById('f-value').value;
            const pipe = document.getElementById('f-pipeline').value;

            if (!name) return alert('Please enter a name');

            const newRecord = {
                name: name,
                contact_name: contact || 'TBC',
                pipeline: pipe,
                stage: pipe === PIPELINES.STAFFING ? STAGES.INTEREST : STAGES.INTENT,
                value: parseInt(val) || 0,
                last_contact: new Date().toISOString().split('T')[0],
                avatar_text: (contact || 'N').charAt(0),
                tags: ['New']
            };

            app.closeModal();
            state.loading = true;
            render();

            const { data, error } = await supabase.from('firms').insert([newRecord]).select();

            if (error) {
                alert('Sync Error: ' + error.message);
            } else {
                state.firms.unshift(data[0]);
            }
            state.loading = false;
            render();
        };
    },
    deleteMember: async (id) => {
        if (!confirm('Are you sure you want to delete this firm?')) return;
        state.loading = true;
        render();
        const { error } = await supabase.from('firms').delete().eq('id', id);
        if (error) alert('Sync Error: ' + error.message);
        await fetchFirms();
    },
    searchFirms: (val) => {
        const query = val.toLowerCase();
        const body = document.getElementById('member-table-body');
        if (!body) return;
        const filtered = state.firms.filter(f => f.name.toLowerCase().includes(query) || (f.contact_name && f.contact_name.toLowerCase().includes(query)));
        body.innerHTML = filtered.map(f => `
            <tr>
                <td><div class="name-cell">${components.avatar(f.avatar_text || (f.contact_name ? f.contact_name[0] : '?'))} <span>${f.contact_name || 'No Contact'}</span></div></td>
                <td>${f.name}</td>
                <td>${components.pill(f.pipeline || 'General', (f.pipeline || '').includes('Deals') ? 'purple' : 'blue')}</td>
                <td>${components.pill(f.stage || 'Interest', 'green')}</td>
                <td><strong>${formatCurrency(f.value)}</strong></td>
                <td><button class="mini-btn" onclick="app.viewMember('${f.id}')">View</button></td>
            </tr>
        `).join('');
    },
    handleImport: async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        state.loading = true;
        render();

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

            const newFirms = jsonData.map(row => ({
                name: row.Firm || row.Company || 'Unknown',
                contact_name: row.Name || row.Contact || 'Partner',
                pipeline: row.Pipeline || PIPELINES.STAFFING,
                stage: row.Stage || STAGES.INTEREST,
                value: parseInt(row.Value || row.ARR || 0),
                last_contact: new Date().toISOString().split('T')[0],
                avatar_text: (row.Name || 'A').charAt(0),
                tags: ['Imported']
            }));

            const { error } = await supabase.from('firms').insert(newFirms);
            if (error) alert('Import Error: ' + error.message);
            await fetchFirms();
        };
        reader.readAsArrayBuffer(file);
    }
};

function render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    if (state.loading) {
        container.innerHTML = views.loading();
        return;
    }

    const renderFunc = views[state.view] || views.dashboard;
    container.innerHTML = renderFunc();

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === state.view);
    });
}

document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
        e.preventDefault();
        app.navTo(navItem.dataset.view);
    }
});

document.addEventListener('DOMContentLoaded', fetchFirms);
