// MaintainIQ Dashboard View - Renders operational metrics, recent logs, and critical issues
import { storage } from "../storageService.js";
export class DashboardPage {
  async render(container) {
    const assets = await storage.getAssets();
    const issues = await storage.getIssues();
    const history = await storage.getHistory();
    // Calculate dynamic counts
    const totalAssets = assets.length;
    const operationalCount = assets.filter(a => a.status === "Operational").length;
    const reportedCount = assets.filter(a => a.status === "Issue Reported").length;
    const maintenanceCount = assets.filter(a => a.status === "Under Maintenance" || a.status === "Under Inspection").length;
    const outOfServiceCount = assets.filter(a => a.status === "Out of Service").length;
    // Filter urgent issues (Critical or High priority that are open)
    const urgentIssues = issues.filter(
      i => (i.priority === "Critical" || i.priority === "High") && i.status !== "Resolved" && i.status !== "Closed"
    ).slice(0, 5);
    // Get recent history logs (top 5)
    const recentHistory = history.slice(0, 5);
    container.innerHTML = `
      <div class="stats-grid">
        <!-- Stat Card 1 -->
        <div class="glass-card stat-card">
          <div class="stat-info">
            <div class="stat-label">Total Assets</div>
            <div class="stat-val" style="color: var(--text-primary);">${totalAssets}</div>
          </div>
          <div class="stat-icon" style="background: rgba(255,255,255,0.05); color: var(--text-secondary);">
            <i data-lucide="box"></i>
          </div>
        </div>
        <!-- Stat Card 2 -->
        <div class="glass-card stat-card">
          <div class="stat-info">
            <div class="stat-label">Operational</div>
            <div class="stat-val" style="color: var(--status-operational-text);">${operationalCount}</div>
          </div>
          <div class="stat-icon" style="background: var(--status-operational-bg); color: var(--status-operational-text);">
            <i data-lucide="check-circle-2"></i>
          </div>
        </div>
        <!-- Stat Card 3 -->
        <div class="glass-card stat-card">
          <div class="stat-info">
            <div class="stat-label">Reported & Pending</div>
            <div class="stat-val" style="color: var(--status-reported-text);">${reportedCount}</div>
          </div>
          <div class="stat-icon" style="background: var(--status-reported-bg); color: var(--status-reported-text);">
            <i data-lucide="alert-triangle"></i>
          </div>
        </div>
        <!-- Stat Card 4 -->
        <div class="glass-card stat-card">
          <div class="stat-info">
            <div class="stat-label">In Repair / Check</div>
            <div class="stat-val" style="color: var(--status-maintenance-text);">${maintenanceCount}</div>
          </div>
          <div class="stat-icon" style="background: var(--status-maintenance-bg); color: var(--status-maintenance-text);">
            <i data-lucide="wrench"></i>
          </div>
        </div>
        <!-- Stat Card 5 -->
        <div class="glass-card stat-card">
          <div class="stat-info">
            <div class="stat-label">Out of Service</div>
            <div class="stat-val" style="color: var(--status-critical-text);">${outOfServiceCount}</div>
          </div>
          <div class="stat-icon" style="background: var(--status-critical-bg); color: var(--status-critical-text);">
            <i data-lucide="slash"></i>
          </div>
        </div>
      </div>
      <div class="dashboard-layout">
        <!-- Urgent Issues Left Section -->
        <div class="dashboard-col-left">
          <div class="glass-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
              <h2 style="font-size:1.1rem; font-weight:700;">Urgent Unresolved Issues</h2>
              <a href="#/issues" class="btn btn-secondary" style="padding:6px 12px; font-size:0.75rem;">View All Issues</a>
            </div>
            
            <div class="data-table-wrapper">
              ${urgentIssues.length === 0 ? `
                <div style="text-align:center; padding:32px 0; color:var(--text-muted);">
                  <i data-lucide="thumbs-up" style="width:32px; height:32px; margin-bottom:8px;"></i>
                  <p>All quiet! No high priority unresolved issues found.</p>
                </div>
              ` : `
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Issue</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${urgentIssues.map(issue => {
                      const asset = assets.find(a => a.code === issue.assetCode) || { name: issue.assetCode };
                      let priorityStyle = "color:var(--priority-low);";
                      if (issue.priority === "Medium") priorityStyle = "color:var(--priority-medium);";
                      if (issue.priority === "High") priorityStyle = "color:var(--priority-high); font-weight:bold;";
                      if (issue.priority === "Critical") priorityStyle = "color:var(--priority-critical); font-weight:bold; animation: pulse 2s infinite;";
                      return `
                        <tr>
                          <td>
                            <div style="font-weight:600;">${asset.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${issue.assetCode}</div>
                          </td>
                          <td>
                            <div style="font-weight:500;">${issue.title}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:260px;">
                              ${issue.description}
                            </div>
                          </td>
                          <td>
                            <span style="display:flex; align-items:center; gap:6px; ${priorityStyle}">
                              <span style="width:8px; height:8px; border-radius:50%; background:currentColor;"></span>
                              ${issue.priority}
                            </span>
                          </td>
                          <td>
                            <span class="badge badge-${this.getStatusClass(issue.status)}">${issue.status}</span>
                          </td>
                          <td style="color:var(--text-secondary); font-size:0.85rem;">
                            ${issue.assignedTechnician === "Unassigned" ? `<span style="color:var(--text-muted); font-style:italic;">None Assigned</span>` : issue.assignedTechnician}
                          </td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
              `}
            </div>
          </div>
        </div>
        <!-- Activity Timeline Right Section -->
        <div class="dashboard-col-right">
          <div class="glass-card">
            <h2 style="font-size:1.1rem; font-weight:700; margin-bottom:20px;">System Activity Trail</h2>
            <div class="timeline">
              ${recentHistory.length === 0 ? `
                <p style="color:var(--text-muted); text-align:center; padding:16px;">No activities recorded yet.</p>
              ` : recentHistory.map((item, idx) => {
                const date = new Date(item.timestamp);
                const formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `
                  <div class="timeline-item ${idx === 0 ? 'active' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                      <div style="font-weight:600; color:var(--text-primary);">${item.action}</div>
                      <div style="color:var(--text-secondary); margin-top:2px;">
                        <strong>${item.assetCode}</strong>: ${item.notes}
                      </div>
                      <div style="font-size:0.75rem; color:var(--text-muted); display:flex; justify-content:space-between; margin-top:4px;">
                        <span>by ${item.actor}</span>
                        <span>${formattedDate}</span>
                      </div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) {
      window.lucide.createIcons();
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
      default: return "retired";
    }
  }
}
export const dashboardPage = new DashboardPage();
