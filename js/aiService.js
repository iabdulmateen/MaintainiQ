// MaintainIQ AI Service - Manages Gemini API Calls and Intelligent Triage Fallbacks
export class AIService {
  constructor() {
    this.apiKey = localStorage.getItem("maintainiq_gemini_key") || "";
  }
  // Save the Gemini key to local storage
  saveApiKey(key) {
    this.apiKey = key;
    if (key) {
      localStorage.setItem("maintainiq_gemini_key", key);
    } else {
      localStorage.removeItem("maintainiq_gemini_key");
    }
  }
  saveApiKey(key) {
    if (key === "") {
        localStorage.removeItem("maintainiq_gemini_key");
        this.apiKey = "";
    } else if (key) {
        this.apiKey = key;
        localStorage.setItem("maintainiq_gemini_key", key);
    }
}
  getApiKey() {
    return localStorage.getItem("maintainiq_gemini_key") || "";
  }
  // Generate structured issue details from natural-language complaints
  async triageComplaint(complaint, asset) {
    if (this.apiKey) {
      try {
        const response = await this.callGemini(complaint, asset);
        if (response) return response;
      } catch (err) {
        console.error("Gemini API error, running heuristic fallback:", err);
      }
    }
    
    // Heuristic fallbacks for zero-config demo
    return this.heuristicTriage(complaint, asset);
  }
  // Call the Gemini API with a system prompt and structured JSON requests
  async callGemini(complaint, asset) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
    
    const prompt = `
You are an expert AI maintenance inspector for a facility management system.
Convert the following natural-language complaint into a structured JSON record.
Asset Context:
- Name: ${asset.name}
- Category: ${asset.category}
- Code: ${asset.code}
- Location: ${asset.location}
- Condition: ${asset.condition}
User Complaint:
"${complaint}"
Return a JSON object matching this structure EXACTLY (do not include markdown markers or anything outside the JSON structure):
{
  "title": "Short professional issue title",
  "category": "Broad category like HVAC, Electronics, Plumbing, Lab Equipment",
  "priority": "One of: Low, Medium, High, Critical",
  "possibleCauses": ["Cause 1", "Cause 2", "Cause 3"],
  "safeChecks": ["Safe check 1", "Safe check 2"],
  "recurringPatternWarning": "If this asset category indicates critical issues (e.g. electrical fire risks) or shows high risk, warning text here, else null"
}
Safety Requirements:
- Do not provide unsafe instructions for high-voltage, heating elements, high-pressure, or chemical systems.
- Include warnings if the task requires a licensed professional.
`;
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    const responseText = result.candidates[0].content.parts[0].text;
    return JSON.parse(responseText.trim());
  }
  // Heuristic mock triage when API key is unavailable (fully matches the projector demo case)
  heuristicTriage(complaint, asset) {
    const text = complaint.toLowerCase();
    
    // Default fallback values
    let title = "Reported Facility Issue";
    let category = asset.category || "General Maintenance";
    let priority = "Medium";
    let possibleCauses = ["General wear and tear", "Operational failure"];
    let safeChecks = ["Inspect physical condition", "Report status changes to supervisor"];
    let warning = null;
    if (text.includes("flicker") || text.includes("display") || text.includes("projector") || text.includes("hdmi")) {
      title = "Display Flickering & HDMI Detection Issue";
      category = "Electronics / Visual";
      priority = "High";
      possibleCauses = [
        "Loose or damaged HDMI cable connection",
        "Aging projector lamp source",
        "Incorrect input source selection on media unit",
        "Port hardware wear on the wall plate"
      ];
      safeChecks = [
        "Unplug the HDMI cable from both ends and plug it back in securely.",
        "Attempt to use a different HDMI cable to isolate the cord failure.",
        "Check if the indicator LED on the projector displays red/flashing codes.",
        "Ensure the projector filter is clear of heavy dust buildup."
      ];
      warning = "Note: If the issue persists, the internal optical lamp may require replacement by an IT hardware technician.";
    } 
    else if (text.includes("ac") || text.includes("leak") || text.includes("cool") || text.includes("leakage") || text.includes("noise")) {
      title = "AC Unit Water Leakage & Cooling Degradation";
      category = "HVAC / Climate Control";
      priority = "High";
      possibleCauses = [
        "Clogged condensate drainage tray or pipe",
        "Dirty air filters restricting proper evaporation",
        "Low refrigerant gas pressure from line micro-leaks",
        "Frozen evaporator coils due to continuous high load"
      ];
      safeChecks = [
        "Verify if water is leaking near electrical sockets or servers. Turn off power immediately if so.",
        "Inspect the air filter element for dust clogging.",
        "Confirm if the external condenser fan is operating when the system is on."
      ];
      warning = "Caution: Turn off the AC immediately if water leakage is dripping near electrical cables or wall switches.";
    }
    else if (text.includes("spark") || text.includes("shock") || text.includes("electrical") || text.includes("power") || text.includes("socket") || text.includes("short")) {
      title = "Electrical Outlet Failure & Sparking Hazard";
      category = "Electrical System";
      priority = "Critical";
      possibleCauses = [
        "Loose contact terminals behind the socket plate",
        "Overload on the local circuit breaker loop",
        "Damaged internal conductor isolation sleeve"
      ];
      safeChecks = [
        "WARNING: DO NOT touch the wall plate, outlet, or bare wires.",
        "Immediately unplug any appliances connected to this circuit.",
        "Admin must shut off the corresponding breaker fuse in the floor panel."
      ];
      warning = "DANGER: High risk of electrical fire or shock. Qualified electrical technician required immediately.";
    }
    else if (text.includes("autoclave") || text.includes("heat") || text.includes("pressure") || text.includes("lab")) {
      title = "Lab Equipment Chamber Pressure / Heat Failure";
      category = "Lab Equipment";
      priority = "High";
      possibleCauses = [
        "Failed door gasket sealing gasket ring",
        "Heating element failure",
        "Pressure safety valve malfunction"
      ];
      safeChecks = [
        "Ensure the door seal is clear of chemical residue and dust.",
        "Inspect if water levels are filled to the required marker line.",
        "Check power grid feed stability."
      ];
      warning = "Safety Alert: Steam chamber under high pressure. Do not attempt to force open doors while hot.";
    }
    return {
      title,
      category,
      priority,
      possibleCauses,
      safeChecks,
      recurringPatternWarning: warning
    };
  }
  // Generates a quick AI summary of technical work notes
  async generateMaintenanceSummary(issue) {
    if (this.apiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
        const prompt = `
Generate a professional, structured maintenance resolution summary from these technician work details:
Asset: ${issue.assetCode}
Issue Title: ${issue.title}
Technician Notes: ${issue.maintenanceNotes}
Replaced Parts: ${issue.partsReplaced || "None"}
Repair Cost: $${issue.cost}
Provide a 2-3 sentence summary suitable for administration records, and list one preventive recommendation.
Return direct text without headers.
`;
        const requestBody = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 }
        };
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });
        if (response.ok) {
          const result = await response.json();
          return result.candidates[0].content.parts[0].text.trim();
        }
      } catch (err) {
        console.error("AI Summary generation failed, using fallback:", err);
      }
    }
    // Default static resolution summaries
    return `Maintenance for ${issue.assetCode} successfully resolved. Technician reported: "${issue.maintenanceNotes}". Parts used: ${issue.partsReplaced || "None"} with total cost of $${issue.cost}. Recommendation: Schedule standard follow-up inspection in 90 days.`;
  }
}
export const ai = new AIService();