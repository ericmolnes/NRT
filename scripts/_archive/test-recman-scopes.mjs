import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const key = process.env.RECMAN_API_KEY;
const url = process.env.RECMAN_API_URL || "https://api.recman.io";

// Test candidate fields
const testFields = ["tags", "notes", "forms", "certificates", "certifications"];
for (const field of testFields) {
  const params = new URLSearchParams({ key, scope: "candidate", fields: field, page: "1" });
  const res = await fetch(url + "/v2/get/?" + params.toString());
  const r = await res.json();
  if (r.success) {
    const first = Object.values(r.data)[0];
    const val = first[field];
    const sample = val ? JSON.stringify(val).substring(0, 200) : "null";
    console.log(field + ": VALID - " + sample);
  } else {
    const msg = r.error ? r.error.map(e => e.message).join(", ") : "invalid";
    console.log(field + ": " + msg);
  }
}

// Test ALL POST scopes to find valid ones
console.log("\n--- Valid POST scopes ---");
const postScopes = [
  "candidate", "candidateAttribute", "candidateSkill", "candidateEducation",
  "candidateExperience", "candidateCourse", "candidateReference",
  "candidateProjectExperience", "candidateRelative", "candidateLanguage",
  "candidateDriversLicense", "candidateFile", "candidateNote",
  "company", "project", "job"
];
for (const scope of postScopes) {
  const res = await fetch(url + "/v2/post/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, scope, operation: "insert", data: {} })
  });
  const r = await res.json();
  const invalidScope = (r.error && r.error.some(e => e.message === "Invalid scope")) ||
                        (r.errors && r.errors.includes("Invalid scope"));
  if (invalidScope) continue;
  const errMsg = r.errors ? r.errors[0] : r.error ? r.error[0]?.message : "success";
  console.log("  " + scope + " -> " + errMsg);
}
