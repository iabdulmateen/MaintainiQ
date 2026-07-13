// MaintainIQ Client Router - Hash-Based SPA Router
import { storage } from "./storageService.js";
export class Router {
  constructor() {
    this.routes = {};
    window.addEventListener("hashchange", () => this.handleRouting());
  }
  // Register a path, its page module, and its display title
  register(path, pageModule, title) {
    this.routes[path] = { module: pageModule, title: title };
  }
  // Resolve the current hash route and trigger rendering
  async handleRouting() {
    const hash = window.location.hash || "#/";
    const isPublicRout = hash.startsWith("#/public/");

    // Body par class toggle karo
    if (isPublicRout) {
        document.body.classList.add("public-mode");
    } else {
        document.body.classList.remove("public-mode");
    }
    let matchedRoute = null;
    let params = {};
    // Custom matching for route parameters (e.g., #/public/:id)
    for (const routePath of Object.keys(this.routes)) {
      const routeRegex = new RegExp(
        "^" + routePath.replace(/:[^\s/]+/g, "([^/]+)") + "$"
      );
      const match = hash.match(routeRegex);
      if (match) {
        matchedRoute = this.routes[routePath];
        // Extract parameter values
        const paramNames = (routePath.match(/:[^\s/]+/g) || []).map(p => p.substring(1));
        paramNames.forEach((name, idx) => {
          params[name] = match[idx + 1];
        });
        break;
      }
    }
    const viewContainer = document.getElementById("view-container");
    const appSidebar = document.getElementById("app-sidebar");
    const appHeader = document.querySelector(".app-header");
    const demoBar = document.getElementById("demo-control-bar");
    // Hide dashboard/nav components if it's a public reporting route
    const isPublicRoute = hash.startsWith("#/public/");
    // Is hissay ko update karo:
if (isPublicRoute) {
  if (appSidebar) appSidebar.style.display = "none";
  if (appHeader) appHeader.style.display = "none";
  
  // DEMO BAR KO BHI HIDE KAR DO PITCH KE LIYE
  if (demoBar) demoBar.style.display = "none"; 
  
  document.querySelector(".app-container").style.height = "100vh";
} else {
      if (appSidebar) appSidebar.style.display = "flex";
      if (appHeader) appHeader.style.display = "flex";
      if (demoBar) {
        demoBar.style.display = "flex";
      }
      document.querySelector(".app-container").style.height = "calc(100vh - var(--demo-bar-height))";
    }
    if (matchedRoute) {
      // Update page title in header
      const pageTitleEl = document.getElementById("page-title");
      if (pageTitleEl) pageTitleEl.textContent = matchedRoute.title;
      // Update sidebar nav active states
      this.updateActiveNav(hash);
      // Render view
      viewContainer.innerHTML = `<div class="loading-spinner-view" style="display:flex; justify-content:center; align-items:center; height:100%;"><span class="badge badge-inspection" style="padding: 12px 20px; font-size:1rem;">Loading view...</span></div>`;
      
      try {
        await matchedRoute.module.render(viewContainer, params);
      } catch (err) {
        console.error("Error rendering view:", err);
        viewContainer.innerHTML = `
          <div class="glass-card" style="margin:40px; border-color:var(--status-critical-border); text-align:center;">
            <h2 style="color:var(--status-critical-text); margin-bottom:16px;">Failed to Load View</h2>
            <p style="color:var(--text-secondary); margin-bottom:24px;">An error occurred while loading this page: ${err.message}</p>
            <a href="#/" class="btn btn-primary">Go to Dashboard</a>
          </div>
        `;
      }
    } else {
      // 404 Route Not Found
      if (pageTitleEl) pageTitleEl.textContent = "404 Not Found";
      viewContainer.innerHTML = `
        <div class="glass-card" style="margin:40px; text-align:center;">
          <h2 style="margin-bottom:16px;">Page Not Found</h2>
          <p style="color:var(--text-secondary); margin-bottom:24px;">The page you are looking for does not exist.</p>
          <a href="#/" class="btn btn-primary">Go to Dashboard</a>
        </div>
      `;
    }
    // Refresh Lucide Icons on view loaded
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
  // Update active status on sidebar menu items based on hash route
  updateActiveNav(hash) {
    const navItems = document.querySelectorAll(".nav-menu .nav-item");
    navItems.forEach(item => item.classList.remove("active"));
    if (hash === "#/" || hash === "") {
      document.getElementById("nav-dashboard")?.classList.add("active");
    } else if (hash.startsWith("#/assets")) {
      document.getElementById("nav-assets")?.classList.add("active");
    } else if (hash.startsWith("#/issues")) {
      document.getElementById("nav-issues")?.classList.add("active");
    } else if (hash.startsWith("#/settings")) {
      document.getElementById("nav-settings")?.classList.add("active");
    }
  }
}
export const router = new Router();
