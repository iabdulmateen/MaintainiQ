// MaintainIQ Settings View - Handles Supabase configurations, Gemini Keys, and Database resets
import { storage } from "../storageService.js";
import { ai } from "../aiService.js";
export class SettingsPage {
  async render(container) {
    this.container = container;
    await this.renderSettings();
  }
  async renderSettings() {
    const sbConfig = storage.getSupabaseConfig();
    const geminiKey = ai.getApiKey();
    const isSbConnected = storage.isSupabaseActive();
    this.container.innerHTML = `
      <div class="glass-card" style="max-width: 680px; margin: 0 auto 32px auto;">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; display:flex; align-items:center; gap:8px;">
          <i data-lucide="database" style="color:var(--primary);"></i> Database Integration Settings (Supabase)
        </h2>
        
        <div style="background: rgba(255,255,255,0.02); padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
          <div style="font-size: 0.85rem; color:var(--text-secondary);">
            <strong>Connection Status:</strong>
            ${isSbConnected ? `
              <span style="color:var(--status-operational-text); font-weight:bold; margin-left:6px; display:inline-flex; align-items:center; gap:6px;">
                <span style="width:8px; height:8px; border-radius:50%; background:var(--status-operational-text); display:inline-block;"></span> Active (Connected to Supabase Tables)
              </span>
            ` : `
              <span style="color:var(--text-muted); font-weight:bold; margin-left:6px; display:inline-flex; align-items:center; gap:6px;">
                <span style="width:8px; height:8px; border-radius:50%; background:var(--text-muted); display:inline-block;"></span> Inactive (Falling back to Browser LocalStorage)
              </span>
            `}
          </div>
          ${isSbConnected ? `<button class="btn btn-danger" id="btn-clear-supabase" style="padding: 6px 12px; font-size: 0.75rem;">Disconnect</button>` : ""}
        </div>
        <form id="form-supabase-config">
          <div class="form-group">
            <label class="form-label">Supabase URL</label>
            <input type="url" id="sb-url" class="form-input" placeholder="https://your-project-id.supabase.co" value="${sbConfig.url || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Supabase Public Anon Key</label>
            <input type="password" id="sb-key" class="form-input" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value="${sbConfig.key || ''}">
          </div>
          
          <div style="display:flex; justify-content:flex-end;">
            <button type="submit" class="btn btn-primary">Save Connection Credentials</button>
          </div>
        </form>
      </div>
      <div class="glass-card" style="max-width: 680px; margin: 0 auto 32px auto;">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; display:flex; align-items:center; gap:8px;">
          <i data-lucide="sparkles" style="color:var(--primary);"></i> Artificial Intelligence Settings (Gemini)
        </h2>
        <div style="background: rgba(255,255,255,0.02); padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
          <div style="font-size: 0.85rem; color:var(--text-secondary);">
            <strong>Gemini Engine Status:</strong>
            ${geminiKey ? `
              <span style="color:var(--status-operational-text); font-weight:bold; margin-left:6px; display:inline-flex; align-items:center; gap:6px;">
                <span style="width:8px; height:8px; border-radius:50%; background:var(--status-operational-text); display:inline-block;"></span> Active (Connected to Google Gemini API)
              </span>
            ` : `
              <span style="color:var(--status-reported-text); font-weight:bold; margin-left:6px; display:inline-flex; align-items:center; gap:6px;">
                <span style="width:8px; height:8px; border-radius:50%; background:var(--status-reported-text); display:inline-block;"></span> Heuristic Fallback (Mocked diagnostics active)
              </span>
            `}
          </div>
          ${geminiKey ? `<button class="btn btn-danger" id="btn-clear-gemini" style="padding: 6px 12px; font-size: 0.75rem;">Clear Key</button>` : ""}
        </div>
        <form id="form-gemini-config">
          <div class="form-group">
            <label class="form-label">Google Gemini API Key</label>
            <input type="password" id="gem-key" class="form-input" placeholder="AIzaSy..." value="${geminiKey || ''}">
            <span style="font-size: 0.72rem; color:var(--text-muted); margin-top:6px; display:block;">
              Your key is saved locally in your browser storage and never uploaded to any intermediary servers.
            </span>
          </div>
          <div style="display:flex; justify-content:flex-end;">
            <button type="submit" class="btn btn-primary">Save Gemini Key</button>
          </div>
        </form>
      </div>
      <div class="glass-card" style="max-width: 680px; margin: 0 auto; border-color: rgba(239, 68, 68, 0.2);">
        <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 12px; color:var(--status-critical-text); display:flex; align-items:center; gap:8px;">
          <i data-lucide="trash-2"></i> Reset Application State
        </h2>
        <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:20px; line-height:1.4;">
          This clears all browser changes and restores the database back to the preloaded SMIT hackathon assets list and history logs (5 assets, 2 open issues). Use this to restart the evaluation demo script.
        </p>
        <button class="btn btn-danger" id="btn-reset-data" style="width:100%;">
          <i data-lucide="refresh-cw"></i> Wipe Local Changes & Load Demo Data
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    this.attachListeners();
  }
  attachListeners() {
    // Supabase config form
    document.getElementById("form-supabase-config")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const url = document.getElementById("sb-url").value.trim();
      const key = document.getElementById("sb-key").value.trim();
      
      if (url && key) {
        await storage.saveSupabaseConfig(url, key);
        alert("Supabase config saved and client connected!");
      } else {
        alert("Please provide both Supabase URL and Anon key.");
      }
      this.renderSettings();
    });
    // Clear Supabase
    document.getElementById("btn-clear-supabase")?.addEventListener("click", () => {
      storage.clearSupabaseConfig();
      alert("Supabase integration disconnected.");
      this.renderSettings();
    });
    // Gemini config form
    document.getElementById("form-gemini-config")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const key = document.getElementById("gem-key").value.trim();
      if (key) {
        ai.saveApiKey(key);
        alert("Gemini key saved successfully!");
      } else {
        alert("Please enter a valid Gemini key.");
      }
      this.renderSettings();
    });
    // Clear Gemini
    document.getElementById("btn-clear-gemini")?.addEventListener("click", () => {
      ai.saveApiKey("");
      alert("Gemini key cleared.");
      this.renderSettings();
    });
    // Reset Data
    document.getElementById("btn-reset-data")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to restore all preloaded SMIT data? This will overwrite your local changes.")) {
        storage.resetToDefaults();
        alert("Application data successfully reset to SMIT hackathon template!");
        
        // Redirect to dashboard
        window.location.hash = "#/";
      }
    });
  }
}
export const settingsPage = new SettingsPage();
