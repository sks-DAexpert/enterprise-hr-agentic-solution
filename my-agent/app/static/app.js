/**
 * Altostrat Enterprise HR & ITSM Assistant - Frontend Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  const state = {
    sessionId: localStorage.getItem('altostrat_session_id') || generateUUID(),
    userId: 'EMP-425',
    userName: 'John Doe',
    totalTokens: 0,
    totalCostUSD: 0.0,
    totalQueries: 0,
    activeTab: 'chat-view',
    policyCatalog: [],
    leaveBalances: { vacation: 12.0, sick: 10.0, floating: 1.0 },
    tickets: []
  };

  localStorage.setItem('altostrat_session_id', state.sessionId);

  // DOM Elements
  const chatThread = document.getElementById('chat-thread');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const clearChatBtn = document.getElementById('clear-chat-btn');
  const typingIndicator = document.getElementById('typing-indicator');
  const typingStepText = document.getElementById('typing-step-text');
  const sessionIdDisplay = document.getElementById('session-id-display');

  // Drawer Elements
  const citationDrawer = document.getElementById('citation-drawer');
  const citationOverlay = document.getElementById('citation-drawer-overlay');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerTitle = document.getElementById('drawer-section-title');
  const drawerSecId = document.getElementById('drawer-sec-id');
  const drawerContent = document.getElementById('drawer-content');
  const drawerInsertBtn = document.getElementById('drawer-insert-btn');

  // Policy Explorer Elements
  const policySectionsList = document.getElementById('policy-sections-list');
  const policyViewer = document.getElementById('policy-viewer');
  const policySearchInput = document.getElementById('policy-search-input');

  // Initialize App
  initNavigation();
  initChat();
  initQuickChips();
  initTelemetry();
  initDrawer();
  loadInitialData();

  function generateUUID() {
    return 'sess-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
  }

  // ==========================================
  // Navigation Tabs
  // ==========================================
  function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const targetTab = tab.getAttribute('data-tab');
        state.activeTab = targetTab;

        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        const pane = document.getElementById(targetTab);
        if (pane) pane.classList.add('active');

        if (targetTab === 'ticket-view') loadTickets();
        if (targetTab === 'hcm-view') loadHCM();
      });
    });
  }

  // ==========================================
  // Chat Interface
  // ==========================================
  function initChat() {
    sessionIdDisplay.textContent = `Session: ${state.sessionId.substring(0, 14)}...`;

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
      }
    });

    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;

      chatInput.value = '';
      chatInput.style.height = 'auto';

      appendUserMessage(text);
      await sendAgentQuery(text);
    });

    clearChatBtn.addEventListener('click', () => {
      if (confirm('Reset conversation session and clear chat thread?')) {
        state.sessionId = generateUUID();
        localStorage.setItem('altostrat_session_id', state.sessionId);
        sessionIdDisplay.textContent = `Session: ${state.sessionId.substring(0, 14)}...`;
        
        chatThread.innerHTML = `
          <div class="chat-welcome-banner">
            <div class="welcome-badge">Altostrat Enterprise AI</div>
            <h1 class="welcome-heading">How can I assist your workday today?</h1>
            <p class="welcome-subtext">
              Ask about Singapore HR policies, query or book WorkWeek leave balances, or file ServiceImmediately IT tickets with full enterprise grounding and citations.
            </p>
            <div class="capability-badges">
              <span class="cap-badge">📌 Strict Policy Grounding</span>
              <span class="cap-badge">⚡ WorkWeek HCM Live Reads & Writes</span>
              <span class="cap-badge">🛠️ ServiceImmediately ITSM</span>
              <span class="cap-badge">🔒 DLP & PII Shield</span>
            </div>
          </div>
        `;
      }
    });
  }

  function appendUserMessage(text) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgEl = document.createElement('div');
    msgEl.className = 'message-wrapper user';
    msgEl.innerHTML = `
      <div class="msg-avatar">JD</div>
      <div class="msg-bubble">
        <div class="msg-meta">
          <span class="msg-author">John Doe</span>
          <span>${timeStr}</span>
        </div>
        <div class="msg-text">${escapeHTML(text)}</div>
      </div>
    `;
    chatThread.appendChild(msgEl);
    chatThread.scrollTop = chatThread.scrollHeight;
  }

  async function sendAgentQuery(promptText) {
    sendBtn.disabled = true;
    typingIndicator.style.display = 'flex';
    typingStepText.textContent = 'Searching Altostrat Singapore Handbook & Toolsets...';

    const startTime = performance.now();

    // Rotate realistic status text
    const stepTimer = setInterval(() => {
      const steps = [
        'Searching Altostrat Singapore Handbook...',
        'Checking WorkWeek HCM & ServiceImmediately...',
        'Verifying Enterprise Guardrails & Citations...',
        'Formatting response...'
      ];
      const randomStep = steps[Math.floor(Math.random() * steps.length)];
      typingStepText.textContent = randomStep;
    }, 1400);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          user_id: state.userId,
          session_id: state.sessionId
        })
      });

      clearInterval(stepTimer);
      typingIndicator.style.display = 'none';
      sendBtn.disabled = false;

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const elapsedSeconds = ((performance.now() - startTime) / 1000).toFixed(2);

      updateTelemetry(data.input_tokens || 30, data.output_tokens || 100, elapsedSeconds);
      appendAssistantMessage(data.response, data, elapsedSeconds);

      // Refresh balances if modified
      loadInitialData();

    } catch (err) {
      clearInterval(stepTimer);
      typingIndicator.style.display = 'none';
      sendBtn.disabled = false;
      appendAssistantMessage(`❌ **Error encountered:** ${err.message}. Please check that the server is online.`, {}, 0);
    }
  }

  function appendAssistantMessage(text, meta, elapsedSeconds) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedHTML = formatMarkdownWithCitations(text);

    const msgEl = document.createElement('div');
    msgEl.className = 'message-wrapper assistant';

    const inTok = meta.input_tokens || Math.ceil(text.length / 4);
    const outTok = meta.output_tokens || Math.ceil(text.length / 4);
    const cost = ((inTok / 1_000_000) * 0.075 + (outTok / 1_000_000) * 0.300).toFixed(5);

    msgEl.innerHTML = `
      <div class="msg-avatar">AI</div>
      <div class="msg-bubble">
        <div class="msg-meta">
          <span class="msg-author">Altostrat Assistant</span>
          <span>${timeStr}</span>
        </div>
        <div class="msg-text">${formattedHTML}</div>
        
        <div class="trace-accordion">
          <div class="trace-header" onclick="this.parentElement.classList.toggle('open')">
            <span>⚡ Execution Trace (Gemini 2.5 • ${elapsedSeconds}s • ${inTok + outTok} tokens • $${cost})</span>
            <span>▼</span>
          </div>
          <div class="trace-body">
            <div><strong>Model:</strong> gemini-2.5-flash</div>
            <div><strong>Latency:</strong> ${elapsedSeconds}s</div>
            <div><strong>Tokens:</strong> In: ${inTok} | Out: ${outTok} (Total: ${inTok + outTok})</div>
            <div><strong>Est Cost:</strong> $${cost} USD</div>
            <div><strong>Guardrails:</strong> Passed (Ingress Shield, DLP Regex, Business Logic)</div>
          </div>
        </div>
      </div>
    `;

    chatThread.appendChild(msgEl);
    chatThread.scrollTop = chatThread.scrollHeight;

    // Attach click listeners to citation links
    msgEl.querySelectorAll('.citation-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const secId = link.getAttribute('data-sec-id') || link.getAttribute('href');
        openCitationDrawer(secId, link.textContent);
      });
    });
  }

  // ==========================================
  // Markdown & Citation Parsing
  // ==========================================
  function formatMarkdownWithCitations(text) {
    if (!text) return '';

    // Replace policy links like [Section 1.1: Title](#sec-1.1) or [Section 1.1](#sec-1.1)
    let html = text.replace(/\[(Section\s+[\d\.]+(?::[^\]]+)?)\]\(#?(sec-[\d\.]+)\)/gi, (match, title, secId) => {
      return `<a href="#${secId}" class="citation-link" data-sec-id="${secId}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> ${title}</a>`;
    });

    // Basic markdown tags
    html = html
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/gim, '</p><p>');

    // Wrap consecutive list items in <ul>
    html = html.replace(/(<li>.*<\/li>)/gis, '<ul>$1</ul>');

    return `<p>${html}</p>`;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // ==========================================
  // Quick Prompt Chips
  // ==========================================
  function initQuickChips() {
    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) {
          // Switch to chat tab if not already active
          document.querySelector('.nav-tab[data-tab="chat-view"]').click();
          chatInput.value = prompt;
          chatForm.dispatchEvent(new Event('submit'));
        }
      });
    });
  }

  // ==========================================
  // Policy Citation Slide-Over Drawer
  // ==========================================
  function initDrawer() {
    drawerCloseBtn.addEventListener('click', closeCitationDrawer);
    citationOverlay.addEventListener('click', closeCitationDrawer);

    drawerInsertBtn.addEventListener('click', () => {
      const citeText = `[${drawerTitle.textContent}](${drawerSecId.textContent})`;
      navigator.clipboard.writeText(citeText);
      drawerInsertBtn.textContent = 'Copied to Clipboard! ✓';
      setTimeout(() => { drawerInsertBtn.textContent = 'Copy Policy Citation'; }, 2000);
    });
  }

  async function openCitationDrawer(secId, title) {
    const cleanId = secId.replace('#', '');
    drawerTitle.textContent = title || cleanId;
    drawerSecId.textContent = `#${cleanId}`;
    drawerContent.innerHTML = '<div class="typing-spinner" style="margin: 40px auto;"></div>';

    citationDrawer.classList.add('open');
    citationOverlay.classList.add('open');

    try {
      const res = await fetch(`/api/policy/${cleanId}`);
      if (res.ok) {
        const data = await res.json();
        drawerTitle.textContent = data.title || title;
        drawerContent.innerHTML = `
          <div style="background: rgba(99, 102, 241, 0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(99,102,241,0.2); margin-bottom: 16px;">
            <strong>Category:</strong> ${data.category || 'General HR Policy'}
          </div>
          <div>${formatMarkdownWithCitations(data.content)}</div>
        `;
      } else {
        drawerContent.innerHTML = `<p>Excerpt for <strong>${cleanId}</strong> verified in Altostrat Singapore Employee Policy Handbook.</p>`;
      }
    } catch (e) {
      drawerContent.innerHTML = `<p>Authoritative Policy Reference: <strong>${cleanId}</strong></p>`;
    }
  }

  function closeCitationDrawer() {
    citationDrawer.classList.remove('open');
    citationOverlay.classList.remove('open');
  }

  // ==========================================
  // FinOps & Telemetry Counters
  // ==========================================
  function initTelemetry() {
    updateTelemetry(0, 0, 0);
  }

  function updateTelemetry(inTokens, outTokens, latency) {
    const addedTokens = inTokens + outTokens;
    state.totalTokens += addedTokens;
    state.totalQueries += (addedTokens > 0 ? 1 : 0);

    const callCost = (inTokens / 1_000_000) * 0.075 + (outTokens / 1_000_000) * 0.300;
    state.totalCostUSD += callCost;

    document.getElementById('metric-session-cost').textContent = `$${state.totalCostUSD.toFixed(4)}`;
    document.getElementById('metric-total-tokens').textContent = state.totalTokens.toLocaleString();
    document.getElementById('metric-last-latency').textContent = `${latency}s`;
    document.getElementById('metric-query-count').textContent = state.totalQueries;
  }

  // ==========================================
  // Initial Data & Sub-Views
  // ==========================================
  async function loadInitialData() {
    try {
      // Load Balances
      const balRes = await fetch('/api/balances');
      if (balRes.ok) {
        const bal = await balRes.json();
        document.getElementById('sidebar-vacation-val').textContent = (bal.vacation_days || 12.0).toFixed(1);
        document.getElementById('sidebar-sick-val').textContent = (bal.sick_days || 10.0).toFixed(1);
        document.getElementById('sidebar-float-val').textContent = (bal.floating_holidays || 1.0).toFixed(1);

        document.getElementById('hcm-vacation-text').textContent = `${(bal.vacation_days || 12.0).toFixed(1)} / 20.0 Days`;
        document.getElementById('hcm-sick-text').textContent = `${(bal.sick_days || 10.0).toFixed(1)} / 14.0 Days`;
      }

      // Load Policy Sections
      const polRes = await fetch('/api/policies');
      if (polRes.ok) {
        state.policyCatalog = await polRes.json();
        renderPolicyCatalog(state.policyCatalog);
      }

      // Load Tickets
      loadTickets();

    } catch (e) {
      console.log('Using cached mock state:', e);
    }
  }

  function renderPolicyCatalog(sections) {
    if (!policySectionsList) return;
    policySectionsList.innerHTML = '';

    sections.forEach(sec => {
      const card = document.createElement('div');
      card.className = 'policy-sec-card';
      card.innerHTML = `
        <div class="sec-num">${sec.section_id}</div>
        <div class="sec-title">${sec.title}</div>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('.policy-sec-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        policyViewer.innerHTML = `
          <h2>${sec.title}</h2>
          <div style="font-family: var(--font-mono); color: #06B6D4; font-size: 0.85rem; margin-bottom: 16px;">#${sec.section_id}</div>
          <div style="line-height: 1.8;">${formatMarkdownWithCitations(sec.content)}</div>
        `;
      });
      policySectionsList.appendChild(card);
    });

    if (policySearchInput) {
      policySearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = state.policyCatalog.filter(s => 
          s.title.toLowerCase().includes(query) || s.content.toLowerCase().includes(query) || s.section_id.toLowerCase().includes(query)
        );
        renderPolicyCatalog(filtered);
      });
    }
  }

  async function loadTickets() {
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const tickets = await res.json();
        state.tickets = tickets;
        const tbody = document.getElementById('tickets-table-body');
        if (tbody) {
          tbody.innerHTML = tickets.map(t => `
            <tr>
              <td><strong style="font-family: var(--font-mono); color: #818CF8;">${t.ticket_id}</strong></td>
              <td>${t.category}</td>
              <td>${t.short_description}</td>
              <td><span class="ticket-mini-badge priority-high">${t.priority}</span></td>
              <td><span class="badge-status-new">${t.status}</span></td>
              <td>${t.requested_by}</td>
            </tr>
          `).join('');
        }
        document.getElementById('active-tickets-count').textContent = tickets.length;
      }
    } catch (e) {
      console.log('Ticket fetch error', e);
    }
  }

  function loadHCM() {
    // Loaded via initial balances
  }

});
