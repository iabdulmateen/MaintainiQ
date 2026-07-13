// MaintainIQ Assets View - Handles Asset Lists, Registration, QR Code Labeling and Details
import { storage } from "../storageService.js";
export class AssetsPage {
  constructor() {
    this.currentFilterStatus = "all";
    this.currentSearchQuery = "";
  }
  async render(container) {
    this.container = container;
    await this.renderList();
  }
  async renderList() {
    const assets = await storage.getAssets();
    const activeRole = localStorage.getItem("maintainiq_active_role") || "admin";
    // Apply search and status filters
    const filteredAssets = assets.filter(asset => {
      const matchesStatus = this.currentFilterStatus === "all" || asset.status === this.currentFilterStatus;
      const term = this.currentSearchQuery.toLowerCase();
      const matchesSearch = 
        asset.name.toLowerCase().includes(term) ||
        asset.code.toLowerCase().includes(term) ||
        asset.location.toLowerCase().includes(term) ||
        asset.category.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
    // Render search, filters, registration button, and asset cards
    this.container.innerHTML = `
      <div class="grid-actions-bar">
        <!-- Search -->
        <div class="search-input-wrapper">
          <i data-lucide="search" class="search-icon"></i>
          <input type="text" id="asset-search" class="form-input search-input" placeholder="Search assets by name, code, location..." value="${this.currentSearchQuery}">
        </div>
        <!-- Filter & Create -->
        <div style="display:flex; gap:12px; align-items:center;">
          <select id="asset-status-filter" class="form-select" style="width:160px; padding:10px;">
            <option value="all" ${this.currentFilterStatus === "all" ? "selected" : ""}>All Statuses</option>
            <option value="Operational" ${this.currentFilterStatus === "Operational" ? "selected" : ""}>Operational</option>
            <option value="Issue Reported" ${this.currentFilterStatus === "Issue Reported" ? "selected" : ""}>Issue Reported</option>
            <option value="Under Inspection" ${this.currentFilterStatus === "Under Inspection" ? "selected" : ""}>Under Inspection</option>
            <option value="Under Maintenance" ${this.currentFilterStatus === "Under Maintenance" ? "selected" : ""}>Under Maintenance</option>
            <option value="Out of Service" ${this.currentFilterStatus === "Out of Service" ? "selected" : ""}>Out of Service</option>
            <option value="Retired" ${this.currentFilterStatus === "Retired" ? "selected" : ""}>Retired</option>
          </select>
          ${activeRole === "admin" ? `
            <button class="btn btn-primary" id="btn-register-asset">
              <i data-lucide="plus"></i> Register Asset
            </button>
          ` : ""}
        </div>
      </div>
      <div class="glass-card">
        <div class="data-table-wrapper">
          ${filteredAssets.length === 0 ? `
            <div style="text-align:center; padding:48px; color:var(--text-muted);">
              <i data-lucide="package-search" style="width:48px; height:48px; margin-bottom:12px;"></i>
              <h3>No Assets Found</h3>
              <p style="margin-top:8px;">Try adjusting your filters or search query.</p>
            </div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name / Category</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Condition</th>
                  <th>Next Service</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredAssets.map(asset => `
                  <tr>
                    <td style="font-family:monospace; font-weight:700; color:var(--primary);">${asset.code}</td>
                    <td>
                      <div style="font-weight:600; color:var(--text-primary);">${asset.name}</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">${asset.category}</div>
                    </td>
                    <td style="color:var(--text-secondary); font-size:0.85rem;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <i data-lucide="map-pin" style="width:14px; height:14px; color:var(--text-muted);"></i>
                        ${asset.location}
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-${this.getStatusClass(asset.status)}">${asset.status}</span>
                    </td>
                    <td>
                      <span style="font-weight:500; font-size:0.85rem; color:${this.getConditionColor(asset.condition)}">
                        ${asset.condition}
                      </span>
                    </td>
                    <td style="font-size:0.85rem; color:var(--text-secondary);">${asset.nextService || "N/A"}</td>
                    <td>
                      <div style="display:flex; gap:8px; justify-content:flex-end;">
                        <button class="btn btn-secondary btn-qr-label" data-code="${asset.code}" title="Generate QR Label" style="padding: 6px 12px; font-size: 0.75rem;">
                          <i data-lucide="qr-code"></i> Label
                        </button>
                        <button class="btn btn-primary btn-view-asset" data-code="${asset.code}" title="View details" style="padding: 6px 12px; font-size: 0.75rem;">
                          <i data-lucide="eye"></i> Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
    // Reinitialize icons
    if (window.lucide) window.lucide.createIcons();
    // Attach Listeners
    this.attachListListeners();
  }
  attachListListeners() {
    // Search listener
    const searchEl = document.getElementById("asset-search");
    if (searchEl) {
      searchEl.addEventListener("input", (e) => {
        this.currentSearchQuery = e.target.value;
        this.renderList();
      });
    }
    // Filter listener
    const filterEl = document.getElementById("asset-status-filter");
    if (filterEl) {
      filterEl.addEventListener("change", (e) => {
        this.currentFilterStatus = e.target.value;
        this.renderList();
      });
    }
    // Register asset modal open
    const registerBtn = document.getElementById("btn-register-asset");
    if (registerBtn) {
      registerBtn.addEventListener("click", () => this.openRegisterModal());
    }
    // Asset QR label modal trigger
    this.container.querySelectorAll(".btn-qr-label").forEach(btn => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-code");
        this.openQRLabelModal(code);
      });
    });
    // Inspect asset details view trigger
    this.container.querySelectorAll(".btn-view-asset").forEach(btn => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-code");
        this.openAssetDetailsModal(code);
      });
    });
  }
  // Open asset registration form in modal
  openRegisterModal() {
    const backdrop = document.getElementById("modal-backdrop");
    const container = document.getElementById("modal-container");
    container.innerHTML = `
      <div class="modal-header">
        <h2 style="font-size:1.15rem; font-weight:700;">Register Digital Asset</h2>
        <button id="close-modal" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
          <i data-lucide="x"></i>
        </button>
      </div>
      <form id="form-register">
        <div class="modal-body">
          <div id="register-error" style="display:none; background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.25); color:#f87171; padding:12px; border-radius:8px; margin-bottom:16px; font-size:0.85rem;"></div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Asset Name *</label>
              <input type="text" id="reg-name" class="form-input" required placeholder="e.g. Classroom Projector 01">
            </div>
            <div class="form-group">
              <label class="form-label">Unique Asset Code *</label>
              <input type="text" id="reg-code" class="form-input" required placeholder="e.g. PRJ-001" style="text-transform:uppercase;">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <input type="text" id="reg-category" class="form-input" placeholder="e.g. HVAC, Electronics">
            </div>
            <div class="form-group">
              <label class="form-label">Location / Room *</label>
              <input type="text" id="reg-location" class="form-input" required placeholder="e.g. Block B, Room 204">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Initial Condition</label>
              <select id="reg-condition" class="form-select">
                <option value="Excellent">Excellent</option>
                <option value="Good" selected>Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Initial Status</label>
              <select id="reg-status" class="form-select">
                <option value="Operational" selected>Operational</option>
                <option value="Out of Service">Out of Service</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Last Service Date</label>
              <input type="date" id="reg-last-service" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Next Service Date</label>
              <input type="date" id="reg-next-service" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Assigned Technician</label>
            <input type="text" id="reg-tech" class="form-input" placeholder="Technician Name (or leave blank)">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-cancel-reg">Cancel</button>
          <button type="submit" class="btn btn-primary">Confirm Registration</button>
        </div>
      </form>
    `;
    backdrop.classList.add("active");
    if (window.lucide) window.lucide.createIcons();
    // Attach form actions
    const closeBtn = document.getElementById("close-modal");
    const cancelBtn = document.getElementById("btn-cancel-reg");
    const form = document.getElementById("form-register");
    const closeModal = () => backdrop.classList.remove("active");
    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = document.getElementById("reg-code").value.trim().toUpperCase();
      const name = document.getElementById("reg-name").value.trim();
      const category = document.getElementById("reg-category").value.trim() || "General Maintenance";
      const location = document.getElementById("reg-location").value.trim();
      const condition = document.getElementById("reg-condition").value;
      const status = document.getElementById("reg-status").value;
      const lastService = document.getElementById("reg-last-service").value || null;
      const nextService = document.getElementById("reg-next-service").value || null;
      const assignedTechnician = document.getElementById("reg-tech").value.trim() || "Unassigned";
      const errEl = document.getElementById("register-error");
      // Validate Unique Code
      const existing = await storage.getAssetByCode(code);
      if (existing) {
        errEl.textContent = `Error: An asset with code "${code}" already exists. Asset codes must be completely unique.`;
        errEl.style.display = "block";
        return;
      }
      const activeUser = localStorage.getItem("maintainiq_user_name") || "Administrator";
      // Save Asset
      await storage.saveAsset({
        code, name, category, location, condition, status, lastService, nextService, assignedTechnician
      });
      // Write History
      await storage.addHistoryEntry(code, activeUser, "Asset Registered", `Registered new asset "${name}" at ${location}`);
      closeModal();
      this.renderList();
    });
  }
  // View QR code print sheet and copy link actions
  async openQRLabelModal(code) {
    const asset = await storage.getAssetByCode(code);
    const backdrop = document.getElementById("modal-backdrop");
    const container = document.getElementById("modal-container");
const publicUrl = `https://maintaini-q-ny6m.vercel.app/#/public/${asset.code}`;
    container.innerHTML = `
      <div class="modal-header">
        <h2 style="font-size:1.15rem; font-weight:700;">Print Asset Label</h2>
        <button id="close-modal" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="modal-body" style="background: rgba(15, 23, 42, 0.4); text-align:center;">
        
        <!-- Printable QR Card container -->
        <div class="qr-label-preview" id="printable-qr-card">
          <div class="qr-label-org">SMIT FACILITIES DEPT</div>
          <div class="qr-label-title">${asset.name}</div>
          <div class="qr-label-code">${asset.code}</div>
          <div class="qr-image-container" id="qr-code-canvas"></div>
          <div class="qr-label-location">Location: ${asset.location}</div>
          <div class="qr-label-instructions">Scan QR to request service or view history</div>
        </div>
        <div style="margin-top:24px; color:var(--text-secondary); font-size:0.85rem; text-align:left;">
          <label class="form-label">Safe Public URL Path</label>
          <div style="display:flex; gap:8px;">
            <input type="text" class="form-input" id="copy-url-input" readOnly value="${publicUrl}" style="font-size:0.75rem;">
            <button class="btn btn-secondary" id="btn-copy-link" style="white-space:nowrap;">Copy Link</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="btn-open-pub">Open Public View</button>
        <button class="btn btn-primary" id="btn-print-label"><i data-lucide="printer"></i> Print Label</button>
      </div>
    `;
    backdrop.classList.add("active");
    if (window.lucide) window.lucide.createIcons();
    // Generate the QR code using QRCode library CDN
    setTimeout(() => {
      const canvasEl = document.getElementById("qr-code-canvas");
      if (window.QRCode) {
        new window.QRCode(canvasEl, {
          text: publicUrl,
          width: 150,
          height: 150,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.H
        });
      } else {
        // Backup image API fallback
        canvasEl.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}" alt="QR Code" width="150" height="150">`;
      }
    }, 50);
    // Event handlers
    const closeBtn = document.getElementById("close-modal");
    closeBtn.addEventListener("click", () => backdrop.classList.remove("active"));
    // Copy link
    document.getElementById("btn-copy-link").addEventListener("click", () => {
      const input = document.getElementById("copy-url-input");
      input.select();
      document.execCommand("copy");
      
      const copyBtn = document.getElementById("btn-copy-link");
      copyBtn.textContent = "Copied!";
      copyBtn.style.borderColor = "var(--status-operational-border)";
      copyBtn.style.color = "var(--status-operational-text)";
      setTimeout(() => {
        copyBtn.textContent = "Copy Link";
        copyBtn.style.borderColor = "var(--border-color)";
        copyBtn.style.color = "var(--text-primary)";
      }, 2000);
    });
    // Open public page
    document.getElementById("btn-open-pub").addEventListener("click", () => {
      backdrop.classList.remove("active");
      window.location.hash = `#/public/${asset.code}`;
    });
    // Print label (open print dialer on target element)
    document.getElementById("btn-print-label").addEventListener("click", () => {
      const printContent = document.getElementById("printable-qr-card").outerHTML;
      const win = window.open("", "_blank");
      win.document.write(`
        <html>
        <head>
          <title>Print Label - ${asset.code}</title>
          <style>
            body { font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; }
            .qr-label-preview {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 24px;
              background: white;
              color: black;
              border-radius: 6px;
              width: 100%;
              max-width: 300px;
              border: 2px dashed #999;
              text-align: center;
            }
            .qr-label-org { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-bottom: 8px; }
            .qr-label-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; }
            .qr-label-code { font-family: monospace; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; color: #000; margin-bottom: 12px; }
            .qr-image-container { margin-bottom: 12px; width: 150px; height: 150px; display:flex; align-items:center; justify-content:center; }
            .qr-image-container img { width:150px; height:150px; }
            .qr-label-location { font-size: 0.78rem; color: #555; margin-bottom: 4px; }
            .qr-label-instructions { font-size: 0.7rem; color: #888; font-style: italic; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
        </html>
      `);
      win.document.close();
    });
  }
  // Open asset inspection page inside modal displaying history trail
  async openAssetDetailsModal(code) {
    const asset = await storage.getAssetByCode(code);
    const issues = await storage.getIssues();
    const history = await storage.getHistory(code);
    
    const assetIssues = issues.filter(i => i.assetCode === code);
    const backdrop = document.getElementById("modal-backdrop");
    const container = document.getElementById("modal-container");
    container.style.maxWidth = "750px"; // Wider container for details
    container.innerHTML = `
      <div class="modal-header">
        <div>
          <h2 style="font-size:1.15rem; font-weight:700;">Asset Inspector</h2>
          <p style="font-size:0.75rem; color:var(--text-muted); font-family:monospace; margin-top:2px;">CODE: ${asset.code}</p>
        </div>
        <button id="close-modal" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="modal-body">
        
        <div class="details-grid">
          <!-- Meta Specs Left -->
          <div>
            <h3 style="font-size:0.9rem; font-weight:700; margin-bottom:12px; text-transform:uppercase; color:var(--primary);">Specifications</h3>
            <div class="details-meta-list" style="margin-bottom:24px;">
              <div class="details-meta-item">
                <span class="details-meta-label">Name</span>
                <span class="details-meta-value">${asset.name}</span>
              </div>
              <div class="details-meta-item">
                <span class="details-meta-label">Category</span>
                <span class="details-meta-value">${asset.category}</span>
              </div>
              <div class="details-meta-item">
                <span class="details-meta-label">Location</span>
                <span class="details-meta-value">${asset.location}</span>
              </div>
              <div class="details-meta-item">
                <span class="details-meta-label">Status</span>
                <span class="badge badge-${this.getStatusClass(asset.status)}">${asset.status}</span>
              </div>
              <div class="details-meta-item">
                <span class="details-meta-label">Condition</span>
                <span class="details-meta-value" style="color:${this.getConditionColor(asset.condition)}">${asset.condition}</span>
              </div>
              <div class="details-meta-item">
                <span class="details-meta-label">Last Serviced</span>
                <span class="details-meta-value">${asset.lastService || "Never"}</span>
              </div>
              <div class="details-meta-item">
                <span class="details-meta-label">Next Service Due</span>
                <span class="details-meta-value">${asset.nextService || "Unscheduled"}</span>
              </div>
              <div class="details-meta-item">
                <span class="details-meta-label">Assigned Technician</span>
                <span class="details-meta-value">${asset.assignedTechnician}</span>
              </div>
            </div>
            <h3 style="font-size:0.9rem; font-weight:700; margin-bottom:12px; text-transform:uppercase; color:var(--status-reported-text);">Reported Issues (${assetIssues.length})</h3>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${assetIssues.length === 0 ? `
                <div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">No logged issues for this asset.</div>
              ` : assetIssues.map(issue => `
                <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-size:0.8rem; font-weight:600;">${issue.title}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${new Date(issue.createdDate).toLocaleDateString()}</div>
                  </div>
                  <span class="badge badge-${this.getStatusClass(issue.status)}" style="padding:2px 8px; font-size:0.6rem;">${issue.status}</span>
                </div>
              `).join("")}
            </div>
          </div>
          <!-- History Timeline Right -->
          <div>
            <h3 style="font-size:0.9rem; font-weight:700; margin-bottom:12px; text-transform:uppercase; color:var(--status-inspection-text);">Asset History Log</h3>
            <div class="timeline" style="max-height: 380px; overflow-y: auto; padding-right:8px;">
              ${history.length === 0 ? `
                <p style="color:var(--text-muted); font-size:0.8rem;">No activity log recorded.</p>
              ` : history.map((item, idx) => `
                <div class="timeline-item ${idx === 0 ? 'active' : ''}">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <div style="font-weight:600; font-size:0.8rem; color:var(--text-primary);">${item.action}</div>
                    <div style="color:var(--text-secondary); font-size:0.75rem; margin-top:2px;">${item.notes}</div>
                    <div style="font-size:0.68rem; color:var(--text-muted); margin-top:4px; display:flex; justify-content:space-between;">
                      <span>By ${item.actor}</span>
                      <span>${new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="btn-close-inspect">Close</button>
      </div>
    `;
    backdrop.classList.add("active");
    if (window.lucide) window.lucide.createIcons();
    const closeModal = () => {
      backdrop.classList.remove("active");
      container.style.maxWidth = "580px"; // Reset container max-width
    };
    
    document.getElementById("close-modal").addEventListener("click", closeModal);
    document.getElementById("btn-close-inspect").addEventListener("click", closeModal);
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
      case "Good": return "#38bdf8"; // Ocean Blue
      case "Fair": return "var(--status-reported-text)";
      case "Poor": return "var(--status-critical-text)";
      default: return "var(--text-muted)";
    }
  }
}
export const assetsPage = new AssetsPage();
