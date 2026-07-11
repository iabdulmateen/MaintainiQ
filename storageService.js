// MaintainIQ Storage Service - Handles LocalStorage & Supabase Integration
const DEFAULT_ASSETS = [
  {
    code: "PRJ-001",
    name: "Classroom Projector 01",
    category: "Electronics / Visual",
    location: "Block B, Room 204",
    condition: "Good",
    status: "Operational",
    lastService: "2026-05-10",
    nextService: "2026-11-10",
    assignedTechnician: "Sajid Khan"
  },
  {
    code: "AC-002",
    name: "Main Air Conditioner Unit",
    category: "HVAC",
    location: "Main Auditorium",
    condition: "Fair",
    status: "Under Maintenance",
    lastService: "2026-06-01",
    nextService: "2026-09-01",
    assignedTechnician: "Arsalan Ahmed"
  },
  {
    code: "LAB-003",
    name: "Chemistry Lab Autoclave",
    category: "Lab Equipment",
    location: "Science Building, Lab 3",
    condition: "Excellent",
    status: "Operational",
    lastService: "2026-04-15",
    nextService: "2026-10-15",
    assignedTechnician: "Sajid Khan"
  },
  {
    code: "SRV-004",
    name: "Server Room Rack 02",
    category: "Infrastructure",
    location: "Admin Block, Server Room",
    condition: "Excellent",
    status: "Operational",
    lastService: "2026-03-01",
    nextService: "2026-09-01",
    assignedTechnician: "Arsalan Ahmed"
  },
  {
    code: "KTN-005",
    name: "Commercial Dishwasher",
    category: "Kitchen Appliances",
    location: "Central Cafeteria",
    condition: "Poor",
    status: "Out of Service",
    lastService: "2026-01-20",
    nextService: "2026-07-20",
    assignedTechnician: "Unassigned"
  }
];
const DEFAULT_ISSUES = [
  {
    id: "ISS-001",
    assetCode: "AC-002",
    title: "Weak cooling and water leakage",
    description: "The AC unit is blowing warm air and there is a steady water drip from the main vent.",
    category: "HVAC / Leakage",
    priority: "High",
    status: "Maintenance In Progress",
    reporterName: "Mariam Ali",
    reporterEmail: "mariam.ali@smit.edu",
    assignedTechnician: "Arsalan Ahmed",
    createdDate: "2026-07-10T14:30:00.000Z",
    evidenceUrl: null,
    maintenanceNotes: "Inspected the drain pipe; found a blockage. Preparing to flush the line and check refrigerant levels.",
    partsReplaced: "",
    cost: 0
  },
  {
    id: "ISS-002",
    assetCode: "KTN-005",
    title: "Heating element failure",
    description: "The dishwasher completes cycles but the water remains completely cold. Dishes are not sanitized.",
    category: "Kitchen Appliances",
    priority: "Critical",
    status: "Reported",
    reporterName: "Chef Bilal",
    reporterEmail: "bilal.kitchen@smit.edu",
    assignedTechnician: "Unassigned",
    createdDate: "2026-07-11T09:15:00.000Z",
    evidenceUrl: null,
    maintenanceNotes: "",
    partsReplaced: "",
    cost: 0
  }
];
const DEFAULT_HISTORY = [
  {
    id: "HIST-001",
    assetCode: "PRJ-001",
    actor: "Admin",
    action: "Asset Registered",
    notes: "Initial registration of the classroom projector.",
    timestamp: "2026-05-10T09:00:00.000Z"
  },
  {
    id: "HIST-002",
    assetCode: "AC-002",
    actor: "Admin",
    action: "Asset Registered",
    notes: "Main auditorium AC unit added to database.",
    timestamp: "2026-06-01T10:00:00.000Z"
  },
  {
    id: "HIST-003",
    assetCode: "AC-002",
    actor: "Mariam Ali",
    action: "Issue Reported (ISS-001)",
    notes: "Weak cooling and water leakage reported.",
    timestamp: "2026-07-10T14:30:00.000Z"
  },
  {
    id: "HIST-004",
    assetCode: "AC-002",
    actor: "Arsalan Ahmed",
    action: "Inspection Started",
    notes: "Technician began diagnostics.",
    timestamp: "2026-07-10T16:00:00.000Z"
  }
];
export class StorageService {
  constructor() {
    this.supabase = null;
    this.initLocalStorage();
    this.initSupabaseClient();
  }
  // Initialize LocalStorage defaults if empty
  initLocalStorage() {
    if (!localStorage.getItem("maintainiq_assets")) {
      localStorage.setItem("maintainiq_assets", JSON.stringify(DEFAULT_ASSETS));
    }
    if (!localStorage.getItem("maintainiq_issues")) {
      localStorage.setItem("maintainiq_issues", JSON.stringify(DEFAULT_ISSUES));
    }
    if (!localStorage.getItem("maintainiq_history")) {
      localStorage.setItem("maintainiq_history", JSON.stringify(DEFAULT_HISTORY));
    }
  }
  // Attempt to initialize Supabase if config is provided
  async initSupabaseClient() {
    const configStr = localStorage.getItem("maintainiq_supabase_config");
    if (configStr) {
      try {
        const config = JSON.parse(configStr);
        if (config.url && config.key) {
          // Dynamic import of Supabase library via CDN
          const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
          this.supabase = createClient(config.url, config.key);
          console.log("Supabase Client initialized successfully!");
        }
      } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
      }
    }
  }
  // Check if Supabase is active
  isSupabaseActive() {
    return this.supabase !== null;
  }
  // Save Supabase credentials to localStorage
  async saveSupabaseConfig(url, key) {
    if (url && key) {
      localStorage.setItem("maintainiq_supabase_config", JSON.stringify({ url, key }));
      await this.initSupabaseClient();
      return true;
    } else {
      localStorage.removeItem("maintainiq_supabase_config");
      this.supabase = null;
      return false;
    }
  }
  getSupabaseConfig() {
    const configStr = localStorage.getItem("maintainiq_supabase_config");
    return configStr ? JSON.parse(configStr) : { url: "", key: "" };
  }
  // Clear Supabase configuration
  clearSupabaseConfig() {
    localStorage.removeItem("maintainiq_supabase_config");
    this.supabase = null;
  }
  // Get assets
  async getAssets() {
    if (this.isSupabaseActive()) {
      try {
        const { data, error } = await this.supabase
          .from("assets")
          .select("*")
          .order("code");
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error("Supabase getAssets failed, falling back to LocalStorage:", err);
      }
    }
const localData = localStorage.getItem("maintainiq_assets");
return localData ? JSON.parse(localData) : [];
  }
  // Get single asset by code
  async getAssetByCode(code) {
    const assets = await this.getAssets();
    return assets.find(a => a.code.toUpperCase() === code.toUpperCase());
  }
  // Save asset (Create or Update)
  async saveAsset(asset) {
    if (this.isSupabaseActive()) {
      try {
        const { data, error } = await this.supabase
          .from("assets")
          .upsert(asset, { onConflict: "code" });
        if (error) throw error;
      } catch (err) {
        console.error("Supabase saveAsset failed, saving to LocalStorage only:", err);
      }
    }
    
    // Always sync to LocalStorage
    const assets = JSON.parse(localStorage.getItem("maintainiq_assets"));
    const index = assets.findIndex(a => a.code.toUpperCase() === asset.code.toUpperCase());
    if (index !== -1) {
      assets[index] = { ...assets[index], ...asset };
    } else {
      assets.push(asset);
    }
    localStorage.setItem("maintainiq_assets", JSON.stringify(assets));
  }
  // Get issues
  async getIssues() {
    if (this.isSupabaseActive()) {
      try {
        const { data, error } = await this.supabase
          .from("issues")
          .select("*")
          .order("createdDate", { ascending: false });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Supabase getIssues failed, falling back to LocalStorage:", err);
      }
    }
    return JSON.parse(localStorage.getItem("maintainiq_issues"));
  }
  // Get single issue by ID
  async getIssueById(id) {
    const issues = await this.getIssues();
    return issues.find(i => i.id === id);
  }
  // Save issue (Create or Update)
  async saveIssue(issue) {
    if (this.isSupabaseActive()) {
      try {
        const { data, error } = await this.supabase
          .from("issues")
          .upsert(issue, { onConflict: "id" });
        if (error) throw error;
      } catch (err) {
        console.error("Supabase saveIssue failed, saving to LocalStorage only:", err);
      }
    }
    const issues = JSON.parse(localStorage.getItem("maintainiq_issues"));
    const index = issues.findIndex(i => i.id === issue.id);
    if (index !== -1) {
      issues[index] = { ...issues[index], ...issue };
    } else {
      issues.push(issue);
    }
    localStorage.setItem("maintainiq_issues", JSON.stringify(issues));
  }
  // Get full asset history or general history
  async getHistory(assetCode = null) {
    if (this.isSupabaseActive()) {
      try {
        let query = this.supabase.from("history").select("*");
        if (assetCode) {
          query = query.eq("assetCode", assetCode);
        }
        const { data, error } = await query.order("timestamp", { ascending: false });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Supabase getHistory failed, falling back to LocalStorage:", err);
      }
    }
    const history = JSON.parse(localStorage.getItem("maintainiq_history"));
    if (assetCode) {
      return history
        .filter(h => h.assetCode.toUpperCase() === assetCode.toUpperCase())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  // Add history entry
  async addHistoryEntry(assetCode, actor, action, notes = "", issueId = null) {
    const entry = {
      id: "HIST-" + Math.floor(100000 + Math.random() * 900000),
      assetCode,
      actor,
      action,
      notes,
      issueId,
      timestamp: new Date().toISOString()
    };
    if (this.isSupabaseActive()) {
      try {
        const { error } = await this.supabase.from("history").insert(entry);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase addHistoryEntry failed, saving to LocalStorage only:", err);
      }
    }
    const history = JSON.parse(localStorage.getItem("maintainiq_history"));
    history.push(entry);
    localStorage.setItem("maintainiq_history", JSON.stringify(history));
  }
  // Reset LocalStorage back to defaults
  resetToDefaults() {
    localStorage.setItem("maintainiq_assets", JSON.stringify(DEFAULT_ASSETS));
    localStorage.setItem("maintainiq_issues", JSON.stringify(DEFAULT_ISSUES));
    localStorage.setItem("maintainiq_history", JSON.stringify(DEFAULT_HISTORY));
  }
}
export const storage = new StorageService();