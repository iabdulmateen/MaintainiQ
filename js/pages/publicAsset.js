// MaintainIQ Public Asset View - The scan landing page with safe info, safe activity, and AI-powered Issue Triage
import { storage } from "../storageService.js";
import { ai } from "../aiService.js";
export class PublicAssetPage {
  async render(container, params) {
    this.container = container;
    const { assetCode } = params;
    
    const asset = await storage.getAssetByCode(assetCode);
    
    if (!asset) {
      this.renderNotFound(assetCode);
      return;
    }
    this.asset = asset;
    await this.renderPublicView();
  }
  renderNotFound(code) {
    this.container.innerHTML = `
      <div class="public-container">
        <div class="glass-card" style="text-align:center; padding:40px; border-color:var(--status-critical-border);">
          <i data-lucide="shield-alert" style="width:48px; height:48px; color:var(--status-critical-text); margin-bottom:16px;"></i>
          <h2 style="color:var(--status-critical-text); margin-bottom:8px;">Asset Not Found</h2>
          <p style="color:var(--text-secondary); margin-bottom:24px;">The asset code <strong>"${code}"</strong> does not exist or has been removed from the directory.</p>
          <a href="#/" class="btn btn-secondary" style="width:100%;">Return to Home</a>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
  async renderPublicView() {
    const isRetired = this.asset.status === "Retired";
    const history = await storage.getHistory(this.asset.code);
    
    // Filter history to safe public entries (no private technician notes or costs)
    const publicHistory = history.filter(item => 
      item.action.includes("Registered") || 
      item.action.includes("Reported") || 
      item.action.includes("Inspection") || 
      item.action.includes("Resolved")
    ).slice(0, 3);
    this.container.innerHTML = `
      <div class="public-container">
        <!-- Logo Header -->
        <div class="public-header">
          <div class="app-logo" style="justify-content:center; margin-bottom:12px;">
            <i data-lucide="shield-check" style="stroke: var(--primary); stroke-width: 2.5;"></i>
            <span>MaintainIQ</span>
          </div>
          <p style="color:var(--text-muted); font-size:0.8rem; letter-spacing:0.05em; text-transform:uppercase;">Public Asset Portal</p>
        </div>
        <div class="public-card">
          <!-- Asset Status Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:16px;">
            <div>
              <h2 style="font-size:1.3rem; font-weight:800;">${this.asset.name}</h2>
              <span style="font-family:monospace; font-size:0.8rem; color:var(--text-secondary);">${this.asset.code}</span>
            </div>
            <span class="badge badge-${this.getStatusClass(this.asset.status)}" style="padding:6px 12px; font-size:0.75rem;">
              ${this.asset.status}
            </span>
          </div>
          <!-- Specifications List -->
          <div class="details-meta-list" style="margin-bottom:28px;">
            <div class="details-meta-item">
              <span class="details-meta-label">Category</span>
              <span class="details-meta-value">${this.asset.category}</span>
            </div>
            <div class="details-meta-item">
              <span class="details-meta-label">Location</span>
              <span class="details-meta-value">${this.asset.location}</span>
            </div>
            <div class="details-meta-item">
              <span class="details-meta-label">Condition</span>
              <span class="details-meta-value" style="color:${this.getConditionColor(this.asset.condition)}">${this.asset.condition}</span>
            </div>
            <div class="details-meta-item">
              <span class="details-meta-label">Last Serviced</span>
              <span class="details-meta-value">${this.asset.lastService || "Never"}</span>
            </div>
            <div class="details-meta-item">
              <span class="details-meta-label">Next Service Due</span>
              <span class="details-meta-value">${this.asset.nextService || "Unscheduled"}</span>
            </div>
          </div>
          ${isRetired ? `
            <div class="glass-card" style="border-color:var(--border-color); background:rgba(255,255,255,0.02); text-align:center; padding:16px;">
              <i data-lucide="info" style="color:var(--text-muted); width:28px; height:28px; margin-bottom:6px;"></i>
              <div style="font-weight:600; color:var(--text-secondary);">Asset Retired</div>
              <p style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">This asset has been decommissioned. New issues cannot be submitted.</p>
            </div>
          ` : `
            <!-- Action Button -->
            <button class="btn btn-primary" id="btn-report-public" style="width:100%; margin-bottom:24px; padding:12px;">
              <i data-lucide="alert-octagon"></i> Report an Issue / Request Service
            </button>
          `}
          <!-- Safe History Timeline -->
          <div>
            <h3 style="font-size:0.85rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:12px; border-top:1px solid var(--border-color); padding-top:16px;">Recent Service Trail</h3>
            ${publicHistory.length === 0 ? `
              <p style="color:var(--text-muted); font-size:0.78rem; font-style:italic;">No public activity records.</p>
            ` : `
              <div class="timeline" style="margin-top:12px;">
                ${publicHistory.map(item => `
                  <div class="timeline-item">
                    <div class="timeline-dot" style="width:8px; height:8px; left:-19px;"></div>
                    <div class="timeline-content" style="font-size:0.78rem;">
                      <div style="font-weight:600; color:var(--text-primary);">${item.action}</div>
                      <div style="color:var(--text-muted); font-size:0.72rem; margin-top:2px;">
                        ${new Date(item.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                `).join("")}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    // Attach actions
    const reportBtn = document.getElementById("btn-report-public");
    if (reportBtn) {
      reportBtn.addEventListener("click", () => this.openReportForm());
    }
  }
  // Render reporting workflow inside the public view card
  openReportForm() {
    const cardEl = document.querySelector(".public-card");
    cardEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
        <button id="btn-back-public" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center;">
          <i data-lucide="arrow-left" style="width:20px; height:20px;"></i>
        </button>
        <h2 style="font-size:1.15rem; font-weight:700;">Submit Service Request</h2>
      </div>
      <form id="form-public-report">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Your Full Name *</label>
            <input type="text" id="rep-name" class="form-input" required placeholder="e.g. Muhammad Ali">
          </div>
          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" id="rep-email" class="form-input" required placeholder="e.g. ali@smit.edu">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Describe the Issue (Natural Language) *</label>
          <textarea id="rep-complaint" class="form-textarea" rows="3" required placeholder="e.g. The display projector screen is flickering and fails to connect to HDMI..."></textarea>
          
          <div style="display:flex; justify-content:flex-end; margin-top:8px;">
            <button type="button" class="btn btn-secondary" id="btn-ai-triage" style="font-size:0.75rem; padding:6px 12px; display:flex; align-items:center; gap:6px;">
              <i data-lucide="sparkles" style="color:var(--primary); width:14px; height:14px;"></i> Run AI Triage
            </button>
          </div>
        </div>
        <!-- AI Suggestions Container (Hidden by default) -->
        <div id="ai-triage-output" style="display:none; margin-bottom:20px;">
          <!-- Injected by AI workflow -->
        </div>
        <!-- Submit Buttons -->
        <button type="submit" class="btn btn-primary" style="width:100%; padding:12px;">
          Submit Service Request
        </button>
      </form>
    `;
    if (window.lucide) window.lucide.createIcons();
    // Attach form controls
    document.getElementById("btn-back-public").addEventListener("click", () => this.renderPublicView());
    const triageBtn = document.getElementById("btn-ai-triage");
    triageBtn.addEventListener("click", () => this.runTriage());
    const form = document.getElementById("form-public-report");
    form.addEventListener("submit", (e) => this.handleReportSubmit(e));
  }
  // Triage parsing & AI UI rendering
  async runTriage() {
    const complaint = document.getElementById("rep-complaint").value.trim();
    if (!complaint) {
      alert("Please describe the issue first before running AI Triage.");
      return;
    }
    const triageBtn = document.getElementById("btn-ai-triage");
    triageBtn.disabled = true;
    triageBtn.innerHTML = `<span class="badge badge-inspection" style="padding: 2px 6px; font-size:0.65rem;">Triaging...</span>`;
    const outputEl = document.getElementById("ai-triage-output");
    outputEl.style.display = "block";
    outputEl.innerHTML = `
      <div class="ai-triage-box" style="text-align:center;">
        <span style="font-size:0.8rem; color:var(--text-muted);">Intelligent diagnostic analysis in progress...</span>
      </div>
    `;
    // Process Triage
    const result = await ai.triageComplaint(complaint, this.asset);
    this.triageResult = result; // Save to instance
    outputEl.innerHTML = `
      <div class="ai-triage-box">
        <div class="ai-triage-header">
          <span><i data-lucide="sparkles" style="display:inline-block; vertical-align:middle; width:14px; height:14px; margin-right:4px;"></i> Diagnostic Suggestions</span>
          <span class="ai-triage-badge">AI Suggested</span>
        </div>
        <div class="ai-triage-suggestions">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" style="font-size:0.75rem;">Suggested Title</label>
              <input type="text" id="ai-title" class="form-input" style="font-size:0.82rem; padding:8px;" value="${result.title}">
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:0.75rem;">Category</label>
              <input type="text" id="ai-category" class="form-input" style="font-size:0.82rem; padding:8px;" value="${result.category}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:0.75rem;">Suggested Priority</label>
            <select id="ai-priority" class="form-select" style="font-size:0.82rem; padding:8px;">
              <option value="Low" ${result.priority === "Low" ? "selected" : ""}>Low</option>
              <option value="Medium" ${result.priority === "Medium" ? "selected" : ""}>Medium</option>
              <option value="High" ${result.priority === "High" ? "selected" : ""}>High</option>
              <option value="Critical" ${result.priority === "Critical" ? "selected" : ""}>Critical</option>
            </select>
          </div>
          ${result.recurringPatternWarning ? `
            <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); padding:8px; border-radius:6px; color:#f87171; font-size:0.75rem;">
              <strong>Pattern Warning:</strong> ${result.recurringPatternWarning}
            </div>
          ` : ""}
          <div class="form-group">
            <label class="form-label" style="font-size:0.75rem;">Potential System Causes</label>
            <ul style="font-size:0.8rem; color:var(--text-secondary); padding-left:16px; display:flex; flex-direction:column; gap:4px;">
              ${result.possibleCauses.map(c => `<li>${c}</li>`).join("")}
            </ul>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:0.75rem;">Safe Actionable Checks</label>
            <div class="ai-checkbox-list">
              ${result.safeChecks.map((check, index) => `
                <label class="ai-checkbox-item">
                  <input type="checkbox" class="ai-check-item" data-index="${index}" checked>
                  <span>${check}</span>
                </label>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    // Reset Triage button state
    triageBtn.disabled = false;
    triageBtn.innerHTML = `<i data-lucide="sparkles" style="color:var(--primary); width:14px; height:14px;"></i> Run AI Triage`;
  }
  // Handle reporting submission
  async handleReportSubmit(e) {
    e.preventDefault();
    const reporterName = document.getElementById("rep-name").value.trim();
    const reporterEmail = document.getElementById("rep-email").value.trim();
    const complaint = document.getElementById("rep-complaint").value.trim();
    let title = "Maintenance Request";
    let category = "General";
    let priority = "Medium";
    let checksConfirmed = [];
    // Extract values from AI suggestions block if user triaged
    const aiTitleEl = document.getElementById("ai-title");
    if (aiTitleEl) {
      title = aiTitleEl.value.trim();
      category = document.getElementById("ai-category").value.trim();
      priority = document.getElementById("ai-priority").value;
      
      // Get checked safe items
      document.querySelectorAll(".ai-check-item").forEach(cb => {
        if (cb.checked) {
          const index = parseInt(cb.getAttribute("data-index"));
          checksConfirmed.push(this.triageResult.safeChecks[index]);
        }
      });
    } else {
      // Basic static fallbacks
      title = `Reported: ${complaint.slice(0, 30)}...`;
      category = this.asset.category;
    }
    const issueId = "ISS-" + Math.floor(1000 + Math.random() * 9000);
    // Save Issue
    await storage.saveIssue({
      id: issueId,
      assetCode: this.asset.code,
      title,
      description: complaint,
      category,
      priority,
      status: "Reported",
      reporterName,
      reporterEmail,
      assignedTechnician: "Unassigned",
      createdDate: new Date().toISOString(),
      evidenceUrl: null,
      maintenanceNotes: "",
      partsReplaced: "",
      cost: 0
    });
    // Update Asset Status
    this.asset.status = "Issue Reported";
    await storage.saveAsset(this.asset);
    // Add Asset History Entry
    const notesSummary = `Issue reported by public user ${reporterName}. Title: "${title}". Confirmed diagnostic steps: [${checksConfirmed.join(" | ") || "None"}]`;
    await storage.addHistoryEntry(
      this.asset.code,
      reporterName,
      `Issue Reported (${issueId})`,
      notesSummary,
      issueId
    );
    // Render success message
    const cardEl = document.querySelector(".public-card");
    cardEl.innerHTML = `
      <div style="text-align:center; padding:32px 0;">
        <i data-lucide="check-circle" style="width:52px; height:52px; color:var(--status-operational-text); margin-bottom:16px;"></i>
        <h2 style="color:var(--status-operational-text); margin-bottom:8px;">Request Submitted</h2>
        <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:20px;">
          Thank you. Your service ticket <strong>${issueId}</strong> has been logged. Technicians have been notified.
        </p>
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:16px; border-radius:10px; margin-bottom:24px; text-align:left; font-size:0.82rem;">
          <div style="margin-bottom:6px;"><strong>Asset Code:</strong> ${this.asset.code}</div>
          <div style="margin-bottom:6px;"><strong>Issue ID:</strong> ${issueId}</div>
          <div style="margin-bottom:6px;"><strong>Logged Priority:</strong> <span style="font-weight:bold; color:${this.getPriorityColor(priority)};">${priority}</span></div>
        </div>
        <button class="btn btn-secondary" id="btn-success-close" style="width:100%;">Return to Portal Home</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    document.getElementById("btn-success-close").addEventListener("click", () => {
      this.renderPublicView();
    });
  }
  getStatusClass(status) {
    switch (status) {
      case "Operational": return "operational";
      case "Issue Reported": return "reported";
      case "Under Inspection": return "inspection";
      case "Under Maintenance": return "maintenance";
      case "Out of Service": return "critical";
      case "Retired": return "retired";
      default: return "retired";
    }
  }
  getConditionColor(condition) {
    switch (condition) {
      case "Excellent": return "var(--status-operational-text)";
      case "Good": return "#38bdf8";
      case "Fair": return "var(--status-reported-text)";
      case "Poor": return "var(--status-critical-text)";
      default: return "var(--text-muted)";
    }
  }
  getPriorityColor(priority) {
    switch (priority) {
      case "Low": return "var(--priority-low)";
      case "Medium": return "var(--priority-medium)";
      case "High": return "var(--priority-high)";
      case "Critical": return "var(--priority-critical)";
      default: return "var(--text-muted)";
    }
  }
}
export const publicAssetPage = new PublicAssetPage();
