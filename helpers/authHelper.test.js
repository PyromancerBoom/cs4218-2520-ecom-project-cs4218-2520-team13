// Priyansh Bimbisariye, A0265903B
import { hashPassword, comparePassword } from "./authHelper.js";

describe("authHelper", () => {
    describe("hashPassword", () => {
        // happy path
        it("should return a valid bcrypt hash for a normal password", async () => {
            // arrange
            const password = "test123";
            // act
            const result = await hashPassword(password);
            // assert
            expect(result).toBeDefined();
            expect(result).toMatch(/^\$2[ab]\$/); // bcrypt signature prefix
            expect(result.length).toBeGreaterThanOrEqual(50);
        });

        // edge case
        it("should return a valid hash for an empty string", async () => {
            // arrange 
            const password = "";
            // act
            const result = await hashPassword(password);
            // assert
            expect(result).toBeDefined();
            expect(result).toMatch(/^\$2[ab]\$/);
            expect(result.length).toBeGreaterThanOrEqual(50);
        });

        // unhappy path, hit the catch block
        it("should return undefined when password is undefined", async () => {
            // arrange
            const password = undefined;
            // act
            const result = await hashPassword(password);
            // assert
            expect(result).toBeUndefined();
        });
    });

    describe("comparePassword", () => {
        it("should return true for a matching password", async () => {
            // arrange
            const password = "test";
            const hash = await hashPassword(password);
            // act
            const result = await comparePassword(password, hash);
            // assert
            expect(result).toBe(true);
        });

        it("should return false for a wrong password", async () => {
            // arrange
            const hash = await hashPassword("correct");
            // act
            const result = await comparePassword("wrong", hash);
            // assert
            expect(result).toBe(false);
        });
    });
});
