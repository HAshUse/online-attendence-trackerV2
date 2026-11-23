/**
 * LLM Attendance Data Cleaner & Stakeholder Formatting Service
 * Uses Google Gemini Flash (Free Tier) with rule-based fallback.
 */

// Title case helper
const toTitleCase = (str = "") =>
  str
    .toLowerCase()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/**
 * Fallback rule-based cleaning when LLM key is not provided or network is offline.
 * shortcut: rule-based fallback when GEMINI_API_KEY is not set, upgrade when user sets key in .env
 */
export const ruleBasedClean = (records = [], requirements = "") => {
  const minMinsMatch = (requirements || "").match(/(\d+)\s*(?:min|mins|minutes)/i);
  const minDuration = minMinsMatch ? parseInt(minMinsMatch[1], 10) : 0;

  const cleaned = [];
  let fullCount = 0;
  let earlyCount = 0;

  records.forEach((r, idx) => {
    const student = r.student || {};
    const duration = r.durationMins || 0;

    // Apply minimum duration requirement if requested
    if (minDuration > 0 && duration < minDuration) {
      return;
    }

    const rawName = student.fullName || "Student";
    const cleanName = toTitleCase(rawName);
    const cleanCollege = (student.college || "UNKNOWN").trim().toUpperCase();
    const cleanGroup = (student.group || "N/A").trim().toUpperCase();

    let engagement = "Full Attendance";
    if (duration >= 20) {
      engagement = "High Engagement";
      fullCount++;
    } else if (duration >= 5) {
      engagement = "Moderate";
      fullCount++;
    } else {
      engagement = "Left Early / Inactive";
      earlyCount++;
    }

    cleaned.push({
      sNo: cleaned.length + 1,
      fullName: cleanName,
      email: (student.email || "").toLowerCase().trim(),
      college: cleanCollege,
      group: cleanGroup,
      joinedAt: r.joinedAt ? new Date(r.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-",
      leftAt: r.leftAt ? new Date(r.leftAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-",
      durationMins: duration,
      status: r.status || "Attended",
      engagement,
      stakeholderNotes: duration === 0 ? "Flagged: 0 mins logged" : `Active for ${duration} mins`,
    });
  });

  const summary = `Class report: ${cleaned.length} students processed (${fullCount} actively engaged, ${earlyCount} flagged for low duration/early exit). Cleaned via rule engine.`;

  return {
    summary,
    records: cleaned,
    engine: "Rule Engine (Add GEMINI_API_KEY for advanced LLM)",
  };
};

/**
 * Clean and format raw attendance records using Google Gemini Flash API.
 */
export const cleanAttendanceWithLLM = async ({ records = [], requirements = "", selectedColumns = [] }) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return ruleBasedClean(records, requirements);
  }

  const rawSample = records.map((r, i) => ({
    id: i + 1,
    fullName: r.student?.fullName || "",
    email: r.student?.email || "",
    college: r.student?.college || "",
    group: r.student?.group || "",
    joinedAt: r.joinedAt ? new Date(r.joinedAt).toLocaleTimeString() : "-",
    leftAt: r.leftAt ? new Date(r.leftAt).toLocaleTimeString() : "-",
    durationMins: r.durationMins || 0,
    exitStatus: r.exitStatus || "",
    status: r.status || "Attended",
  }));

  const prompt = `You are an expert educational data cleaning agent.
Clean and format the following student attendance records for executive stakeholders.

Teacher's Specific Requirements:
"${requirements || "Clean all student names to Title Case, normalize college names, categorize engagement level, and highlight any anomalies."}"

Available Columns to Include:
${JSON.stringify(selectedColumns.length > 0 ? selectedColumns : ["fullName", "email", "college", "group", "joinedAt", "leftAt", "durationMins", "status", "engagement", "stakeholderNotes"])}

Raw Records:
${JSON.stringify(rawSample, null, 2)}

Respond with STRICT JSON only matching this schema:
{
  "summary": "1-2 sentence executive summary of overall attendance & engagement for stakeholders",
  "records": [
    {
      "sNo": 1,
      "fullName": "Cleaned Student Name",
      "email": "student@email.com",
      "college": "NORMALIZED COLLEGE",
      "group": "GROUP",
      "joinedAt": "02:05 PM",
      "leftAt": "02:50 PM",
      "durationMins": 45,
      "status": "Attended",
      "engagement": "High Engagement | Moderate | Left Early",
      "stakeholderNotes": "Brief 3-6 word note"
    }
  ]
}`;

  // Resilient model cascade: try fast active models first
  const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.7-flash", "gemini-2.5-flash"];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText);
      return {
        summary: parsed.summary || "Attendance records successfully cleaned and formatted.",
        records: parsed.records || [],
        engine: `Gemini AI (${model})`,
      };
    } catch (err) {
      // try next candidate model
    }
  }

  // Graceful rule-based fallback if all models or network fail
  return ruleBasedClean(records, requirements);
};
