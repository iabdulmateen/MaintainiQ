// MaintainIQ Issues Page - Handles Technician assignment, workflow controls, diagnostics, and AI Summary reports
import { storage } from "../storageService.js";
import { ai } from "../aiService.js";
export class IssuesPage {
  constructor() {
    this.currentPriorityFilter = "all";
    this.currentStatusFilter = "all";
    this.currentSearchQuery = "";
  }
  async render(container) {
    this.container = container;
    await this.renderList();
  }
  async renderList() {
    const issues = await storage.getIssues();
    const assets = await storage.getAssets();
    const activeRole = localStorage.getItem("maintainiq_active_role") || "admin";
    const currentUserName = localStorage.getItem("maintainiq_user_name") || "Technician";
    // Filter issues
    const filteredIssues = issues.filter(issue => {
      const matchesPriority = this.currentPriorityFilter === "all" || issue.priority === this.currentPriorityFilter;
      const matchesStatus = this.currentStatusFilter === "all" || issue.status === this.currentStatusFilter;
      const term = this.currentSearchQuery.toLowerCase();
      const matchesSearch = 
        issue.title.toLowerCase().includes(term) ||
        issue.assetCode.toLowerCase().includes(term) ||
        issue.id.toLowerCase().includes(term);
      return matchesPriority && matchesStatus && matchesSearch;
    });
    this.container.innerHTML = `
      <div class="grid-actions-bar">
        <!-- Search -->
        <div class="search-input-wrapper">
          <i data-lucide="search" class="search-icon"></i>
          <input type="text" id="issue-search" class="form-input search-input" placeholder="Search issues by ID, title, asset..." value="${this.currentSearchQuery}">
        </div>
        <!-- Filters -->
        <div style="display:flex; gap:12px; align-items:center;">
          <select id="issue-priority-filter" class="form-select" style="width:140px; padding:10px;">
            <option value="all" ${this.currentPriorityFilter === "all" ? "selected" : ""}>All Priorities</option>
            <option value="Low" ${this.currentPriorityFilter === "Low" ? "selected" : ""}>Low</option>
            <option value="Medium" ${this.currentPriorityFilter === "Medium" ? "selected" : ""}>Medium</option>
            <option value="High" ${this.currentPriorityFilter === "High" ? "selected" : ""}>High</option>
            <option value="Critical" ${this.currentPriorityFilter === "Critical" ? "selected" : ""}>Critical</option>
          </select>
          <select id="issue-status-filter" class="form-select" style="width:180px; padding:10px;">
            <option value="all" ${this.currentStatusFilter === "all" ? "selected" : ""}>All Statuses</option>
            <option value="Reported" ${this.currentStatusFilter === "Reported" ? "selected" : ""}>Reported</option>
            <option value="Assigned" ${this.currentStatusFilter === "Assigned" ? "selected" : ""}>Assigned</option>
            <option value="Inspection Started" ${this.currentStatusFilter === "Inspection Started" ? "selected" : ""}>Inspection Started</option>
            <option value="Maintenance In Progress" ${this.currentStatusFilter === "Maintenance In Progress" ? "selected" : ""}>Maintenance In Progress</option>
            <option value="Waiting for Parts" ${this.currentStatusFilter === "Waiting for Parts" ? "selected" : ""}>Waiting for Parts</option>
            <option value="Resolved" ${this.currentStatusFilter === "Resolved" ? "selected" : ""}>Resolved</option>
            <option value="Closed" ${this.currentStatusFilter === "Closed" ? "selected" : ""}>Closed</option>
            <option value="Reopened" ${this.currentStatusFilter === "Reopened" ? "selected" : ""}>Reopened</option>
          </select>
        </div>
      </div>
      <div class="glass-card">
        <div class="data-table-wrapper">
          ${filteredIssues.length === 0 ? `
            <div style="text-align:center; padding:48px; color:var(--text-muted);">
              <i data-lucide="wrench" style="width:48px; height:48px; margin-bottom:12px;"></i>
              <h3>No Maintenance Issues Found</h3>
              <p style="margin-top:8px;">All assets are currently behaving normally.</p>
            </div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Asset</th>
                  <th>Issue Details</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned Tech</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredIssues.map(issue => {
                  const asset = assets.find(a => a.code === issue.assetCode) || { name: issue.assetCode };
                  const isCritical = issue.priority === "Critical" || issue.priority === "High";
                  
                  return `
                    <tr style="${isCritical ? 'border-left: 3px solid var(--priority-critical); background: rgba(239, 68, 68, 0.01);' : ''}">
                      <td style="font-family:monospace; font-weight:700; color:var(--text-secondary);">${issue.id}</td>
                      <td>
                        <div style="font-weight:600; color:var(--text-primary);">${asset.name}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${issue.assetCode}</div>
                      </td>
                      <td>
                        <div style="font-weight:600; ${isCritical ? 'color:#fff;' : 'color:var(--text-primary);'}">${issue.title}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                          ${issue.description}
                        </div>
                      </td>
                      <td>
                        <span style="font-weight:bold; color:${this.getPriorityColor(issue.priority)}; display:flex; align-items:center; gap:6px;">
                          ${issue.priority === "Critical" ? '<span style="width:8px; height:8px; border-radius:50%; background:red; display:inline-block; animation:pulse 1s infinite;"></span>' : ''}
                          ${issue.priority}
                        </span>
                      </td>
                      <td>
                        <span class="badge badge-${this.getStatusClass(issue.status)}">${issue.status}</span>
                      </td>
                      <td>
                        ${activeRole === "admin" && issue.status !== "Resolved" && issue.status !== "Closed" ? `
                          <select class="form-select select-tech-assign" data-id="${issue.id}" style="padding:6px; font-size:0.8rem; width:150px; background:rgba(255,255,255,0.03);">
                            <option value="Unassigned" ${issue.assignedTechnician === "Unassigned" ? "selected" : ""}>Unassigned</option>
                            <option value="Sajid Khan" ${issue.assignedTechnician === "Sajid Khan" ? "selected" : ""}>Sajid Khan</option>
                            <option value="Arsalan Ahmed" ${issue.assignedTechnician === "Arsalan Ahmed" ? "selected" : ""}>Arsalan Ahmed</option>
                          </select>
                        ` : `
                          <span style="font-size:0.85rem; color:var(--text-secondary);">
                            ${issue.assignedTechnician === "Unassigned" ? `<span style="color:var(--text-muted); font-style:italic;">Unassigned</span>` : issue.assignedTechnician}
                          </span>
                        `}
                      </td>
                      <td>
                        <div style="display:flex; gap:8px; justify-content:flex-end;">
                          <button class="btn btn-primary btn-workflow" data-id="${issue.id}" style="padding: 6px 12px; font-size: 0.75rem;">
                            <i data-lucide="sliders"></i> Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    this.attachListListeners();
  }
  attachListListeners() {
    // Search
    document.getElementById("issue-search")?.addEventListener("input", (e) => {
      this.currentSearchQuery = e.target.value;
      this.renderList();
    });
    // Priority filter
    document.getElementById("issue-priority-filter")?.addEventListener("change", (e) => {
      this.currentPriorityFilter = e.target.value;
      this.renderList();
    });
    // Status filter
    document.getElementById("issue-status-filter")?.addEventListener("change", (e) => {
      this.currentStatusFilter = e.target.value;
      this.renderList();
    });
    // Tech Assign
    this.container.querySelectorAll(".select-tech-assign").forEach(select => {
      select.addEventListener("change", async (e) => {
        const id = select.getAttribute("data-id");
        const newTech = e.target.value;
        const issue = await storage.getIssueById(id);
        const adminUser = localStorage.getItem("maintainiq_user_name") || "Administrator";
        
        issue.assignedTechnician = newTech;
        if (issue.status === "Reported" && newTech !== "Unassigned") {
          issue.status = "Assigned";
        }
        await storage.saveIssue(issue);
        // Also assign tech to asset
        const asset = await storage.getAssetByCode(issue.assetCode);
        asset.assignedTechnician = newTech;
        await storage.saveAsset(asset);
        await storage.addHistoryEntry(
          issue.assetCode,
          adminUser,
          "Technician Assigned",
          `Assigned issue ${id} to technician "${newTech}"`,
          id
        );
        this.renderList();
      });
    });
    // Workflow Manager Modal
    this.container.querySelectorAll(".btn-workflow").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.openWorkflowModal(id);
      });
    });
  }
  // Opens Technician status panel + diagnostics
  async openWorkflowModal(id) {
    const issue = await storage.getIssueById(id);
    const asset = await storage.getAssetByCode(issue.assetCode);
    const backdrop = document.getElementById("modal-backdrop");
    const container = document.getElementById("modal-container");
    const currentUserName = localStorage.getItem("maintainiq_user_name") || "Technician";
    container.innerHTML = `
      <div class="modal-header">
        <div>
          <h2 style="font-size:1.15rem; font-weight:700;">Issue Workflow Manager</h2>
          <p style="font-size:0.75rem; color:var(--text-muted); font-family:monospace; margin-top:2px;">ISSUE ID: ${issue.id} | ASSET: ${asset.name} (${asset.code})</p>
        </div>
        <button id="close-modal" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="modal-body">
        
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:16px; border-radius:10px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="font-weight:600; color:var(--text-primary); font-size:1rem;">${issue.title}</span>
            <span class="badge badge-${this.getStatusClass(issue.status)}">${issue.status}</span>
          </div>
          <p style="color:var(--text-secondary); font-size:0.85rem; line-height:1.4;">${issue.description}</p>
          <div style="display:flex; gap:16px; font-size:0.75rem; color:var(--text-muted); margin-top:12px; border-top:1px solid var(--border-color); padding-top:8px;">
            <span>Priority: <strong style="color:${this.getPriorityColor(issue.priority)}">${issue.priority}</strong></span>
            <span>Category: <strong>${issue.category}</strong></span>
            <span>Reporter: <strong>${issue.reporterName}</strong></span>
            <span>Created: <strong>${new Date(issue.createdDate).toLocaleDateString()}</strong></span>
          </div>
        </div>
        <div id="workflow-actions-panel" style="margin-bottom:24px;">
          <h3 style="font-size:0.85rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:12px;">Workflow Actions</h3>
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            ${this.renderWorkflowButtons(issue)}
          </div>
        </div>
        <!-- Issue resolution parameters -->
        <div id="resolution-form-wrapper" style="display:none; border-top:1px solid var(--border-color); padding-top:20px;">
          <h3 style="font-size:0.9rem; font-weight:700; color:var(--status-operational-text); margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            <i data-lucide="check-square"></i> Record Maintenance Details
          </h3>
          <form id="form-resolve-issue">
            <div id="resolve-error" style="display:none; background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.25); color:#f87171; padding:12px; border-radius:8px; margin-bottom:16px; font-size:0.85rem;"></div>
            <div class="form-group">
              <label class="form-label">Maintenance Action & Inspection Notes *</label>
              <textarea id="res-notes" class="form-textarea" rows="3" required placeholder="Describe what you inspected, the issue diagnosed, and actions performed to fix it..."></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Replacement Parts (comma separated)</label>
                <input type="text" id="res-parts" class="form-input" placeholder="e.g. HDMI cable, adapter">
              </div>
              <div class="form-group">
                <label class="form-label">Total Material/Service Cost ($) *</label>
                <input type="number" id="res-cost" class="form-input" min="0" value="0" required placeholder="0.00">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Final Asset Condition</label>
                <select id="res-condition" class="form-select">
                  <option value="Excellent">Excellent</option>
                  <option value="Good" selected>Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Next Service Date *</label>
                <input type="date" id="res-next-service" class="form-input" required>
              </div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-resolve">Cancel</button>
              <button type="submit" class="btn btn-primary" style="background:var(--status-operational-text); border-color:var(--status-operational-text);">
                Resolve & Generate AI Report
              </button>
            </div>
          </form>
        </div>
        <!-- AI Report Summary Output Panel -->
        <div id="ai-report-output-panel" style="display:none; margin-top:20px; border-top:1px solid var(--border-color); padding-top:20px;">
          <h3 style="font-size:0.9rem; font-weight:700; color:var(--primary); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
            <i data-lucide="sparkles"></i> AI Maintenance Summary Report
          </h3>
          <div class="ai-triage-box" style="background:rgba(99, 102, 241, 0.03); margin-top:0;">
            <div id="ai-summary-text" style="font-size:0.88rem; line-height:1.5; color:var(--text-primary); margin-bottom:12px; font-style:italic;">
              Generating professional service statement...
            </div>
            <button class="btn btn-secondary" id="btn-close-workflow" style="width:100%;">Close Panel & Refresh</button>
          </div>
        </div>
      </div>
    `;
    backdrop.classList.add("active");
    if (window.lucide) window.lucide.createIcons();
    // Event actions
    const closeModal = () => backdrop.classList.remove("active");
    document.getElementById("close-modal").addEventListener("click", closeModal);
    this.attachWorkflowActions(issue, asset);
  }
  // Render buttons according to workflow status transition logic
  renderWorkflowButtons(issue) {
    const status = issue.status;
    let buttons = "";
    if (status === "Reported" || status === "Assigned") {
      buttons += `<button class="btn btn-primary" id="btn-act-inspect"><i data-lucide="microscope"></i> Start Inspection</button>`;
    }
    else if (status === "Inspection Started") {
      buttons += `
        <button class="btn btn-primary" id="btn-act-repair"><i data-lucide="wrench"></i> Start Repair Work</button>
        <button class="btn btn-secondary" id="btn-act-wait"><i data-lucide="timer"></i> Wait for Parts</button>
      `;
    }
    else if (status === "Maintenance In Progress" || status === "Waiting for Parts") {
      buttons += `
        <button class="btn btn-primary" id="btn-act-resolve" style="background:var(--status-operational-text); border-color:var(--status-operational-text);"><i data-lucide="check"></i> Resolve Issue</button>
        ${status === "Maintenance In Progress" ? `<button class="btn btn-secondary" id="btn-act-wait"><i data-lucide="timer"></i> Wait for Parts</button>` : `<button class="btn btn-primary" id="btn-act-repair"><i data-lucide="wrench"></i> Resume Repair</button>`}
      `;
    }
    else if (status === "Resolved" || status === "Closed") {
      buttons += `<button class="btn btn-danger" id="btn-act-reopen"><i data-lucide="rotate-ccw"></i> Reopen Issue</button>`;
      if (status === "Resolved") {
        buttons += `<button class="btn btn-secondary" id="btn-act-close"><i data-lucide="check-square"></i> Close & Archive</button>`;
      }
    }
    return buttons || `<span style="font-size:0.85rem; color:var(--text-muted); font-style:italic;">No actions available for this status.</span>`;
  }
  // Attach buttons events
  attachWorkflowActions(issue, asset) {
    const currentUserName = localStorage.getItem("maintainiq_user_name") || "Technician";
    const refreshAndClose = () => {
      document.getElementById("modal-backdrop").classList.remove("active");
      this.renderList();
    };
    // Action: Start Inspection
    const inspectBtn = document.getElementById("btn-act-inspect");
    if (inspectBtn) {
      inspectBtn.addEventListener("click", async () => {
        issue.status = "Inspection Started";
        issue.assignedTechnician = currentUserName;
        await storage.saveIssue(issue);
        asset.status = "Under Inspection";
        asset.assignedTechnician = currentUserName;
        await storage.saveAsset(asset);
        await storage.addHistoryEntry(
          issue.assetCode,
          currentUserName,
          "Inspection Started",
          `Started inspecting issue ${issue.id}: "${issue.title}"`,
          issue.id
        );
        refreshAndClose();
      });
    }
    // Action: Start Repair Work
    const repairBtn = document.getElementById("btn-act-repair");
    if (repairBtn) {
      repairBtn.addEventListener("click", async () => {
        issue.status = "Maintenance In Progress";
        await storage.saveIssue(issue);
        asset.status = "Under Maintenance";
        await storage.saveAsset(asset);
        await storage.addHistoryEntry(
          issue.assetCode,
          currentUserName,
          "Repair Initiated",
          `Began repair work for issue ${issue.id}`,
          issue.id
        );
        refreshAndClose();
      });
    }
    // Action: Wait for Parts
    const waitBtn = document.getElementById("btn-act-wait");
    if (waitBtn) {
      waitBtn.addEventListener("click", async () => {
        issue.status = "Waiting for Parts";
        await storage.saveIssue(issue);
        await storage.addHistoryEntry(
          issue.assetCode,
          currentUserName,
          "Waiting for Parts",
          `Issue ${issue.id} set to waiting for replacement parts`,
          issue.id
        );
        refreshAndClose();
      });
    }
    // Action: Reopen Issue
    const reopenBtn = document.getElementById("btn-act-reopen");
    if (reopenBtn) {
      reopenBtn.addEventListener("click", async () => {
        issue.status = "Reopened";
        await storage.saveIssue(issue);
        asset.status = "Issue Reported";
        await storage.saveAsset(asset);
        await storage.addHistoryEntry(
          issue.assetCode,
          currentUserName,
          "Issue Reopened",
          `Reopened maintenance request ${issue.id}`,
          issue.id
        );
        refreshAndClose();
      });
    }
    // Action: Close & Archive
    const closeBtn = document.getElementById("btn-act-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", async () => {
        issue.status = "Closed";
        await storage.saveIssue(issue);
        await storage.addHistoryEntry(
          issue.assetCode,
          currentUserName,
          "Issue Closed",
          `Closed resolved issue ${issue.id} and locked changes`,
          issue.id
        );
        refreshAndClose();
      });
    }
    // Action: Resolve Issue (Toggle dialog)
    const resolveBtn = document.getElementById("btn-act-resolve");
    if (resolveBtn) {
      resolveBtn.addEventListener("click", () => {
        // Show form wrapper, hide actions panel
        document.getElementById("workflow-actions-panel").style.display = "none";
        document.getElementById("resolution-form-wrapper").style.display = "block";
        
        // Auto prepopulate next service date to 90 days from today
        const completionDate = new Date();
        const nextServiceDate = new Date(completionDate.getTime() + (90 * 24 * 60 * 60 * 1000));
        document.getElementById("res-next-service").value = nextServiceDate.toISOString().split('T')[0];
      });
    }
    const cancelResolveBtn = document.getElementById("btn-cancel-resolve");
    if (cancelResolveBtn) {
      cancelResolveBtn.addEventListener("click", () => {
        document.getElementById("resolution-form-wrapper").style.display = "none";
        document.getElementById("workflow-actions-panel").style.display = "block";
      });
    }
    // Handle Resolution Submission
    const resolveForm = document.getElementById("form-resolve-issue");
    if (resolveForm) {
      resolveForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const errEl = document.getElementById("resolve-error");
        errEl.style.display = "none";
        const notes = document.getElementById("res-notes").value.trim();
        const parts = document.getElementById("res-parts").value.trim();
        const cost = parseFloat(document.getElementById("res-cost").value);
        const condition = document.getElementById("res-condition").value;
        const nextService = document.getElementById("res-next-service").value;
        // Business rules validation
        if (cost < 0) {
          errEl.textContent = "Error: Maintenance cost cannot be negative.";
          errEl.style.display = "block";
          return;
        }
        const todayStr = new Date().toISOString().split('T')[0];
        if (nextService < todayStr) {
          errEl.textContent = "Error: Next service date cannot be before today/completion date.";
          errEl.style.display = "block";
          return;
        }
        if (!notes) {
          errEl.textContent = "Error: Maintenance resolution notes are required.";
          errEl.style.display = "block";
          return;
        }
        // Apply Resolution
        issue.status = "Resolved";
        issue.maintenanceNotes = notes;
        issue.partsReplaced = parts;
        issue.cost = cost;
        await storage.saveIssue(issue);
        // Update Asset
        asset.status = "Operational";
        asset.condition = condition;
        asset.lastService = todayStr;
        asset.nextService = nextService;
        await storage.saveAsset(asset);
        // History Log
        await storage.addHistoryEntry(
          issue.assetCode,
          currentUserName,
          "Issue Resolved",
          `Resolved issue ${issue.id}. Replaced parts: [${parts || "none"}]. Cost: $${cost}. Asset condition: ${condition}`,
          issue.id
        );
        // Hide resolution form, show AI loading panel
        document.getElementById("resolution-form-wrapper").style.display = "none";
        const aiPanel = document.getElementById("ai-report-output-panel");
        aiPanel.style.display = "block";
        // Call Gemini to summarize technical report
        const summaryText = await ai.generateMaintenanceSummary(issue);
        document.getElementById("ai-summary-text").textContent = summaryText;
        // Hook up the final panel close
        document.getElementById("btn-close-workflow").addEventListener("click", () => {
          refreshAndClose();
        });
      });
    }
  }
  getStatusClass(status) {
    switch (status) {
      case "Reported": return "reported";
      case "Assigned": return "reported";
      case "Inspection Started": return "inspection";
      case "Maintenance In Progress": return "maintenance";
      case "Waiting for Parts": return "maintenance";
      case "Resolved": return "operational";
      case "Closed": return "retired";
      case "Reopened": return "reported";
      default: return "retired";
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
export const issuesPage = new IssuesPage();
