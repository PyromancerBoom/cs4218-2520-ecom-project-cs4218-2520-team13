import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcrypt"; // 如果你是用 bcryptjs，請改成 import bcrypt from "bcryptjs";

const generateData = async () => {
    const userCount = 100;
    const plainPassword = "password123";

    // 產生真實的 bcrypt hash 給資料庫用
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const locations = [
        "1 Computing Drive, NUS", "Clementi Ave 3", "Jurong East St 13",
        "Orchard Road", "Marina Bay Sands", "Woodlands Checkpoint"
    ];

    let jsonArray = [];
    let csvContent = "id,email,password\n";

    for (let i = 1; i <= userCount; i++) {
        // 產生隨機的 24 碼 MongoDB ObjectId
        const objectId = crypto.randomBytes(12).toString("hex");
        const email = `loadtest_user${i}@example.com`;
        const name = `Test User ${i}`;
        const address = locations[Math.floor(Math.random() * locations.length)];
        const dateStr = new Date().toISOString();

        // 1. 準備給 MongoDB Compass 匯入的 JSON 格式
        jsonArray.push({
            _id: { $oid: objectId },
            name: name,
            email: email,
            password: hashedPassword, // 資料庫存 Hash
            phone: `8${Math.floor(1000000 + Math.random() * 9000000)}`, // 新加坡 8 開頭手機
            address: address,
            answer: "Singapore",
            role: 0,
            createdAt: { $date: dateStr },
            updatedAt: { $date: dateStr },
            __v: 0,
        });

        // 2. 準備給 k6 讀取的 CSV 格式
        csvContent += `${i},${email},${plainPassword}\n`; // k6 用明碼
    }

    // 寫入檔案
    fs.writeFileSync("users_import.json", JSON.stringify(jsonArray, null, 2));
    fs.writeFileSync("users.csv", csvContent);

    console.log(`✅ 成功產生 100 筆資料！`);
    console.log(`- 請將 users_import.json 匯入 MongoDB Compass`);
    console.log(`- 請將 users.csv 餵給 k6 腳本使用`);
};

generateData();