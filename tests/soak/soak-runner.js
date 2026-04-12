// Priyansh Bimbisariye, A0265903B

import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "http://localhost:6060/api/v1/test";
const TEST_FILE = "soak_main_mixed_workload.soak.test.js";
const RESULTS_FILE = path.join(__dirname, "soak-results.json");
const REPORT_FILE = path.join(__dirname, "soak-report.html");
const withDashboard = process.argv.includes("--dashboard");

// Reading and parsing the CSV
function loadTestUsers(filePath) {
  const csvData = fs.readFileSync(filePath, "utf-8");
  return csvData
    .split("\n")
    .slice(1) // skip header
    .map((line) => {
      const parts = line.split(",");
      return { email: parts[1]?.trim(), password: parts[2]?.trim() };
    })
    .filter((user) => user.email && user.password);
}

// Database seeding
async function seedDatabase(users) {
  console.log("[1/3] Seeding database...");
  const res = await fetch(`${BASE_URL}/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ users }),
  });

  if (!res.ok) throw new Error(`Seed failed: HTTP ${res.status}`);
  console.log("Database seeded successfully.\n");
}

// Executing the K6 CLI command
function executeK6Test() {
  console.log(`[2/3] Running ${TEST_FILE}...${withDashboard ? " (dashboard at http://localhost:5665)" : ""}`);
  
  const dashboardFlag = withDashboard ? " --out web-dashboard" : "";
  const command = `k6 run --out json=${RESULTS_FILE}${dashboardFlag} ${TEST_FILE}`;
  
  const env = { ...process.env };
  if (withDashboard) {
    env.K6_WEB_DASHBOARD = "true";
    env.K6_WEB_DASHBOARD_EXPORT = REPORT_FILE;
  }

  try {
    execSync(command, { stdio: "inherit", env });
  } catch (_e) {
    console.log("Soak test completed with threshold failures. Review the output above for details.\n");
  }
}

// Post-test database cleanup
async function cleanupDatabase() {
  console.log("\n[3/3] Cleaning up test data...");
  await fetch(`${BASE_URL}/cleanup`, { method: "DELETE" });
  console.log("Cleanup complete.");
}

async function runSoakTest() {
  try {
    const users = loadTestUsers("./users.csv");
    await seedDatabase(users);
    executeK6Test();
  } catch (err) {
    console.error("Fatal error:", err.message);
  } finally {
    await cleanupDatabase();
  }
}

runSoakTest();