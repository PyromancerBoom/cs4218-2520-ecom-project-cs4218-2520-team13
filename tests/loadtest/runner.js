// LOU,YING-WEN, A0338520J
import fs from 'fs';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:6060/api/v1/test';

async function runAllTests() {
    try {
        const csvData = fs.readFileSync('./users.csv', 'utf-8');
        const users = csvData.split('\n').slice(1).map(line => {
            const parts = line.split(',');
            return {
                email: parts[1]?.trim(),
                password: parts[2]?.trim(),
            };
        }).filter(u => u.email && u.password);

        console.log("⏳ [1/5] Global Seeding...");
        const seedRes = await fetch(`${BASE_URL}/seed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users })
        });

        if (!seedRes.ok) throw new Error(`Seed failed: ${seedRes.status}`);
        console.log("✅ Database seeded successfully!\n");

        console.log("🚀 [2/5] Running Search Scenario...");
        try {
            execSync("k6 run usersearch.load.test.js", { stdio: 'inherit' });
        } catch (e) {
            console.log("⚠️ Search finished with threshold warnings, continuing to next...");
        }

        console.log("\n🚀 [3/5] Running Browsing Scenario...");
        try {
            execSync("k6 run browsing.load.test.js", { stdio: 'inherit' });
        } catch (e) {
            console.log("⚠️ Browsing finished with threshold warnings, continuing to next...");
        }

        console.log("\n🚀 [4/5] Running Checkout Scenario...");
        try {
            execSync("k6 run checkout.load.test.js", { stdio: 'inherit' });
        } catch (e) {
            console.log("⚠️ Checkout finished with threshold warnings.");
        }

    } catch (error) {
        console.error("❌ Fatal Error in runner:", error.message);
    } finally {
        console.log("\n🧹 [5/5] Global Cleanup...");
        await fetch(`${BASE_URL}/cleanup`, { method: 'DELETE' });
        console.log("✨ All tests finished and cleaned up!");
    }
}

runAllTests();