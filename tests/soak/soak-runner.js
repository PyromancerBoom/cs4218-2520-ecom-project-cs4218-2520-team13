// Priyansh Bimbisariye, A0265903B
import fs from "fs";
import { execSync } from "child_process";

const BASE_URL = "http://localhost:6060/api/v1/test";
const TEST_FILE = "soak05-mixed-workload.soak.test.js";

// Priyansh Bimbisariye, A0265903B
async function runSoakTest() {
  try {
    const csvData = fs.readFileSync("./users.csv", "utf-8");
    const users = csvData
      .split("\n")
      .slice(1)
      .map((line) => {
        const parts = line.split(",");
        return { email: parts[1]?.trim(), password: parts[2]?.trim() };
      })
      .filter((user) => user.email && user.password);

    console.log("[1/3] Seeding database...");
    const seedRes = await fetch(`${BASE_URL}/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users }),
    });
    if (!seedRes.ok) throw new Error(`Seed failed: HTTP ${seedRes.status}`);
    console.log("Database seeded successfully.\n");

    console.log(`[2/3] Running ${TEST_FILE}...`);
    try {
      execSync(`k6 run ${TEST_FILE}`, { stdio: "inherit" });
    } catch (_e) {
      console.log(
        "Soak test completed with threshold failures. Review the degradation report for details.",
      );
    }
  } catch (err) {
    console.error("Fatal error:", err.message);
  } finally {
    console.log("\n[3/3] Cleaning up test data...");
    await fetch(`${BASE_URL}/cleanup`, { method: "DELETE" });
    console.log("Cleanup complete.");
  }
}

runSoakTest();
