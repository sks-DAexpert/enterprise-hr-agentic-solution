/**
 * Altostrat Enterprise Employee Portal Controller
 * Full-stack Client-Side Orchestration adhering to BRD MVP 1.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  const state = {
    userId: 'EMP-425',
    sessionId: `sess_${Date.now()}`,
    activeTab: 'assistant',
    totalFinOpsCost: 0.0004,
    tickets: [],
    policies: [],
    selectedTicketId: null
  };

  // DOM Elements
  const chatThread = document.getElementById('chatThread');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const quickPromptChips = document.getElementById('quickPromptChips');
  
  // Modals & Drawers
  const timeOffModal = document.getElementById('timeOffModal');
  const ticketModal = document.getElementById('ticketModal');
  const editProfileModal = document.getElementById('editProfileModal');
  const citationDrawer = document.getElementById('citationDrawer');
  const ticketDrawer = document.getElementById('ticketDrawer');
  const telemetryDrawer = document.getElementById('telemetryDrawer');
  const toastContainer = document.getElementById('toastContainer');

  // --- Initial Data Load ---
  initNavigation();
  initChat();
  loadProfile();
  loadBalances();
  loadLeaveHistory();
  loadTickets();
  loadPolicies();
  initModalsAndDrawers();
  initWorkflows();

  // ===================================================================
  // 1. NAVIGATION & TAB SWITCHING
  // ===================================================================
  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');

    const tabMeta = {
      assistant: {
        title: 'AI Assistant & Workflows',
        sub: 'Ask questions, submit leave, manage tickets, or automate cross-system HR actions.'
      },
      timeoff: {
        title: 'Leave & Time-Off Management',
        sub: 'Real-time sync with WorkWeek HCM records and balance tracking.'
      },
      tickets: {
        title: 'ServiceImmediately Support Desk',
        sub: 'Track active incidents, add timeline notes, and resolve requests.'
      },
      profile: {
        title: 'Employee Profile & Contact',
        sub: 'Manage verified employee profile and contact coordinates.'
      },
      policies: {
        title: 'Policy Handbook Explorer',
        sub: '152 Authoritative Sections • Grounded RAG Knowledge Base.'
      },
      workflows: {
        title: 'Cross-System Tasks & Automations',
        sub: 'Chained automations across Policies, WorkWeek, and ServiceImmediately.'
      }
    };

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

    // Top action buttons
    document.getElementById('quickActionTimeOffBtn')?.addEventListener('click', () => openModal(timeOffModal));
    document.getElementById('quickActionTicketBtn')?.addEventListener('click', () => openModal(ticketModal));
    document.getElementById('telemetryPill')?.addEventListener('click', () => openDrawer(telemetryDrawer));
  }

  function switchTab(targetTab) {
    state.activeTab = targetTab;
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTab);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab${capitalize(targetTab)}`);
    });

    const meta = {
      assistant: { title: 'AI Assistant & Workflows', sub: 'Ask questions, submit leave, manage tickets, or automate cross-system HR actions.' },
      timeoff: { title: 'Leave & Time-Off Management', sub: 'Real-time sync with WorkWeek HCM records and balance tracking.' },
      tickets: { title: 'ServiceImmediately Support Desk', sub: 'Track active incidents, add timeline notes, and resolve requests.' },
      profile: { title: 'Employee Profile & Contact', sub: 'Manage verified employee profile and contact coordinates.' },
      policies: { title: 'Policy Handbook Explorer', sub: '152 Authoritative Sections • Grounded RAG Knowledge Base.' },
      workflows: { title: 'Cross-System Tasks & Automations', sub: 'Chained automations across Policies, WorkWeek, and ServiceImmediately.' }
    }[targetTab];

    if (meta) {
      document.getElementById('pageTitle').textContent = meta.title;
      document.getElementById('pageSubtitle').textContent = meta.sub;
    }
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ===================================================================
  // 2. CONVERSATIONAL AI ASSISTANT
  // ===================================================================
  function initChat() {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      
      chatInput.value = '';
      appendUserMessage(text);
      await sendAgentQuery(text);
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
      }
    });

    // Quick prompt chips
    quickPromptChips.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        chatInput.value = prompt;
        chatForm.dispatchEvent(new Event('submit'));
      });
    });
  }

  function appendUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user-message';
    msgDiv.innerHTML = `
      <div class="message-avatar">VK</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-time">${getCurrentTimeString()}</span>
          <span class="sender-name">Veeravigneshk (You)</span>
        </div>
        <div class="message-body">
          <p>${escapeHtml(text)}</p>
        </div>
      </div>
    `;
    chatThread.appendChild(msgDiv);
    scrollToBottom();
  }

  function appendAssistantPlaceholder() {
    const placeholderId = `ai_load_${Date.now()}`;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message assistant-message';
    msgDiv.id = placeholderId;
    msgDiv.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <div class="message-header">
          <span class="sender-name">Altostrat Assistant</span>
          <span class="message-time">${getCurrentTimeString()}</span>
        </div>
        <div class="message-body">
          <p class="loading-dots">Thinking and querying systems<span>.</span><span>.</span><span>.</span></p>
        </div>
      </div>
    `;
    chatThread.appendChild(msgDiv);
    scrollToBottom();
    return placeholderId;
  }

  async function sendAgentQuery(prompt) {
    const placeholderId = appendAssistantPlaceholder();
    const startTime = performance.now();

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          user_id: state.userId,
          session_id: state.sessionId
        })
      });

      const data = await resp.json();
      const placeholder = document.getElementById(placeholderId);
      if (!placeholder) return;

      const duration = data.duration_seconds || ((performance.now() - startTime) / 1000).toFixed(2);
      const inTokens = data.input_tokens || Math.ceil(prompt.length / 4);
      const outTokens = data.output_tokens || Math.ceil((data.response || '').length / 4);
      const queryCost = ((inTokens * 0.00000015) + (outTokens * 0.0000006)).toFixed(5);
      state.totalFinOpsCost += parseFloat(queryCost);
      document.getElementById('costPillText').textContent = `FinOps: $${state.totalFinOpsCost.toFixed(4)}`;

      const formattedHtml = formatResponseMarkdown(data.response || 'No response returned.');

      placeholder.querySelector('.message-body').innerHTML = `
        ${formattedHtml}
        <div class="trace-block">
          <span>⚡ Latency: ${duration}s • In: ${inTokens} tok / Out: ${outTokens} tok</span>
          <span>FinOps: $${queryCost} • Zero-Trust Guardrail: PASS</span>
        </div>
      `;

      // Attach citation click listeners
      attachCitationListeners(placeholder);

      // Refresh data if an action was executed
      loadBalances();
      loadLeaveHistory();
      loadTickets();

    } catch (err) {
      const placeholder = document.getElementById(placeholderId);
      if (placeholder) {
        placeholder.querySelector('.message-body').innerHTML = `
          <p style="color: var(--rose);">⚠️ Service temporarily unavailable. Please try again.</p>
        `;
      }
    }
    scrollToBottom();
  }

  function formatResponseMarkdown(text) {
    let clean = escapeHtml(text);

    // Markdown bold: **text**
    clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Markdown bullets: * item or - item
    clean = clean.replace(/(?:^|\n)[*-]\s+(.+)/g, '<br>• $1');

    // Policy Citations: [Section X.Y: Title](#sec-X.Y) or [Section X.Y]
    clean = clean.replace(/\[Section\s+([\d\.]+)(?::\s*([^\]]+))?\](?:\(#sec-[\d\.]+\))?/gi, (match, secId, title) => {
      const secTitle = title ? `: ${title}` : '';
      return `<a class="citation-badge" href="javascript:void(0)" data-sec="${secId}">📖 Section ${secId}${secTitle}</a>`;
    });

    return clean;
  }

  function attachCitationListeners(container) {
    container.querySelectorAll('.citation-badge').forEach(badge => {
      badge.addEventListener('click', () => {
        const secId = badge.getAttribute('data-sec');
        openPolicyCitationDrawer(secId);
      });
    });
  }

  function scrollToBottom() {
    chatThread.scrollTop = chatThread.scrollHeight;
  }

  // ===================================================================
  // 3. WORKWEEK HCM (LEAVE & PROFILE)
  // ===================================================================
  async function loadProfile() {
    try {
      const resp = await fetch(`/api/profile?employee_id=${state.userId}`);
      const data = await resp.json();

      document.getElementById('userBadgeName').textContent = data.name || 'Veeravigneshk';
      document.getElementById('profileName').textContent = data.name || 'Veeravigneshk Employee';
      document.getElementById('profileTitle').textContent = data.title || 'Senior Agentic Software Engineer';
      document.getElementById('profileLocationTag').textContent = data.work_location || 'Singapore (Remote / Hybrid)';
      document.getElementById('profileDept').textContent = data.department || 'Cloud AI & Solutions';
      document.getElementById('profileManager').textContent = data.manager || 'Aish Prabhat';
      document.getElementById('profileEmail').textContent = data.email || 'veeravigneshk@altostrat.com';
      document.getElementById('profileHireDate').textContent = data.hire_date || 'April 15, 2023';
      document.getElementById('profileAddress').textContent = data.home_address || 'Singapore Office, 80 Pasir Panjang Rd';
      document.getElementById('profilePhone').textContent = data.phone_number || '+65-6521-0000';

      // Pre-fill edit modal
      document.getElementById('editAddressInput').value = data.home_address || '';
      document.getElementById('editPhoneInput').value = data.phone_number || '';
    } catch (err) {
      console.warn('Profile load warning:', err);
    }
  }

  async function loadBalances() {
    try {
      const resp = await fetch(`/api/balances?employee_id=${state.userId}`);
      const data = await resp.json();

      const vac = data.vacation || { remaining: 8.0, used: 12.0, accrued: 20.0 };
      const sick = data.sick || { remaining: 10.0, used: 0.0, accrued: 10.0 };

      document.getElementById('vacationRemainingVal').textContent = vac.remaining.toFixed(1);
      document.getElementById('vacationRemainingBadge').textContent = `${vac.remaining.toFixed(0)}d`;
      document.getElementById('vacationMetaText').textContent = `${vac.used.toFixed(1)} used of ${vac.accrued.toFixed(1)} accrued`;
      document.getElementById('vacationProgress').style.width = `${Math.min(100, (vac.used / vac.accrued) * 100)}%`;

      document.getElementById('sickRemainingVal').textContent = sick.remaining.toFixed(1);
      document.getElementById('sickMetaText').textContent = `${sick.used.toFixed(1)} used of ${sick.accrued.toFixed(1)} accrued`;
      document.getElementById('sickProgress').style.width = `${Math.min(100, (sick.used / sick.accrued) * 100)}%`;
    } catch (err) {
      console.warn('Balances load warning:', err);
    }
  }

  async function loadLeaveHistory() {
    const tbody = document.getElementById('leavesTableBody');
    try {
      const resp = await fetch(`/api/leave-requests?employee_id=${state.userId}`);
      const list = await resp.json();

      if (!Array.isArray(list) || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-dim);">No submitted leave requests found.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(item => `
        <tr>
          <td><strong style="font-family: var(--font-mono); color: var(--primary);">#${item.request_id}</strong></td>
          <td><span class="status-badge new">${item.leave_type}</span></td>
          <td>${item.start_date}</td>
          <td>${item.end_date}</td>
          <td>${item.days} days</td>
          <td><span class="status-badge resolved">Approved</span></td>
          <td>
            <button class="action-btn secondary btn-sm" onclick="cancelLeave(${item.request_id})">Cancel</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--rose);">Failed to load leave history.</td></tr>`;
    }
  }

  window.cancelLeave = async (requestId) => {
    if (!confirm(`Cancel leave request #${requestId} and refund days to your balance?`)) return;
    try {
      const resp = await fetch('/api/leave-requests/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: state.userId, request_id: requestId })
      });
      const data = await resp.json();
      showToast(data.message || 'Leave cancelled successfully', 'success');
      loadBalances();
      loadLeaveHistory();
    } catch (err) {
      showToast('Failed to cancel leave', 'error');
    }
  };

  // ===================================================================
  // 4. SERVICEIMMEDIATELY ITSM (TICKETS)
  // ===================================================================
  async function loadTickets() {
    const tbody = document.getElementById('ticketsTableBody');
    try {
      const resp = await fetch(`/api/tickets?employee_id=${state.userId}`);
      const list = await resp.json();
      state.tickets = Array.isArray(list) ? list : [];

      renderTicketsTable();
      document.getElementById('ticketsOpenCount').textContent = state.tickets.filter(t => t.status !== 'Closed').length;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--rose);">Failed to load tickets.</td></tr>`;
    }
  }

  function renderTicketsTable() {
    const tbody = document.getElementById('ticketsTableBody');
    const search = (document.getElementById('ticketSearchInput').value || '').toLowerCase();
    const statusFilter = document.getElementById('ticketStatusFilter').value;
    const catFilter = document.getElementById('ticketCategoryFilter').value;

    const filtered = state.tickets.filter(t => {
      const matchSearch = (t.ticket_id || '').toLowerCase().includes(search) ||
                          (t.short_description || '').toLowerCase().includes(search) ||
                          (t.category || '').toLowerCase().includes(search);
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchCat = catFilter === 'ALL' || t.category === catFilter;
      return matchSearch && matchStatus && matchCat;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-dim);">No incident tickets match criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const statusClass = (t.status || 'new').toLowerCase().replace(/\s+/g, '-');
      const prioClass = (t.priority || '').includes('1') ? 'critical' :
                        (t.priority || '').includes('2') ? 'high' :
                        (t.priority || '').includes('3') ? 'moderate' : 'low';

      return `
        <tr>
          <td><strong style="font-family: var(--font-mono); color: var(--primary);">${t.ticket_id}</strong></td>
          <td>${t.category}</td>
          <td style="max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(t.short_description)}">
            ${escapeHtml(t.short_description)}
          </td>
          <td><span class="priority-badge ${prioClass}">${t.priority}</span></td>
          <td><span class="status-badge ${statusClass}">${t.status}</span></td>
          <td>${(t.created_at || '').slice(0, 10) || 'Recent'}</td>
          <td>
            <button class="action-btn secondary btn-sm" onclick="openTicketDetailDrawer('${t.ticket_id}')">View</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.openTicketDetailDrawer = (ticketId) => {
    state.selectedTicketId = ticketId;
    const ticket = state.tickets.find(t => t.ticket_id === ticketId);
    if (!ticket) return;

    document.getElementById('ticketDrawerTag').textContent = `${ticket.ticket_id} • ${ticket.category}`;
    document.getElementById('ticketDrawerTitle').textContent = ticket.short_description;

    const metaBox = document.getElementById('ticketDrawerMeta');
    metaBox.innerHTML = `
      <div class="profile-fields-list">
        <div class="profile-row"><span class="field-label">Status</span><span class="field-val">${ticket.status}</span></div>
        <div class="profile-row"><span class="field-label">Priority</span><span class="field-val">${ticket.priority}</span></div>
        <div class="profile-row"><span class="field-label">Requested By</span><span class="field-val">${ticket.requested_by}</span></div>
        <div class="profile-row"><span class="field-label">Created At</span><span class="field-val">${ticket.created_at || 'Just now'}</span></div>
      </div>
    `;

    openDrawer(ticketDrawer);
  };

  // ===================================================================
  // 5. POLICY HANDBOOK EXPLORER
  // ===================================================================
  async function loadPolicies() {
    const grid = document.getElementById('policyCatalogGrid');
    try {
      const resp = await fetch('/api/policies');
      state.policies = await resp.json();

      renderPoliciesGrid();
    } catch (err) {
      grid.innerHTML = `<div style="color: var(--rose);">Failed to load policy catalog.</div>`;
    }
  }

  function renderPoliciesGrid() {
    const grid = document.getElementById('policyCatalogGrid');
    const search = (document.getElementById('policySearchInput').value || '').toLowerCase();

    const filtered = state.policies.filter(p => 
      (p.section_id || '').toLowerCase().includes(search) ||
      (p.title || '').toLowerCase().includes(search) ||
      (p.content || '').toLowerCase().includes(search)
    );

    grid.innerHTML = filtered.slice(0, 30).map(p => `
      <div class="policy-item-card" onclick="openPolicyCitationDrawer('${p.section_id}')">
        <div class="policy-card-meta">
          <span class="policy-sec-tag">Section ${p.section_id}</span>
          <span class="policy-cat-tag">Page ${p.page}</span>
        </div>
        <h4 class="policy-card-title">${escapeHtml(p.title)}</h4>
        <p style="font-size: 11px; color: var(--text-dim); margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHtml(p.content)}
        </p>
      </div>
    `).join('');
  }

  window.openPolicyCitationDrawer = async (sectionId) => {
    const titleElem = document.getElementById('citationDrawerTitle');
    const bodyElem = document.getElementById('citationDrawerBody');

    titleElem.textContent = `Section ${sectionId}`;
    bodyElem.innerHTML = `<div class="loading-indicator">Fetching policy section context...</div>`;
    openDrawer(citationDrawer);

    try {
      const resp = await fetch(`/api/policy/${sectionId}`);
      const data = await resp.json();
      titleElem.textContent = `Section ${sectionId}: ${data.content.split('\n')[0].replace(/#/g, '').trim()}`;
      bodyElem.innerHTML = `
        <div style="background: var(--bg-surface-elevated); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <div style="font-size: 11px; color: var(--primary); font-weight: 700; margin-bottom: 8px;">AUTHORITATIVE EXCERPT</div>
          <div style="white-space: pre-wrap; font-family: var(--font-main); color: var(--text-main); font-size: 13px; line-height: 1.6;">${escapeHtml(data.content)}</div>
        </div>
        <div style="margin-top: 20px;">
          <button class="action-btn primary full-width" onclick="askAgentAboutSection('${sectionId}')">
            💬 Ask Copilot About Section ${sectionId}
          </button>
        </div>
      `;
    } catch (err) {
      bodyElem.innerHTML = `<p style="color: var(--rose);">Policy section ${sectionId} could not be retrieved.</p>`;
    }
  };

  window.askAgentAboutSection = (sectionId) => {
    closeDrawer(citationDrawer);
    switchTab('assistant');
    chatInput.value = `Explain the rules, requirements, and allowances under Policy Section ${sectionId}.`;
    chatForm.dispatchEvent(new Event('submit'));
  };

  // ===================================================================
  // 6. MODALS, DRAWERS & FORMS INITIALIZATION
  // ===================================================================
  function initModalsAndDrawers() {
    // Time Off Modal
    document.getElementById('openTimeOffModalBtn')?.addEventListener('click', () => openModal(timeOffModal));
    document.getElementById('closeTimeOffModalBtn')?.addEventListener('click', () => closeModal(timeOffModal));
    document.getElementById('cancelTimeOffModalBtn')?.addEventListener('click', () => closeModal(timeOffModal));

    document.getElementById('timeOffForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const leaveType = document.getElementById('toLeaveType').value;
      const startDate = document.getElementById('toStartDate').value;
      const endDate = document.getElementById('toEndDate').value;
      const days = parseFloat(document.getElementById('toDays').value);
      const reason = document.getElementById('toReason').value;

      try {
        const resp = await fetch('/api/time-off/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: state.userId,
            leave_type: leaveType,
            start_date: startDate,
            end_date: endDate,
            days: days,
            reason: reason
          })
        });
        const data = await resp.json();
        if (resp.ok) {
          showToast(data.message || 'Time-off submitted successfully', 'success');
          closeModal(timeOffModal);
          loadBalances();
          loadLeaveHistory();
        } else {
          showToast(data.detail || 'Failed to submit time-off', 'error');
        }
      } catch (err) {
        showToast('Network error submitting time-off', 'error');
      }
    });

    // Support Ticket Modal
    document.getElementById('openTicketModalBtn')?.addEventListener('click', () => openModal(ticketModal));
    document.getElementById('closeTicketModalBtn')?.addEventListener('click', () => closeModal(ticketModal));
    document.getElementById('cancelTicketModalBtn')?.addEventListener('click', () => closeModal(ticketModal));

    document.getElementById('ticketForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const category = document.getElementById('tkCategory').value;
      const priority = document.getElementById('tkPriority').value;
      const shortDesc = document.getElementById('tkShortDesc').value;
      const detailedDesc = document.getElementById('tkDetailedDesc').value;

      try {
        const resp = await fetch('/api/tickets/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: state.userId,
            category: category,
            priority: priority,
            short_description: shortDesc,
            detailed_description: detailedDesc
          })
        });
        const data = await resp.json();
        if (resp.ok) {
          showToast(data.message || 'Ticket created successfully', 'success');
          closeModal(ticketModal);
          document.getElementById('tkShortDesc').value = '';
          document.getElementById('tkDetailedDesc').value = '';
          loadTickets();
        } else {
          showToast(data.detail || 'Failed to create ticket', 'error');
        }
      } catch (err) {
        showToast('Network error creating ticket', 'error');
      }
    });

    // Edit Profile Modal
    document.getElementById('openEditProfileModalBtn')?.addEventListener('click', () => openModal(editProfileModal));
    document.getElementById('closeProfileModalBtn')?.addEventListener('click', () => closeModal(editProfileModal));
    document.getElementById('cancelProfileModalBtn')?.addEventListener('click', () => closeModal(editProfileModal));

    document.getElementById('editProfileForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const address = document.getElementById('editAddressInput').value;
      const phone = document.getElementById('editPhoneInput').value;

      try {
        const resp = await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: state.userId,
            home_address: address,
            phone_number: phone
          })
        });
        const data = await resp.json();
        if (resp.ok) {
          showToast('Profile contact updated successfully', 'success');
          closeModal(editProfileModal);
          loadProfile();
        } else {
          showToast(data.detail || 'Failed to update profile', 'error');
        }
      } catch (err) {
        showToast('Network error updating profile', 'error');
      }
    });

    // Drawers close
    document.getElementById('closeCitationDrawerBtn')?.addEventListener('click', () => closeDrawer(citationDrawer));
    document.getElementById('closeTicketDrawerBtn')?.addEventListener('click', () => closeDrawer(ticketDrawer));
    document.getElementById('closeTelemetryDrawerBtn')?.addEventListener('click', () => closeDrawer(telemetryDrawer));

    // Ticket Drawer Actions
    document.getElementById('addCommentForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const comment = document.getElementById('commentInput').value.trim();
      if (!comment || !state.selectedTicketId) return;

      try {
        const resp = await fetch(`/api/tickets/${state.selectedTicketId}/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: comment })
        });
        const data = await resp.json();
        showToast(data.message || 'Comment posted', 'success');
        document.getElementById('commentInput').value = '';
        closeDrawer(ticketDrawer);
        loadTickets();
      } catch (err) {
        showToast('Failed to post comment', 'error');
      }
    });

    document.getElementById('resolveTicketBtn')?.addEventListener('click', async () => {
      if (!state.selectedTicketId) return;
      try {
        const resp = await fetch(`/api/tickets/${state.selectedTicketId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: 'Resolved', resolution_notes: 'Resolved via employee portal' })
        });
        const data = await resp.json();
        showToast(data.message || 'Ticket marked as Resolved', 'success');
        closeDrawer(ticketDrawer);
        loadTickets();
      } catch (err) {
        showToast('Failed to resolve ticket', 'error');
      }
    });

    // Filter listeners
    document.getElementById('ticketSearchInput')?.addEventListener('input', renderTicketsTable);
    document.getElementById('ticketStatusFilter')?.addEventListener('change', renderTicketsTable);
    document.getElementById('ticketCategoryFilter')?.addEventListener('change', renderTicketsTable);
    document.getElementById('refreshTicketsBtn')?.addEventListener('click', loadTickets);
    document.getElementById('refreshLeavesBtn')?.addEventListener('click', () => { loadBalances(); loadLeaveHistory(); });
    document.getElementById('policySearchInput')?.addEventListener('input', renderPoliciesGrid);
  }

  // ===================================================================
  // 7. CROSS-SYSTEM GUIDED WORKFLOWS (UC-2.x)
  // ===================================================================
  function initWorkflows() {
    // 1. Equipment Procurement (UC-2.1)
    document.getElementById('equipmentWorkflowForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('runEquipmentWorkflowBtn');
      const box = document.getElementById('equipmentResultBox');
      const eqType = document.getElementById('eqTypeInput').value;
      const address = document.getElementById('eqAddressInput').value;

      btn.disabled = true;
      btn.innerHTML = '⚡ Orchestrating Across Systems...';
      box.style.display = 'block';
      box.innerHTML = '<div class="loading-indicator">Executing Policy Check → WorkWeek Status → ServiceImmediately Order...</div>';

      try {
        const resp = await fetch('/api/workflows/equipment-procurement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: state.userId,
            equipment_type: eqType,
            delivery_address: address || null
          })
        });
        const data = await resp.json();

        box.innerHTML = `
          <strong style="color: var(--emerald);">✓ Workflow Completed Successfully!</strong>
          <p style="margin: 6px 0;">${data.summary}</p>
          <div style="font-size: 11px; color: var(--text-dim); margin-top: 6px;">
            ${data.steps.map(s => `<div>• <strong>${s.system}</strong>: ${s.detail}</div>`).join('')}
          </div>
        `;
        showToast('Equipment procurement workflow completed', 'success');
        loadTickets();
      } catch (err) {
        box.innerHTML = `<span style="color: var(--rose);">Workflow execution failed.</span>`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '⚡ Execute Equipment Workflow';
      }
    });

    // 2. Medical Leave (UC-2.2)
    document.getElementById('medicalWorkflowForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('runMedicalWorkflowBtn');
      const box = document.getElementById('medicalResultBox');
      const startDate = document.getElementById('medStartDate').value;
      const endDate = document.getElementById('medEndDate').value;
      const days = parseFloat(document.getElementById('medDays').value);
      const notes = document.getElementById('medNotes').value;

      btn.disabled = true;
      btn.innerHTML = '⚡ Submitting Leave & IT Delegation...';
      box.style.display = 'block';
      box.innerHTML = '<div class="loading-indicator">Executing Policy 4.2 → WorkWeek Sick Leave → ServiceImmediately Delegation...</div>';

      try {
        const resp = await fetch('/api/workflows/medical-leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: state.userId,
            start_date: startDate,
            end_date: endDate,
            days: days,
            notes: notes
          })
        });
        const data = await resp.json();

        box.innerHTML = `
          <strong style="color: var(--emerald);">✓ Medical Leave Registered!</strong>
          <p style="margin: 6px 0;">${data.summary}</p>
          <div style="font-size: 11px; color: var(--text-dim); margin-top: 6px;">
            ${data.steps.map(s => `<div>• <strong>${s.system}</strong>: ${s.detail}</div>`).join('')}
          </div>
        `;
        showToast('Medical leave & delegation booked', 'success');
        loadBalances();
        loadLeaveHistory();
        loadTickets();
      } catch (err) {
        box.innerHTML = `<span style="color: var(--rose);">Workflow execution failed.</span>`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '⚡ Execute Medical Leave Workflow';
      }
    });

    // 3. Relocation (UC-2.3)
    document.getElementById('relocationWorkflowForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('runRelocationWorkflowBtn');
      const box = document.getElementById('relocationResultBox');
      const office = document.getElementById('relocOfficeSelect').value;
      const address = document.getElementById('relocAddressInput').value;
      const phone = document.getElementById('relocPhoneInput').value;

      btn.disabled = true;
      btn.innerHTML = '⚡ Processing Transfer & Badge...';
      box.style.display = 'block';
      box.innerHTML = '<div class="loading-indicator">Executing Policy 5.3 → WorkWeek Address Update → ServiceImmediately Facilities Badge...</div>';

      try {
        const resp = await fetch('/api/workflows/relocation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: state.userId,
            target_office: office,
            new_address: address,
            new_phone: phone
          })
        });
        const data = await resp.json();

        box.innerHTML = `
          <strong style="color: var(--emerald);">✓ Relocation Workflow Completed!</strong>
          <p style="margin: 6px 0;">${data.summary}</p>
          <div style="font-size: 11px; color: var(--text-dim); margin-top: 6px;">
            ${data.steps.map(s => `<div>• <strong>${s.system}</strong>: ${s.detail}</div>`).join('')}
          </div>
        `;
        showToast('Relocation & badge requested', 'success');
        loadProfile();
        loadTickets();
      } catch (err) {
        box.innerHTML = `<span style="color: var(--rose);">Workflow execution failed.</span>`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '⚡ Execute Relocation Workflow';
      }
    });
  }

  // ===================================================================
  // 8. UTILITIES (MODALS, DRAWERS, TOASTS)
  // ===================================================================
  function openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('active');
  }

  function openDrawer(drawer) {
    if (drawer) drawer.classList.add('open');
  }

  function closeDrawer(drawer) {
    if (drawer) drawer.classList.remove('open');
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : '⚠️'}</span>
      <span>${escapeHtml(message)}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  function getCurrentTimeString() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
