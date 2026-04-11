// Priyansh Bimbisariye, A0265903B
import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "http://localhost:6060/api/v1/test";
const TEST_FILE = "soak_main_mixed_workload.soak.test.js";
const RESULTS_FILE = path.join(__dirname, "soak-results.json");

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

    console.log("[1/4] Seeding database...");
    const seedRes = await fetch(`${BASE_URL}/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users }),
    });
    if (!seedRes.ok) throw new Error(`Seed failed: HTTP ${seedRes.status}`);
    console.log("Database seeded successfully.\n");

    console.log(`[2/4] Running ${TEST_FILE}...`);
    try {
      execSync(`k6 run --out json=${RESULTS_FILE} ${TEST_FILE}`, {
        stdio: "inherit",
      });
    } catch (_e) {
      console.log(
        "Soak test completed with threshold failures. Review the output above for details.\n",
      );
    }

    console.log("[3/4] Validating data integrity...");
    await validateDataIntegrity();
  } catch (err) {
    console.error("Fatal error:", err.message);
  } finally {
    console.log("\n[4/4] Cleaning up test data...");
    await fetch(`${BASE_URL}/cleanup`, { method: "DELETE" });
    console.log("Cleanup complete.");
  }
}

async function validateDataIntegrity() {
  // Count actual orders in the DB created by test users
  let dbOrderCount = 0;
  try {
    const res = await fetch(`${BASE_URL}/order-count`);
    if (res.ok) {
      const data = await res.json();
      dbOrderCount = data.count;
    } else {
      console.log("  Could not fetch order count from DB. Skipping validation.");
      return;
    }
  } catch (_e) {
    console.log("  Could not reach server for order count. Skipping validation.");
    return;
  }

  // Extract payment success count from k6 JSON output
  let k6PaymentSuccesses = 0;
  try {
    if (fs.existsSync(RESULTS_FILE)) {
      const lines = fs.readFileSync(RESULTS_FILE, "utf-8").split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        const entry = JSON.parse(line);
        if (
          entry.type === "Point" &&
          entry.metric === "soak_payment_successes"
        ) {
          k6PaymentSuccesses += entry.data.value;
        }
      }
    } else {
      console.log("  No results file found. Skipping validation.");
      return;
    }
  } catch (_e) {
    console.log("  Could not parse k6 results file. Skipping validation.");
    return;
  }

  // Compare
  console.log(`  k6 reported payment successes: ${k6PaymentSuccesses}`);
  console.log(`  Actual orders in database:     ${dbOrderCount}`);

  if (k6PaymentSuccesses === 0 && dbOrderCount === 0) {
    console.log("  No payments were made during the test. Nothing to validate.");
  } else if (dbOrderCount === k6PaymentSuccesses) {
    console.log("  DATA INTEGRITY: PASS - All successful payments have matching orders.");
  } else {
    const diff = Math.abs(dbOrderCount - k6PaymentSuccesses);
    console.log(
      `  DATA INTEGRITY: FAIL - Mismatch of ${diff} orders. ` +
        `Expected ${k6PaymentSuccesses}, found ${dbOrderCount} in DB.`,
    );
  }
}

runSoakTest();
