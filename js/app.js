import { PIPELINES, STAGES, FIRM_STATUS } from './data.js';

// Supabase Configuration
const SUPABASE_URL = 'https://zkpkvrnmqqrymwwzaiau.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcGt2cm5tcXFyeW13d3phaWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjk4MDksImV4cCI6MjA4MzkwNTgwOX0.Dvdgn_k8V4v_b4dJa_M-Qf7tz1pJ6SAywOwpPeQL4mI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Management
const state = {
    view: 'dashboard',
    members: [],
    leads: [],
    activities: [],
    loading: true,
    activePipeline: PIPELINES.STAFFING,
    selectedMember: null,
    selectedLead: null,
    leadMemberFilter: '',
    currentLeadActivities: [],
    searchQuery: '',
    user: {
        name: 'Alex Morgan',
        role: 'Sales Manager'
    }
};

const LEAD_STAGES = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    QUALIFIED: 'Qualified',
    PROPOSAL: 'Proposal Sent',
    WON: 'Won',
    LOST: 'Lost'
};

const PIPELINES = {
    STAFFING: 'Staffing Guild',
    DEALS: 'Deals Guild',
    LEADS: 'Leads Pipeline'
};

const STAGES = {
    INTEREST: 'Interest',
    INTENT: 'Intent',
    DUE_DILIGENCE: 'Due Diligence',
    CONTRACT: 'Contract',
    COMPLETED: 'Completed',
    BOOKED: 'Booked',
    SOURCING: 'Sourcing',
    SIGNED: 'Signed',
    PAYMENT: 'Payment',
    MANDATE: 'Mandate',
    MATCHMAKING: 'Matchmaking',
    INTRODUCTIONS: 'Introductions',
    COMPLETION: 'Completion'
};

// Utils
const formatCurrency = (val) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val || 0);

const calculateLeadScore = (data) => {
    let score = 20; // Base score

    // 1. SIC Match (+30) - Assume 'Match' check is performed against a list of network specialism keywords
    const specialisms = ['Tax', 'Bookkeeping', 'Advisory', 'Payroll'];
    const sicMatch = (data.sic_codes || []).some(sic =>
        specialisms.some(spec => sic.toLowerCase().includes(spec.toLowerCase()))
    );
    if (sicMatch) score += 30;

    // 2. Non-residential office (+20)
    if (!data.is_residential_office) score += 20;

    // 3. Multiple directors (+15)
    if (data.directors_count > 1) score += 15;

    // 4. Share capital > £100 (+10)
    if (data.share_capital > 100) score += 10;

    return Math.min(100, score);
};

async function updateLeadStatus(id, status) {
    const { error } = await supabase.from('leads').update({ status, last_stage_change_at: new Date().toISOString() }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    await fetchCRMData();
}

async function addLeadActivity(leadId, type, description) {
    const { error } = await supabase.from('lead_activities').insert({ lead_id: leadId, type, description });
    if (error) alert('Error adding activity: ' + error.message);
    await fetchCRMData(); // Re-fetch to update lead details
    app.openLeadSidePanel(leadId); // Re-open panel to show new activity
}

function setLeadFilter(filter) {
    state.leadFilter = filter;
    render();
}

function setLeadMemberFilter(memberId) {
    state.leadMemberFilter = memberId;
    render();
}

// Components
const components = {
    avatar: (text, size = 'small') => `<div class="avatar-${size}">${text || '?'}</div>`,
    tag: (text) => `<span class="tag">${text}</span>`,
    pill: (text, type = 'blue') => `<span class="val-pill pill-${type}">${text || ''}</span>`,
    scoreColor: (score) => {
        if (score >= 80) return '#166534'; // Green
        if (score >= 50) return '#854d0e'; // Amber
        return '#991b1b'; // Red
    }
};

// Data Actions
async function fetchCRMData() {
    state.loading = true;
    render();

    // Fetch Members
    const membersRes = await supabase.from('members').select('*').order('firm_name', { ascending: true });
    if (membersRes.error) console.error('Error fetching members:', membersRes.error);
    else state.members = membersRes.data;

    // Fetch Leads
    const leadsRes = await supabase.from('leads').select('*, members(firm_name)').order('created_at', { ascending: false });
    if (leadsRes.error) console.error('Error fetching leads:', leadsRes.error);
    else state.leads = leadsRes.data;

    // Fetch Lead Activities
    const activitiesRes = await supabase.from('lead_activities').select('*').order('created_at', { ascending: false });
    if (activitiesRes.error) console.error('Error fetching lead activities:', activitiesRes.error);
    else state.activities = activitiesRes.data;

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
        const totalLeads = state.leads.length;
        const wonLeads = state.leads.filter(l => l.status === LEAD_STAGES.WON).length;
        const conversion = totalLeads ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;

        const funnelStages = [LEAD_STAGES.NEW, LEAD_STAGES.QUALIFIED, LEAD_STAGES.PROPOSAL, LEAD_STAGES.WON];
        const funnelData = funnelStages.map(stage => {
            const count = state.leads.filter(l => l.status === stage).length;
            const pct = totalLeads ? (count / totalLeads) * 100 : 0;
            return { stage, count, pct };
        });

        return `
            <div class="dash-hero animated">
                <h1>Welcome Back, ${state.user.name}</h1>
                <p>You have <span class="pipeline-value">${state.members.length}</span> active member firms in the network.</p>
                <p>Tracked Leads: <span class="pipeline-value">${state.leads.length}</span> | Conversion: <span class="pipeline-value">${conversion}%</span></p>
            </div>
            
            <div class="dash-stats animated" style="animation-delay: 0.1s">
                <div class="stat-card-new">
                    <div class="stat-icon-wrap icon-blue">🎯</div>
                    <div>
                        <div class="stat-label">Total Leads</div>
                        <div class="stat-value">${totalLeads}</div>
                    </div>
                </div>
                <div class="stat-card-new">
                    <div class="stat-icon-wrap icon-green">🏆</div>
                    <div>
                        <div class="stat-label">Won Deals</div>
                        <div class="stat-value">${wonLeads}</div>
                    </div>
                </div>
                <div class="stat-card-new">
                    <div class="stat-icon-wrap icon-blue">👥</div>
                    <div class="stat-info">
                        <div class="stat-label">Active Members</div>
                        <div class="stat-value">${state.members.length}</div>
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

            <div class="dash-chart-card animated" style="animation-delay: 0.2s; margin-top: 30px;">
                <h3>Lead Conversion Funnel</h3>
                <div class="funnel-container" style="margin-top: 20px;">
                    ${funnelData.map(f => `
                        <div class="funnel-step">
                            <div style="width: 120px; font-size: 13px; font-weight: 500;">${f.stage}</div>
                            <div class="funnel-bar-wrap">
                                <div class="funnel-bar" style="width: ${f.pct}%; background: var(--brand-primary);"></div>
                            </div>
                            <div style="width: 60px; text-align: right; font-weight: 600;">${f.count}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="dash-chart-card animated" style="margin-top: 40px; animation-delay: 0.2s">
                <div class="chart-header">Pipeline Distribution (Active Members)</div>
                <div class="pipeline-dist-chart" style="height: 300px; display: flex; align-items: flex-end; gap: 15px; padding: 20px; background: white; border-radius: 20px; border: 1px solid var(--border-light);">
                    ${Object.values(STAGES).slice(0, 10).map((stage, i) => {
            const count = state.members.filter(f => f.stage === stage).length;
            const height = (count / (state.members.length || 1)) * 100;
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

    members: () => {
        const total = state.members.length;
        const active = state.members.filter(m => !m.is_archived).length;
        const archived = total - active;

        const filteredMembers = state.members.filter(m => {
            const query = state.searchQuery.toLowerCase();
            const matchesQuery = m.firm_name.toLowerCase().includes(query) ||
                (m.specialisms || []).some(s => s.toLowerCase().includes(query)) ||
                (m.postcodes_served || []).some(p => p.toLowerCase().includes(query));
            return matchesQuery;
        });

        return `
            <div class="view-title-row animated">
                <div class="view-title-group">
                    <h1>Network Members</h1>
                    <p>Manage accounting firms, their capacity, and coverage.</p>
                </div>
                <div class="button-group">
                    <button class="btn-primary" onclick="app.showAddModal('member')">+ Add Member Firm</button>
                </div>
            </div>

            <div class="member-stats-bar animated">
                <div class="stat-mini-card">
                    <h4>Total Network</h4>
                    <div class="val">${total}</div>
                </div>
                <div class="stat-mini-card">
                    <h4>Active Partners</h4>
                    <div class="val">${active}</div>
                </div>
                <div class="stat-mini-card">
                    <h4>Archived</h4>
                    <div class="val">${archived}</div>
                </div>
            </div>

            <div class="filter-bar animated">
                <input type="text" placeholder="Search by name, specialism, or postcode..." class="search-input" value="${state.searchQuery}" oninput="app.searchFirms(this.value)">
                <button class="mini-btn" onclick="app.fetchCRMData()">🔄 Refresh</button>
            </div>

            <div class="members-table-wrap animated">
                <table class="members-table">
                    <thead>
                        <tr>
                            <th style="width: 20%">Firm Name</th>
                            <th style="width: 20%">Specialisms</th>
                            <th style="width: 15%">Postcodes</th>
                            <th style="width: 15%">Capacity</th>
                            <th style="width: 15%">Tier</th>
                            <th style="width: 15%">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="member-table-body">
                        ${filteredMembers.map(m => {
            const capMode = m.capacity_status === 'Available' ? 'green' : (m.capacity_status === 'Busy' ? 'amber' : 'red');
            return `
                                <tr class="${m.is_archived ? 'archived-row' : ''}">
                                    <td>
                                        <strong>${m.firm_name}</strong>
                                        <div style="font-size: 11px; color: var(--text-muted);">${m.contact_email || ''}</div>
                                    </td>
                                    <td>${(m.specialisms || []).map(s => components.tag(s)).join('')}</td>
                                    <td><div style="font-size: 12px; color: var(--text-muted);">${(m.postcodes_served || []).join(', ')}</div></td>
                                    <td><span class="capacity-badge ${capMode}">${m.capacity_status}</span></td>
                                    <td>${components.pill(m.subscription_tier, m.subscription_tier === 'Gold' ? 'purple' : 'blue')}</td>
                                    <td>
                                        <div class="button-group-row">
                                            <button class="mini-btn" onclick="app.editMember('${m.id}')">Edit</button>
                                            <button class="mini-btn" onclick="app.archiveMember('${m.id}', ${!m.is_archived})">${m.is_archived ? 'Unarchive' : 'Archive'}</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                        ${filteredMembers.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:100px; color:var(--text-muted);">No members matching your criteria.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
    },

    leads: () => {
        const query = (state.searchQuery || '').toLowerCase();

        let filteredLeads = state.leads.filter(l => {
            const matchesQuery = l.company_name.toLowerCase().includes(query) ||
                (l.registered_address || '').toLowerCase().includes(query) ||
                (l.sic_codes || []).some(s => s.toLowerCase().includes(query));
            return matchesQuery;
        });

        // Sort by score DESC
        filteredLeads.sort((a, b) => (b.score || 0) - (a.score || 0));

        return `
            <div class="view-title-row animated">
                <div class="view-title-group">
                    <h1>Leads Pipeline</h1>
                    <p>Qualified accounting leads and network match-making.</p>
                </div>
                <div class="button-group">
                    <button class="btn-primary" onclick="app.showAddModal('lead')">+ Create Lead</button>
                </div>
            </div>

            <div class="filter-bar animated">
                <input type="text" placeholder="Search leads by name, SIC, or location..." class="search-input" value="${state.searchQuery}" oninput="app.searchLeads(this.value)">
                <div class="button-group-row">
                    <button class="mini-btn ${state.leadFilter === 'unassigned' ? 'active' : ''}" onclick="app.setLeadFilter('unassigned')">Unassigned</button>
                    <button class="mini-btn ${!state.leadFilter ? 'active' : ''}" onclick="app.setLeadFilter(null)">All</button>
                </div>
            </div>

            <div class="members-table-wrap animated">
                <table class="members-table">
                    <thead>
                        <tr>
                            <th style="width: 25%">Company Name</th>
                            <th style="width: 15%">SIC / Location</th>
                            <th style="width: 15%">Inc. Date</th>
                            <th style="width: 10%">Score</th>
                            <th style="width: 15%">Status</th>
                            <th style="width: 10%">Assigned To</th>
                            <th style="width: 10%">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredLeads.filter(l => state.leadFilter === 'unassigned' ? !l.assigned_member_id : true).map(l => `
                            <tr>
                                <td>
                                    <strong>${l.company_name}</strong>
                                    <div style="font-size: 11px; color: var(--text-muted);">${l.company_number || ''}</div>
                                </td>
                                <td>
                                    <div style="font-size: 12px;">${(l.sic_codes || []).join(', ')}</div>
                                    <div style="font-size: 11px; color: var(--text-muted);">${l.registered_address || 'N/A'}</div>
                                </td>
                                <td>${l.incorporation_date || 'N/A'}</td>
                                <td><div class="score-pill" style="background: ${components.scoreColor(l.score)}; color: white;">${l.score || 0}</div></td>
                                <td>
                                    <select class="mini-select" onchange="app.updateLeadStatus('${l.id}', this.value)">
                                        <option value="New" ${l.status === 'New' ? 'selected' : ''}>New</option>
                                        <option value="Contacted" ${l.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                                        <option value="Qualified" ${l.status === 'Qualified' ? 'selected' : ''}>Qualified</option>
                                        <option value="Assigned" ${l.status === 'Assigned' ? 'selected' : ''}>Assigned</option>
                                        <option value="Closed" ${l.status === 'Closed' ? 'selected' : ''}>Closed</option>
                                    </select>
                                </td>
                                <td>${l.members ? l.members.firm_name : '<em>-</em>'}</td>
                                <td><button class="mini-btn" onclick="app.viewLead('${l.id}')">View</button></td>
                            </tr>
                        `).join('')}
                        ${filteredLeads.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:100px; color:var(--text-muted);">No leads found.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
    },

    pipelines: () => {
        const guildStages = state.activePipeline === PIPELINES.STAFFING
            ? [STAGES.INTEREST, STAGES.BOOKED, STAGES.COMPLETED, STAGES.SOURCING, STAGES.SIGNED, STAGES.PAYMENT]
            : (state.activePipeline === PIPELINES.DEALS
                ? [STAGES.INTENT, STAGES.MANDATE, STAGES.MATCHMAKING, STAGES.INTRODUCTIONS, STAGES.DUE_DILIGENCE, STAGES.COMPLETION]
                : [LEAD_STAGES.NEW, LEAD_STAGES.CONTACTED, LEAD_STAGES.QUALIFIED, LEAD_STAGES.PROPOSAL, LEAD_STAGES.WON, LEAD_STAGES.LOST]);

        return `
            <div class="view-title-row animated">
                <div class="view-title-group">
                    <h1>${state.activePipeline}</h1>
                    <p>${state.activePipeline === PIPELINES.LEADS ? 'Drag and drop leads to progress them through the funnel.' : 'Manage member firms through their engagement lifecycle.'}</p>
                </div>
                <div class="button-group">
                    <button class="btn-primary" onclick="app.showAddModal('${state.activePipeline === PIPELINES.LEADS ? 'lead' : 'deal'}')">+ ${state.activePipeline === PIPELINES.LEADS ? 'Direct Entry' : 'Add Deal'}</button>
                </div>
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
                <label class="pipeline-option">
                    <input type="radio" name="pipe-select" ${state.activePipeline === PIPELINES.LEADS ? 'checked' : ''} onchange="app.switchPipeline('${PIPELINES.LEADS}')">
                    Leads Pipeline
                </label>
            </div>

            ${state.activePipeline === PIPELINES.LEADS ? `
                <div class="filter-bar animated" style="margin-top: -30px; margin-bottom: 20px;">
                    <select class="mini-select" onchange="app.setLeadMemberFilter(this.value)">
                        <option value="">All Members</option>
                        ${state.members.map(m => `<option value="${m.id}" ${state.leadMemberFilter === m.id ? 'selected' : ''}>${m.firm_name}</option>`).join('')}
                    </select>
                </div>
            ` : ''}

            <div class="kanban-board animated">
                ${guildStages.map(stage => {
            if (state.activePipeline === PIPELINES.LEADS) {
                const stageLeads = state.leads.filter(l =>
                    l.status === stage &&
                    (state.leadMemberFilter ? l.assigned_member_id === state.leadMemberFilter : true)
                );
                return `
                        <div class="kanban-col" ondragover="app.allowDrop(event)" ondragleave="app.handleDragLeave(event)" ondrop="app.handleLeadDrop(event, '${stage}')">
                            <div class="col-head">
                                <h3>${stage}</h3>
                                <div class="col-count-bubble">${stageLeads.length}</div>
                            </div>
                            <div class="kanban-list">
                                ${stageLeads.map(l => {
                    const days = Math.floor((new Date() - new Date(l.last_stage_change_at || l.created_at)) / (1000 * 60 * 60 * 24));
                    return `
                                        <div class="kanban-card" draggable="true" ondragstart="app.handleLeadDragStart(event, '${l.id}')" onclick="app.openLeadSidePanel('${l.id}')">
                                            <div class="card-title-row">
                                                <strong>${l.company_name}</strong>
                                            </div>
                                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                                                <div class="card-days">${days} days</div>
                                                <div class="score-pill" style="background:${components.scoreColor(l.score)}; color:white; scale:0.8;">${l.score}</div>
                                            </div>
                                        </div>
                                    `;
                }).join('')}
                                ${stageLeads.length === 0 ? `
                                    <div class="empty-kanban-slot">
                                        <div class="empty-icon">🎯</div>
                                        <p>No leads in this stage</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
            } else {
                const stageMembers = state.members.filter(m =>
                    m.stage === stage &&
                    m.pipeline === state.activePipeline &&
                    (m.firm_name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                        (m.contact_name && m.contact_name.toLowerCase().includes(state.searchQuery.toLowerCase())))
                );
                const stageTotal = stageMembers.reduce((acc, m) => acc + (parseFloat(m.value) || 0), 0);

                return `
                        <div class="kanban-col" ondragover="app.allowDrop(event)" ondragleave="app.handleDragLeave(event)" ondrop="app.handleDrop(event, '${stage}')">
                            <div class="col-head">
                                <h3>${stage}</h3>
                                <div class="col-count-bubble">${stageMembers.length}</div>
                            </div>
                            <div class="col-value-summary">${formatCurrency(stageTotal)}</div>
                            <div class="kanban-list">
                                ${stageMembers.map(m => `
                                    <div class="kanban-card" draggable="true" ondragstart="app.handleDragStart(event, '${m.id}')" onclick="app.viewMember('${m.id}')">
                                        <div class="card-title-row">
                                            <strong>${m.firm_name}</strong>
                                        </div>
                                        <div class="card-subtext">${m.contact_name || ''}</div>
                                        <div class="card-value">${formatCurrency(m.value)}</div>
                                        <div class="card-tags">${(m.tags || []).map(t => components.tag(t)).join('')}</div>
                                    </div>
                                `).join('')}
                                ${stageMembers.length === 0 ? `
                                    <div class="empty-kanban-slot">
                                        <div class="empty-icon">📂</div>
                                        <p>No members in this stage</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
            }
        }).join('')}
            </div>
        `;
    },

    memberDetail: () => {
        const m = state.selectedMember;
        if (!m) return 'Member not found';
        return `
            <div class="view-title-row animated">
                <button class="mini-btn" onclick="app.navTo('members')">← Back to Members</button>
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
                        <p>${m.firm_name}</p>
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
    },

    leadDetail: () => {
        const l = state.selectedLead;
        if (!l) return 'Lead not found';
        return `
            <div class="view-title-row animated">
                <button class="mini-btn" onclick="app.navTo('leads')">← Back to Leads</button>
                <div class="button-group">
                    <button class="mini-btn" onclick="app.deleteLead('${l.id}')">🗑️ Delete</button>
                    <button class="btn-primary">Action Lead</button>
                </div>
            </div>

            <div class="detail-layout animated" style="width: 100%;">
                <div class="profile-card">
                    <div class="lg-avatar">${l.company_name ? l.company_name[0] : '?'}</div>
                    <div class="profile-info">
                        <h2>${l.company_name || 'No Company Name'}</h2>
                        <p>${l.contact_email || 'No Contact Email'}</p>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 25px; flex: 1;">
                    <div class="dash-chart-card">
                        <h3>Lead Details</h3>
                        <p><strong>Company Number:</strong> ${l.company_number || 'N/A'}</p>
                        <p><strong>Incorporation Date:</strong> ${l.incorporation_date || 'N/A'}</p>
                        <p><strong>Status:</strong> ${components.pill(l.status, l.status === 'New' ? 'blue' : 'green')}</p>
                        <p><strong>Score:</strong> <div class="score-pill">${l.score}</div></p>
                        <p><strong>Assigned Member:</strong> 
                            <select onchange="app.assignLead('${l.id}', this.value)">
                                <option value="">-- Unassigned --</option>
                                ${state.members.map(m => `
                                    <option value="${m.id}" ${l.assigned_member_id === m.id ? 'selected' : ''}>${m.firm_name}</option>
                                `).join('')}
                            </select>
                        </p>
                    </div>
                    <div class="dash-chart-card">
                        <h3>Activities</h3>
                        <div style="background:#f8fafc; padding:30px; border-radius:12px; text-align:center; color:var(--text-muted); margin-top:15px;">
                            No activities tracked for this lead.
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
        state.selectedMember = state.members.find(m => m.id === id);
        state.view = 'memberDetail';
        render();
    },
    viewLead: (id) => {
        state.selectedLead = state.leads.find(l => l.id === id);
        state.view = 'leadDetail';
        render();
    },
    switchPipeline: (pipe) => {
        state.activePipeline = pipe;
        render();
    },
    refreshData: () => {
        fetchCRMData();
    },
    closeModal: () => {
        document.getElementById('modal-container').style.display = 'none';
    },
    showAddModal: (type, existingData = null) => {
        const isMember = type === 'member';
        const title = existingData ? `Edit ${isMember ? 'Member' : 'Lead'}` : `Add New ${isMember ? 'Member' : 'Lead'}`;

        let body = '';
        if (isMember) {
            const m = existingData || {};
            const specs = ['Tax', 'Bookkeeping', 'Advisory', 'Payroll'];
            body = `
                <div class="form-group">
                    <label>Firm Name</label>
                    <input type="text" id="m-name" value="${m.firm_name || ''}" placeholder="e.g. Nexus Accounting">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="m-email" value="${m.contact_email || ''}" placeholder="contact@firm.com">
                </div>
                <div class="form-group">
                    <label>Postcode Coverage (Comma separated)</label>
                    <input type="text" id="m-postcodes" value="${(m.postcodes_served || []).join(', ')}" placeholder="e.g. SW1, SE1, EC1">
                </div>
                <div class="form-group">
                    <label>Specialisms</label>
                    <div class="checkbox-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:5px;">
                        ${specs.map(s => `
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                <input type="checkbox" name="specialism" value="${s}" ${(m.specialisms || []).includes(s) ? 'checked' : ''}> ${s}
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label>Capacity Status</label>
                    <select id="m-capacity">
                        <option value="Available" ${m.capacity_status === 'Available' ? 'selected' : ''}>Available (Green)</option>
                        <option value="Busy" ${m.capacity_status === 'Busy' ? 'selected' : ''}>Busy (Amber)</option>
                        <option value="Full" ${m.capacity_status === 'Full' ? 'selected' : ''}>Full (Red)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Subscription Tier</label>
                    <select id="m-tier">
                        <option value="Basic" ${m.subscription_tier === 'Basic' ? 'selected' : ''}>Basic</option>
                        <option value="Silver" ${m.subscription_tier === 'Silver' ? 'selected' : ''}>Silver</option>
                        <option value="Gold" ${m.subscription_tier === 'Gold' ? 'selected' : ''}>Gold</option>
                        <option value="Platinum" ${m.subscription_tier === 'Platinum' ? 'selected' : ''}>Platinum</option>
                    </select>
                </div>
            `;
        } else {
            const l = existingData || {};
            body = `
                <div class="form-group">
                    <label>Company Name</label>
                    <input type="text" id="f-name" value="${l.company_name || ''}" placeholder="e.g. Acme Corp">
                </div>
                <div class="form-group">
                    <label>Company Number</label>
                    <input type="text" id="f-number" value="${l.company_number || ''}" placeholder="e.g. 12345678">
                </div>
                <div class="form-group">
                    <label>SIC Codes (Comma separated)</label>
                    <input type="text" id="f-sic" value="${(l.sic_codes || []).join(', ')}" placeholder="e.g. 69201, 69202">
                </div>
                <div class="form-group">
                    <label>Registered Address</label>
                    <input type="text" id="f-address" value="${l.registered_address || ''}" placeholder="123 High St, London">
                </div>
                <div class="form-group" style="display: flex; gap: 15px;">
                    <div style="flex: 1;">
                        <label>Director Count</label>
                        <input type="number" id="f-directors" value="${l.directors_count || 1}" min="1">
                    </div>
                    <div style="flex: 1;">
                        <label>Share Capital (£)</label>
                        <input type="number" id="f-share" value="${l.share_capital || 0}" min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" id="f-residential" ${l.is_residential_office ? 'checked' : ''}> Registered office is residential
                    </label>
                </div>
                <div class="form-group">
                    <label>Contact Email</label>
                    <input type="email" id="f-email" value="${l.contact_email || ''}" placeholder="contact@acme.com">
                </div>
            `;
        }

        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = body;
        document.getElementById('modal-container').style.display = 'flex';

        document.getElementById('modal-submit').onclick = async () => {
            state.loading = true;
            render();

            if (isMember) {
                const name = document.getElementById('m-name').value;
                const email = document.getElementById('m-email').value;
                const postcodes = document.getElementById('m-postcodes').value.split(',').map(p => p.trim()).filter(p => p);
                const capacity = document.getElementById('m-capacity').value;
                const tier = document.getElementById('m-tier').value;
                const selectedSpecs = Array.from(document.querySelectorAll('input[name="specialism"]:checked')).map(cb => cb.value);

                if (!name) return alert('Please enter a name');

                const memberData = {
                    firm_name: name,
                    contact_email: email,
                    postcodes_served: postcodes,
                    capacity_status: capacity,
                    subscription_tier: tier,
                    specialisms: selectedSpecs,
                    joined_date: m.joined_date || new Date().toISOString().split('T')[0]
                };

                let res;
                if (existingData) {
                    res = await supabase.from('members').update(memberData).eq('id', existingData.id);
                } else {
                    res = await supabase.from('members').insert([memberData]);
                }

                if (res.error) alert('Sync Error: ' + res.error.message);
            } else {
                const name = document.getElementById('f-name').value;
                const number = document.getElementById('f-number').value;
                const sic = document.getElementById('f-sic').value.split(',').map(s => s.trim()).filter(s => s);
                const address = document.getElementById('f-address').value;
                const directors = parseInt(document.getElementById('f-directors').value) || 1;
                const share = parseFloat(document.getElementById('f-share').value) || 0;
                const residential = document.getElementById('f-residential').checked;
                const email = document.getElementById('f-email').value;

                if (!name) return alert('Please enter a name');

                const leadData = {
                    company_name: name,
                    company_number: number,
                    sic_codes: sic,
                    registered_address: address,
                    directors_count: directors,
                    share_capital: share,
                    is_residential_office: residential,
                    contact_email: email,
                    status: existingData ? existingData.status : 'New',
                    created_at: existingData ? existingData.created_at : new Date().toISOString()
                };

                // Auto-calculate score
                leadData.score = app.calculateLeadScore(leadData);

                let res;
                if (existingData) {
                    res = await supabase.from('leads').update(leadData).eq('id', existingData.id);
                } else {
                    res = await supabase.from('leads').insert([leadData]);
                }

                if (res.error) alert('Sync Error: ' + res.error.message);
            }

            app.closeModal();
            await fetchCRMData();
        };
    },
    editMember: (id) => {
        const member = state.members.find(m => m.id === id);
        if (member) app.showAddModal('member', member);
    },
    archiveMember: async (id, shouldArchive = true) => {
        state.loading = true;
        render();
        const { error } = await supabase.from('members').update({ is_archived: shouldArchive }).eq('id', id);
        if (error) alert('Error: ' + error.message);
        await fetchCRMData();
    },
    deleteMember: async (id) => {
        if (!confirm('Are you sure you want to delete this member?')) return;
        state.loading = true;
        render();
        const { error } = await supabase.from('members').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        await fetchCRMData();
        state.view = 'members';
        state.loading = false;
        render();
    },
    searchFirms: (val) => {
        state.searchQuery = val;
        render();
    },
    searchLeads: (val) => {
        state.searchQuery = val;
        render();
    },
    assignLead: async (leadId, memberId) => {
        state.loading = true;
        render();

        const { error } = await supabase
            .from('leads')
            .update({ assigned_member_id: memberId || null, status: memberId ? 'Assigned' : 'New' })
            .eq('id', leadId);

        if (error) {
            alert('Assignment Error: ' + error.message);
        } else {
            // Log activity
            await app.logActivity(leadId, memberId, 'Assignment', `Lead assigned to ${memberId ? 'member' : 'nobody'}`);
            await fetchCRMData();
        }
        state.loading = false;
        render();
    },
    setLeadMemberFilter: (mid) => {
        state.leadMemberFilter = mid;
        render();
    },
    openLeadSidePanel: async (id) => {
        state.selectedLead = state.leads.find(l => l.id === id);
        if (!state.selectedLead) return;

        // Fetch activities for this lead
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('lead_id', id)
            .order('timestamp', { ascending: false });

        state.currentLeadActivities = data || [];

        const l = state.selectedLead;
        const panelBody = document.getElementById('side-panel-body');
        document.getElementById('side-panel-title').innerText = l.company_name;

        panelBody.innerHTML = `
            <div class="score-breakdown" style="padding: 15px; background: var(--brand-mint); border-radius: 12px; margin-bottom: 25px;">
                <div style="font-weight: 700; color: var(--brand-dark); margin-bottom: 10px;">Score Breakdown: ${l.score}/100</div>
                <ul style="font-size: 12px; color: var(--text-secondary); padding-left: 20px;">
                    <li>SIC Match: ${(l.sic_codes || []).length > 0 ? '+30' : '0'}</li>
                    <li>Professional Office: ${!l.is_residential_office ? '+20' : '0'}</li>
                    <li>Leadership Depth: ${l.directors_count > 1 ? '+15' : '0'}</li>
                    <li>Financial Strength: ${l.share_capital > 100 ? '+10' : '0'}</li>
                </ul>
            </div>

            <div class="info-grid" style="display: grid; gap: 15px;">
                <p><strong>Status:</strong> ${l.status}</p>
                <p><strong>Assigned:</strong> ${l.members ? l.members.firm_name : 'Unassigned'}</p>
                <p><strong>Address:</strong> ${l.registered_address || 'N/A'}</p>
            </div>

            <div style="margin-top: 30px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>Activity Timeline</h3>
                    <button class="mini-btn" onclick="app.showAddActivityModal('${l.id}')">+ Log</button>
                </div>
                <div class="timeline">
                    ${state.currentLeadActivities.map(a => `
                        <div class="timeline-item">
                            <div class="timeline-time">${new Date(a.timestamp).toLocaleString()} - <strong>${a.action_type}</strong></div>
                            <div class="timeline-notes">${a.notes}</div>
                        </div>
                    `).join('')}
                    ${state.currentLeadActivities.length === 0 ? '<p style="color:var(--text-muted); font-size:12px; text-align:center; padding:20px;">No activities logged yet.</p>' : ''}
                </div>
            </div>
        `;

        document.getElementById('side-panel-container').classList.add('open');
    },
    closeSidePanel: (e) => {
        if (!e || e.target.id === 'side-panel-container') {
            document.getElementById('side-panel-container').classList.remove('open');
        }
    },
    showAddActivityModal: (leadId) => {
        const body = `
            <div class="form-group">
                <label>Action Type</label>
                <select id="a-type">
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Note">Internal Note</option>
                </select>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea id="a-notes" style="width:100%; height:100px; padding:10px; border:1px solid var(--border-light); border-radius:8px;"></textarea>
            </div>
        `;
        document.getElementById('modal-title').innerText = 'Log Activity';
        document.getElementById('modal-body').innerHTML = body;
        document.getElementById('modal-container').style.display = 'flex';

        document.getElementById('modal-submit').onclick = async () => {
            const type = document.getElementById('a-type').value;
            const notes = document.getElementById('a-notes').value;
            if (!notes) return alert('Please enter notes');

            await app.logActivity(leadId, null, type, notes);
            app.closeModal();
            app.openLeadSidePanel(leadId); // Refresh side panel
        };
    },
    handleLeadDragStart: (e, id) => {
        e.dataTransfer.setData('leadId', id);
        e.target.classList.add('dragging');
    },
    handleLeadDrop: async (e, newStage) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const id = e.dataTransfer.getData('leadId');
        if (id) {
            state.loading = true;
            render();
            const { error } = await supabase
                .from('leads')
                .update({
                    status: newStage,
                    last_stage_change_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) alert('Error updating lead: ' + error.message);
            await fetchCRMData();
        }
    },
    logActivity: async (leadId, memberId, type, notes) => {
        const { error } = await supabase.from('activities').insert([{
            lead_id: leadId,
            member_id: memberId || null,
            action_type: type,
            notes: notes,
            timestamp: new Date().toISOString()
        }]);
        if (error) console.error('Activity Logging Error:', error);
    },
    deleteLead: async (id) => {
        if (!confirm('Delete this lead?')) return;
        state.loading = true;
        render();
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        await fetchCRMData();
        state.view = 'leads';
        state.loading = false;
        render();
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

            const newMembers = jsonData.map(row => ({
                firm_name: row.Firm || row.Company || 'Unknown',
                contact_email: row.Email || '',
                phone: row.Phone || '',
                specialisms: (row.Specialisms || '').split(',').map(s => s.trim()).filter(s => s),
                capacity_status: 'Available',
                subscription_tier: 'Basic',
                joined_date: new Date().toISOString().split('T')[0]
            }));

            const { error } = await supabase.from('members').insert(newMembers);
            if (error) alert('Import Error: ' + error.message);
            await fetchCRMData();
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

document.addEventListener('DOMContentLoaded', fetchCRMData);
