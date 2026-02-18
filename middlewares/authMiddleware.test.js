// Priyansh Bimbisariye, A0265903B
import JWT from "jsonwebtoken";
import { requireSignIn, isAdmin } from "./authMiddleware.js";
import userModel from "../models/userModel.js";

// Mocks of external dependencies
jest.mock("jsonwebtoken");
jest.mock("../models/userModel.js");

describe("authMiddleware", () => {
    let mockReq, mockRes, mockNext;

    // rest mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            headers: { authorization: "validToken123" },
            user: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        mockNext = jest.fn();
    });

    describe("requireSignIn", () => {
        // partition - valid token class
        it("should decode token and call next() for a valid token", async () => {
            // arrange
            const decoded = { _id: "user123" };
            JWT.verify.mockReturnValue(decoded);
            // act
            await requireSignIn(mockReq, mockRes, mockNext);
            // assert
            expect(JWT.verify).toHaveBeenCalledWith(
                "validToken123",
                process.env.JWT_SECRET
            );
            expect(mockReq.user).toEqual(decoded);
            expect(mockNext).toHaveBeenCalled();
        });

        // partition - invalid token class
        it("should return 401 when token is invalid", async () => {
            // arrange
            JWT.verify.mockImplementation(() => {
                throw new Error("invalid token");
            });
            // act
            await requireSignIn(mockReq, mockRes, mockNext);
            // assert
            expect(mockNext).not.toHaveBeenCalled(); // no calles to next()
            expect(mockRes.status).toHaveBeenCalledWith(401); // send back 401
        });

        // absent input boundary
        it("should return 401 when authorization header is missing", async () => {
            // arrange
            mockReq.headers.authorization = undefined;
            JWT.verify.mockImplementation(() => {
                throw new Error("jwt must be provided");
            });
            // act
            await requireSignIn(mockReq, mockRes, mockNext);
            // assert
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
    });

    describe("isAdmin", () => {
        // parittion - authorized (admin) class
        it("should call next() when user has admin role", async () => {
            // arrange
            mockReq.user = { _id: "admin123" };
            // db stub
            userModel.findById.mockResolvedValue({ role: 1 });
            // act
            await isAdmin(mockReq, mockRes, mockNext);
            // assert
            expect(userModel.findById).toHaveBeenCalledWith("admin123");
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalledWith(401);
        });

        // partition - unauthorized (non-admin) class
        it("should return 401 when user is not an admin", async () => {
            // arrange
            mockReq.user = { _id: "user123" };
            userModel.findById.mockResolvedValue({ role: 0 });
            // act
            await isAdmin(mockReq, mockRes, mockNext);
            // assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.send).toHaveBeenCalledWith({
                success: false,
                message: "UnAuthorized Access",
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        // partition - error class
        it("should return 401 when database lookup fails", async () => {
            // arrange
            mockReq.user = { _id: "user123" };
            const dbError = new Error("DB connection failed");
            userModel.findById.mockRejectedValue(dbError);
            // act
            await isAdmin(mockReq, mockRes, mockNext);
            // assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.send).toHaveBeenCalledWith({
                success: false,
                error: dbError,
                message: "Error in admin middleware",
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
