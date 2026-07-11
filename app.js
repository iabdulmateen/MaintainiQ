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
  // 2. Register Client-Side SPA Routes
  router.register("#/", dashboardPage, "Dashboard Overview");
  router.register("#/assets", assetsPage, "Asset Management Directory");
  router.register("#/issues", issuesPage, "Internal Maintenance Requests");
  router.register("#/public/:assetCode", publicAssetPage, "Public Asset Details");
  router.register("#/settings", settingsPage, "Platform Configuration Settings");
  // 3. Process Initial Hash Route Routing
  router.handleRouting();
  // 4. Setup Global UI Event Listeners
  setupGlobalListeners();
});
// Setup persona-switching details
function initUserPersona() {
  let role = localStorage.getItem("maintainiq_active_role");
  if (!role) {
    role = "admin";
    localStorage.setItem("maintainiq_active_role", "admin");
  }
  // Update active state in demo switcher bar
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
      // Reset active button class
      document.querySelectorAll(".demo-roles .role-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      // Update badge details
      updateSidebarUserBadge(role);
      // Force-re-trigger routing to reload views under new persona
      router.handleRouting();
    });
  }
}