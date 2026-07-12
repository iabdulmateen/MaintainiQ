// MaintainIQ Main Application Controller
import { router } from "./js/router.js";
import { dashboardPage } from "./js/pages/dashboard.js";
import { assetsPage } from "./js/pages/assets.js";
import { issuesPage } from "./js/pages/issues.js";
import { publicAssetPage } from "./js/pages/publicAsset.js";
import { settingsPage } from "./js/pages/settings.js";

// Page mapping and initialization
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Active Persona State
  initUserPersona();
  
  // 2. Set initial UI visibility based on loaded persona
  const initialRole = localStorage.getItem("maintainiq_active_role");
  applyRoleVisibility(initialRole);

  // 3. Register Client-Side SPA Routes
  router.register("#/", dashboardPage, "Dashboard Overview");
  router.register("#/assets", assetsPage, "Asset Management Directory");
  router.register("#/issues", issuesPage, "Internal Maintenance Requests");
  router.register("#/public/:assetCode", publicAssetPage, "Public Asset Details");
  router.register("#/settings", settingsPage, "Platform Configuration Settings");
  
  // 4. Process Initial Hash Route Routing
  router.handleRouting();
  
  // 5. Setup Global UI Event Listeners
  setupGlobalListeners();
});

// Demo-only persona switcher for frontend evaluation.
function initUserPersona() {
  let role = localStorage.getItem("maintainiq_active_role");
  if (!role) {
    role = "admin";
    localStorage.setItem("maintainiq_active_role", "admin");
  }
  
  const btns = document.querySelectorAll(".demo-roles .role-btn");
  btns.forEach(btn => {
    if (btn.getAttribute("data-role") === role) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  updateSidebarUserBadge(role);
}

// Update the user information block dynamically based on role selection
function updateSidebarUserBadge(role) {
  const avatarEl = document.getElementById("user-avatar");
  const nameEl = document.getElementById("user-name");
  const roleEl = document.getElementById("user-role");
  
  if (role === "admin") {
    avatarEl.textContent = "A";
    avatarEl.style.background = "var(--primary)";
    nameEl.textContent = "System Administrator";
    roleEl.textContent = "Full Access";
    localStorage.setItem("maintainiq_user_name", "Administrator");
  } 
  else if (role === "technician") {
    avatarEl.textContent = "T";
    avatarEl.style.background = "var(--status-maintenance-text)";
    nameEl.textContent = "Arsalan Ahmed";
    roleEl.textContent = "Maintenance Tech";
    localStorage.setItem("maintainiq_user_name", "Arsalan Ahmed (Technician)");
  } 
  else {
    avatarEl.textContent = "P";
    avatarEl.style.background = "var(--status-reported-text)";
    nameEl.textContent = "Public Reporter";
    roleEl.textContent = "Anonymous Guest";
    localStorage.setItem("maintainiq_user_name", "Anonymous Reporter");
  }
}

// Bind demo persona switching buttons
function setupGlobalListeners() {
  const rolesContainer = document.querySelector(".demo-roles");
  if (rolesContainer) {
    rolesContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".role-btn");
      if (!btn) return;
      const role = btn.getAttribute("data-role");
      
      localStorage.setItem("maintainiq_active_role", role);
      
      document.querySelectorAll(".demo-roles .role-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      updateSidebarUserBadge(role);
      applyRoleVisibility(role); // Role change hone par UI update
      
      router.handleRouting();
    });
  }
}

// Dynamic UI Visibility based on role
window.applyRoleVisibility = function(role) {
    // 1. Sidebar Items ke IDs
    const navDashboard = document.getElementById('nav-dashboard');
    const navAssets = document.getElementById('nav-assets');
    const navIssues = document.getElementById('nav-issues');
    const navSettings = document.getElementById('nav-settings');

    // 2. Sidebar Visibility Logic
    if (navDashboard) navDashboard.style.display = 'block';

    if (navAssets) {
        navAssets.style.display = (role === 'technician' || role === 'public') ? 'block' : 'block'; 
       
        navAssets.style.display = (role === 'technician') ? 'none' : 'block';
    }

    if (navIssues) navIssues.style.display = (role === 'admin' || role === 'technician') ? 'block' : 'none';
    if (navSettings) navSettings.style.display = (role === 'admin') ? 'block' : 'none';

    // 3. Register Button Visibility Logic
    const registerBtn = document.getElementById('register-asset-btn');
    if (registerBtn) {
        registerBtn.style.display = (role === 'admin') ? 'inline-flex' : 'none';
    }
}