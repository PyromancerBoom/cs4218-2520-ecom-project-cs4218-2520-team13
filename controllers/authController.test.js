const { describe, it, expect, beforeEach } = require("@jest/globals");

jest.mock("mongoose", () => ({
    __esModule: true,
    default: {
        Schema: jest.fn(),
        model: jest.fn(),
        ObjectId: jest.fn(),
    },
    Schema: jest.fn(),
    model: jest.fn(),
}));

const mockSave = jest.fn();

jest.mock("../models/userModel.js", () => {
    const MockModel = jest.fn().mockImplementation(() => ({ save: mockSave }));
    MockModel.findById = jest.fn();
    MockModel.findByIdAndUpdate = jest.fn();
    MockModel.findByIdAndDelete = jest.fn();
    MockModel.find = jest.fn();
    MockModel.findOne = jest.fn();
    return { __esModule: true, default: MockModel };
});

jest.mock("../models/orderModel.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    },
}));

jest.mock("../helpers/authHelper.js", () => ({
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
    __esModule: true,
    default: {
        sign: jest.fn(),
        verify: jest.fn(),
        decode: jest.fn(),
    },
}));

const {
    registerController,
    loginController,
    forgotPasswordController,
    testController,
    updateProfileController,
    getOrdersController,
    getAllOrdersController,
    orderStatusController,
    updateRoleController,
    deleteUserController,
    getAllUsersController,
} = require("./authController.js");

const mockUserModel = require("../models/userModel.js").default;
const mockUserFind = mockUserModel.find;
const mockUserFindById = mockUserModel.findById;
const mockUserFindByIdAndUpdate = mockUserModel.findByIdAndUpdate;
const mockUserFindByIdAndDelete = mockUserModel.findByIdAndDelete;
const mockUserFindOne = mockUserModel.findOne;

const mockOrderModel = require("../models/orderModel.js").default;
const mockOrderFind = mockOrderModel.find;
const mockOrderFindByIdAndUpdate = mockOrderModel.findByIdAndUpdate;

const mockAuthHelper = require("../helpers/authHelper.js");
const mockHashPassword = mockAuthHelper.hashPassword;
const mockComparePassword = mockAuthHelper.comparePassword;

const mockJwt = require("jsonwebtoken").default;
const mockJwtSign = mockJwt.sign;

let consoleLogSpy;

beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => { });
});

afterAll(() => {
    consoleLogSpy.mockRestore();
});

// Wei Sheng, A0259272X
describe("updateProfileController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { _id: "user123" },
            body: {},
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe("Field updates", () => {
        // Wei Sheng, A0259272X
        it("should update name from req.body.name", async () => {
            req.body = { name: "Updated Name" };
            const mockUser = { _id: "user123", name: "Old Name", password: "hashed" };
            const updatedUser = { ...mockUser, name: "Updated Name" };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

            await updateProfileController(req, res);

            expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                expect.objectContaining({ name: "Updated Name" }),
                { new: true },
            );
        });

        // Wei Sheng, A0259272X
        it("should update phone from req.body.phone", async () => {
            req.body = { phone: "9876543210" };
            const mockUser = {
                _id: "user123",
                phone: "1234567890",
                password: "hashed",
            };
            const updatedUser = { ...mockUser, phone: "9876543210" };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

            await updateProfileController(req, res);

            expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                expect.objectContaining({ phone: "9876543210" }),
                { new: true },
            );
        });

        // Wei Sheng, A0259272X
        it("should update address from req.body.address", async () => {
            req.body = { address: "456 New St" };
            const mockUser = {
                _id: "user123",
                address: "123 Old St",
                password: "hashed",
            };
            const updatedUser = { ...mockUser, address: "456 New St" };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

            await updateProfileController(req, res);

            expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                expect.objectContaining({ address: "456 New St" }),
                { new: true },
            );
        });

        // Wei Sheng, A0259272X
        it("should keep existing values when fields are not provided", async () => {
            req.body = {};
            const mockUser = {
                _id: "user123",
                name: "Original Name",
                phone: "1234567890",
                address: "123 Main St",
                password: "hashed",
            };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

            await updateProfileController(req, res);

            expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                expect.objectContaining({
                    name: "Original Name",
                    phone: "1234567890",
                    address: "123 Main St",
                }),
                { new: true },
            );
        });

        // Wei Sheng, A0259272X
        it("should fall back to existing value when a field is an empty string", async () => {
            req.body = { name: "" };
            const mockUser = {
                _id: "user123",
                name: "Original Name",
                password: "hashed",
            };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

            await updateProfileController(req, res);

            expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                expect.objectContaining({ name: "Original Name" }),
                { new: true },
            );
        });

        // Wei Sheng, A0259272X
        it("should update multiple fields simultaneously", async () => {
            req.body = {
                name: "New Name",
                phone: "9999999999",
                address: "789 New Ave",
            };
            const mockUser = {
                _id: "user123",
                name: "Old",
                phone: "1111111111",
                address: "111 Old St",
                password: "hashed",
            };
            const updatedUser = {
                ...mockUser,
                name: "New Name",
                phone: "9999999999",
                address: "789 New Ave",
            };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

            await updateProfileController(req, res);

            expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                expect.objectContaining({
                    name: "New Name",
                    phone: "9999999999",
                    address: "789 New Ave",
                }),
                { new: true },
            );
        });
    });

    describe("Password updates", () => {
        // Wei Sheng, A0259272X
        it("should update password when provided and length >= 6 (hashes password)", async () => {
            req.body = { password: "newpass123" };
            const mockUser = { _id: "user123", password: "oldhashed" };
            const updatedUser = { ...mockUser, password: "newhashed" };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockHashPassword.mockResolvedValueOnce("newhashed");
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

            await updateProfileController(req, res);

            expect(mockHashPassword).toHaveBeenCalledWith("newpass123");
            expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                expect.objectContaining({ password: "newhashed" }),
                { new: true },
            );
        });

        // Wei Sheng, A0259272X
        it("should reject password shorter than 6 characters", async () => {
            req.body = { password: "ab" };

            await updateProfileController(req, res);

            expect(res.json).toHaveBeenCalledWith({
                error: "Password is required and 6 character long",
            });
            expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
        });

        // Wei Sheng, A0259272X
        it("should reject password with exactly 5 characters (boundary)", async () => {
            req.body = { password: "12345" };

            await updateProfileController(req, res);

            expect(res.json).toHaveBeenCalledWith({
                error: "Password is required and 6 character long",
            });
            expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
        });

        // Wei Sheng, A0259272X
        it("should accept password with exactly 6 characters", async () => {
            req.body = { password: "123456" };
            const mockUser = { _id: "user123", password: "oldhashed" };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockHashPassword.mockResolvedValueOnce("newhashed");
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

            await updateProfileController(req, res);

            expect(mockHashPassword).toHaveBeenCalledWith("123456");
        });

        // Wei Sheng, A0259272X
        it("should keep existing password when no new password is provided", async () => {
            req.body = { name: "New Name" };
            const mockUser = {
                _id: "user123",
                name: "Old",
                password: "existinghashed",
            };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

            await updateProfileController(req, res);

            expect(mockHashPassword).not.toHaveBeenCalled();
            expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                expect.objectContaining({ password: "existinghashed" }),
                { new: true },
            );
        });
    });

    describe("Response handling", () => {
        // Wei Sheng, A0259272X
        it("should return 200 status on success", async () => {
            req.body = { name: "Updated Name" };
            const mockUser = { _id: "user123", name: "Old Name", password: "hashed" };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

            await updateProfileController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        // Wei Sheng, A0259272X
        it("should return correct response structure: { success: true, message, updatedUser }", async () => {
            req.body = { name: "Updated Name" };
            const mockUser = { _id: "user123", name: "Old Name", password: "hashed" };
            const updatedUser = { ...mockUser, name: "Updated Name" };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

            await updateProfileController(req, res);

            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Profile Updated Successfully",
                updatedUser,
            });
        });

        // note this: this is not a bug, it is a feature.
        // Wei Sheng, A0259272X
        it("should not update email even when provided in request body", async () => {
            req.body = { name: "Updated Name", email: "newemail@example.com" };
            const mockUser = {
                _id: "user123",
                name: "Old Name",
                email: "original@example.com",
                password: "hashed",
            };
            const updatedUser = { ...mockUser, name: "Updated Name" };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

            await updateProfileController(req, res);

            expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
                expect.anything(),
                expect.not.objectContaining({ email: expect.anything() }),
                expect.anything(),
            );
        });
    });

    describe("Error handling", () => {
        // Wei Sheng, A0259272X
        it("should handle database errors and return 400 status", async () => {
            req.body = { name: "Updated Name" };
            mockUserFindById.mockRejectedValueOnce(new Error("Database error"));

            await updateProfileController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Updating Profile",
                error: expect.any(Error),
            });
        });

        // Wei Sheng, A0259272X
        it("should handle findByIdAndUpdate errors", async () => {
            req.body = { name: "Updated Name" };
            const mockUser = { _id: "user123", name: "Old", password: "hashed" };

            mockUserFindById.mockResolvedValueOnce(mockUser);
            mockUserFindByIdAndUpdate.mockRejectedValueOnce(
                new Error("Update failed"),
            );

            await updateProfileController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        // Wei Sheng, A0259272X
        it("should return 400 when user is not found (findById returns null)", async () => {
            req.body = { name: "Updated Name" };
            mockUserFindById.mockResolvedValueOnce(null);

            await updateProfileController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Updating Profile",
                error: expect.any(Error),
            });
        });
    });
});

// Wei Sheng, A0259272X
describe("getOrdersController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { _id: "user123" },
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe("Query and population", () => {
        // Wei Sheng, A0259272X
        it("should filter orders by buyer: req.user._id", async () => {
            const mockOrders = [{ _id: "order1", buyer: "user123", products: [] }];
            const populateMock2 = jest.fn().mockResolvedValue(mockOrders);
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getOrdersController(req, res);

            expect(mockOrderFind).toHaveBeenCalledWith({ buyer: "user123" });
        });

        // Wei Sheng, A0259272X
        it("should populate products field (excluding photo)", async () => {
            const mockOrders = [{ _id: "order1", buyer: "user123", products: [] }];
            const populateMock2 = jest.fn().mockResolvedValue(mockOrders);
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getOrdersController(req, res);

            expect(populateMock1).toHaveBeenCalledWith("products", "-photo");
        });

        // Wei Sheng, A0259272X
        it("should populate buyer field with name only", async () => {
            const mockOrders = [
                { _id: "order1", buyer: { name: "John Doe" }, products: [] },
            ];
            const populateMock2 = jest.fn().mockResolvedValue(mockOrders);
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getOrdersController(req, res);

            expect(populateMock2).toHaveBeenCalledWith("buyer", "name");
        });
    });

    describe("Response handling", () => {
        // Wei Sheng, A0259272X
        it("should return orders as JSON array", async () => {
            const mockOrders = [
                { _id: "order1", buyer: "user123", products: [] },
                { _id: "order2", buyer: "user123", products: [] },
            ];
            const populateMock2 = jest.fn().mockResolvedValue(mockOrders);
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getOrdersController(req, res);

            expect(res.json).toHaveBeenCalledWith(mockOrders);
        });

        // Wei Sheng, A0259272X
        it("should handle user with no orders (returns empty array)", async () => {
            const populateMock2 = jest.fn().mockResolvedValue([]);
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getOrdersController(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });
    });

    describe("Error handling", () => {
        // Wei Sheng, A0259272X
        it("should handle database errors and return 500 status", async () => {
            const populateMock2 = jest
                .fn()
                .mockRejectedValue(new Error("Database error"));
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getOrdersController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Getting Orders",
                error: expect.any(Error),
            });
        });
    });
});

// Wei Sheng, A0259272X
describe("getAllOrdersController", () => {
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe("Query and population", () => {
        // Wei Sheng, A0259272X
        it("should return all orders (no buyer filter)", async () => {
            const mockOrders = [
                { _id: "order1", buyer: "user1", products: [] },
                { _id: "order2", buyer: "user2", products: [] },
            ];
            const sortMock = jest.fn().mockResolvedValue(mockOrders);
            const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getAllOrdersController(req, res);

            expect(mockOrderFind).toHaveBeenCalledWith({});
        });

        // Wei Sheng, A0259272X
        it('should sort orders by createdAt: "-1" (newest first)', async () => {
            const mockOrders = [{ _id: "order1", buyer: "user1", products: [] }];
            const sortMock = jest.fn().mockResolvedValue(mockOrders);
            const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getAllOrdersController(req, res);

            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
        });

        // Wei Sheng, A0259272X
        it("should populate products field (excluding photo)", async () => {
            const mockOrders = [{ _id: "order1", buyer: "user1", products: [] }];
            const sortMock = jest.fn().mockResolvedValue(mockOrders);
            const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getAllOrdersController(req, res);

            expect(populateMock1).toHaveBeenCalledWith("products", "-photo");
        });

        // Wei Sheng, A0259272X
        it("should populate buyer field with name", async () => {
            const mockOrders = [
                { _id: "order1", buyer: { name: "John Doe" }, products: [] },
            ];
            const sortMock = jest.fn().mockResolvedValue(mockOrders);
            const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getAllOrdersController(req, res);

            expect(populateMock2).toHaveBeenCalledWith("buyer", "name");
        });
    });

    describe("Response handling", () => {
        // Wei Sheng, A0259272X
        it("should return orders as JSON", async () => {
            const mockOrders = [{ _id: "order1" }, { _id: "order2" }];
            const sortMock = jest.fn().mockResolvedValue(mockOrders);
            const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getAllOrdersController(req, res);

            expect(res.json).toHaveBeenCalledWith(mockOrders);
        });

        // Wei Sheng, A0259272X
        it("should return empty array when no orders exist", async () => {
            const sortMock = jest.fn().mockResolvedValue([]);
            const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getAllOrdersController(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });
    });

    describe("Error handling", () => {
        // Wei Sheng, A0259272X
        it("should handle database errors and return 500 status", async () => {
            const sortMock = jest.fn().mockRejectedValue(new Error("Database error"));
            const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
            const populateMock1 = jest
                .fn()
                .mockReturnValue({ populate: populateMock2 });

            mockOrderFind.mockReturnValue({ populate: populateMock1 });

            await getAllOrdersController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Getting Orders",
                error: expect.any(Error),
            });
        });
    });
});

// Wei Sheng, A0259272X
describe("orderStatusController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { orderId: "order123" },
            body: { status: "Processing" },
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe("Order update", () => {
        // Wei Sheng, A0259272X
        it("should update order by ID from req.params.orderId", async () => {
            const updatedOrder = { _id: "order123", status: "Processing" };
            mockOrderFindByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

            await orderStatusController(req, res);

            expect(mockOrderFindByIdAndUpdate).toHaveBeenCalledWith(
                "order123",
                { status: "Processing" },
                { new: true },
            );
        });

        // Wei Sheng, A0259272X
        it("should update status from req.body.status", async () => {
            req.body.status = "Shipped";
            const updatedOrder = { _id: "order123", status: "Shipped" };
            mockOrderFindByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

            await orderStatusController(req, res);

            expect(mockOrderFindByIdAndUpdate).toHaveBeenCalledWith(
                "order123",
                { status: "Shipped" },
                { new: true },
            );
        });

        // Wei Sheng, A0259272X
        it("should return updated order as JSON response", async () => {
            const updatedOrder = { _id: "order123", status: "Processing" };
            mockOrderFindByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

            await orderStatusController(req, res);

            expect(res.json).toHaveBeenCalledWith(updatedOrder);
        });
    });

    describe("Edge cases", () => {
        // Wei Sheng, A0259272X
        it("should handle order not found (returns null)", async () => {
            mockOrderFindByIdAndUpdate.mockResolvedValueOnce(null);

            await orderStatusController(req, res);

            expect(res.json).toHaveBeenCalledWith(null);
        });

        // Wei Sheng, A0259272X
        it("should pass status value to database unchanged", async () => {
            req.body.status = "InvalidStatus";
            mockOrderFindByIdAndUpdate.mockResolvedValueOnce(null);

            await orderStatusController(req, res);

            expect(mockOrderFindByIdAndUpdate).toHaveBeenCalledWith(
                "order123",
                { status: "InvalidStatus" },
                { new: true },
            );
        });
    });

    describe("Error handling", () => {
        // Wei Sheng, A0259272X
        it("should handle database errors and return 500 status", async () => {
            mockOrderFindByIdAndUpdate.mockRejectedValueOnce(
                new Error("Database error"),
            );

            await orderStatusController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Updating Order",
                error: expect.any(Error),
            });
        });
    });
});

describe("authController Management Tests", () => {
    let req, res, consoleSpy;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });



    describe("getAllUsersController", () => {
        beforeEach(() => {
            req = {};
        });

        describe("Success path", () => {
            //LOU,YING-WEN A0338250J
            it("should get all users successfully and exclude password", async () => {
                const mockUsers = [
                    { _id: "1", name: "User 1", email: "u1@test.com" },
                    { _id: "2", name: "User 2", email: "u2@test.com" },
                ];
                const selectMock = jest.fn().mockResolvedValue(mockUsers);
                mockUserFind.mockReturnValue({ select: selectMock });

                await getAllUsersController(req, res);

                expect(mockUserFind).toHaveBeenCalledWith({});
                expect(selectMock).toHaveBeenCalledWith("-password");
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "All Users List",
                    users: mockUsers,
                });
            });
        });

        describe("Error handling", () => {
            //LOU,YING-WEN A0338250J
            it("should return 500 when database error occurs during fetch", async () => {
                const dbError = new Error("Fetch Failed");

                mockUserFind.mockImplementation(() => {
                    throw dbError;
                });
                await getAllUsersController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: "Error while getting all users",
                    }),
                );
                expect(consoleSpy).toHaveBeenCalledWith(dbError);
            });
        });
    });
});

// Priyansh Bimbisariye, A0265903B
describe("testController", () => {
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    it('should send "Protected Routes" on success', () => {
        testController(req, res);

        expect(res.send).toHaveBeenCalledTimes(1);
        expect(res.send).toHaveBeenCalledWith("Protected Routes");
    });

    // Priyansh Bimbisariye, A0265903B
    it("should propagate the error if res.send throws", () => {
        const error = new Error("send failed");
        res.send.mockImplementation(() => {
            throw error;
        });

        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        expect(() => testController(req, res)).toThrow("send failed");
        expect(consoleSpy).toHaveBeenCalledWith(error);
        consoleSpy.mockRestore();
    });
});

// Priyansh Bimbisariye, A0265903B
describe("loginController", () => {
    let req, res;

    const mockUser = {
        _id: "user_001",
        name: "John Snow",
        email: "john@example.com",
        phone: "91234567",
        address: "123 Street",
        role: 0,
        password: "hashedPassword123",
    };

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        process.env.JWT_SECRET = "test-secret";
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    // ep partition- missing required field (email) should reject with 404
    it("should return 404 when email is not provided", async () => {
        // arrange
        req.body = { password: "password123" };

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Invalid email or password",
            }),
        );
    });

    // Priyansh Bimbisariye, A0265903B
    // ep partition- missing required field (password) should reject with 404
    it("should return 404 when password is not provided", async () => {
        // arrange
        req.body = { email: "john@example.com" };

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Invalid email or password",
            }),
        );
    });

    // Priyansh Bimbisariye, A0265903B
    // ep partition - non-existent user, email not registered
    it("should return 404 when user is not found", async () => {
        // arrange
        req.body = {
            email: "iqhdqhdlqwhljk@example.com",
            password: "lqdhiqwudhoi2i27",
        };
        mockUserFindOne.mockResolvedValue(null); // db returns no user

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Email is not registered",
            }),
        );
    });

    // Priyansh Bimbisariye, A0265903B
    // ep partition - wrong credential
    // password does not match
    it("should return 200 with success false when password is incorrect", async () => {
        // arrange
        req.body = { email: "john@example.com", password: "wrongpassword" };
        mockUserFindOne.mockResolvedValue(mockUser);
        mockComparePassword.mockResolvedValue(false);

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Invalid Password",
            }),
        );
    });

    // Priyansh Bimbisariye, A0265903B
    // ep partition - valid partition
    // successful login returns user info and token
    it("should return 200 with user and token on successful login", async () => {
        // arrange
        req.body = { email: "john@example.com", password: "correctpassword" };
        mockUserFindOne.mockResolvedValue(mockUser); // user exists
        mockComparePassword.mockResolvedValue(true); // passwrod matches
        mockJwtSign.mockResolvedValue("mocked-jwt-token"); // token generated

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "login successfully",
                token: "mocked-jwt-token",
                user: {
                    _id: mockUser._id,
                    name: mockUser.name,
                    email: mockUser.email,
                    phone: mockUser.phone,
                    address: mockUser.address,
                    role: mockUser.role,
                },
            }),
        );
    });

    // Priyansh Bimbisariye, A0265903B
    // system should fail gracefully, not crash
    // cft - exception path
    it("should return 500 when a database error occurs", async () => {
        // arrange
        req.body = { email: "john@example.com", password: "password123" };
        mockUserFindOne.mockRejectedValue(new Error("DB connection lost"));
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error in login",
            }),
        );
        consoleSpy.mockRestore();
    });
});

// Priyansh Bimbisariye, A0265903B
describe("registerController", () => {
    let req, res;

    const validBody = {
        name: "Jane Snow",
        email: "jane@example.com",
        password: "securePass123",
        phone: "91234568",
        address: "Kent Ridge",
        answer: "mango",
    };

    beforeEach(() => {
        req = { body: { ...validBody } };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (name)
    // expected: 'message' key so frontend can catch it
    it("should return message when name is not provided", async () => {
        // arrange
        req.body = { ...validBody, name: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: "Name is Required" });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (email)
    it("should return message when email is not provided", async () => {
        // arrange
        req.body = { ...validBody, email: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: "Email is Required" });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (password)
    it("should return message when password is not provided", async () => {
        // arrange
        req.body = { ...validBody, password: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: "Password is Required" });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (phone)
    it("should return message when phone is not provided", async () => {
        // arrange
        req.body = { ...validBody, phone: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: "Phone no is Required" });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (address)
    it("should return message when address is not provided", async () => {
        // arrange
        req.body = { ...validBody, address: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: "Address is Required" });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (answer)
    it("should return message when answer is not provided", async () => {
        // arrange
        req.body = { ...validBody, answer: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: "Answer is Required" });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - duplicate user partition
    it("should return 200 with success false when user already exists", async () => {
        // arrange
        mockUserFindOne.mockResolvedValue({ _id: "existing_user" });

        // act
        await registerController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Already Register please login",
            }),
        );
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - valid partition (happy path)
    // verifies 201 status, success flag, and user object in response
    it("should register user successfully and return 201", async () => {
        // arrange
        const savedUser = {
            ...validBody,
            _id: "new_user_001",
            password: "hashedPass",
        };
        mockUserFindOne.mockResolvedValue(null);
        mockHashPassword.mockResolvedValue("hashedPass");
        mockSave.mockResolvedValue(savedUser);

        // act
        await registerController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "User Registered Successfully",
                user: savedUser,
            }),
        );
    });

    // Priyansh Bimbisariye, A0265903B
    // resilience - database error on save
    // cft - exception path
    it("should return 500 when a database error occurs during save", async () => {
        // arrange
        mockUserFindOne.mockResolvedValue(null);
        mockHashPassword.mockResolvedValue("hashedPass");
        mockSave.mockRejectedValue(new Error("DB write failed"));
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        // act
        await registerController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error in Registration",
            }),
        );
        consoleSpy.mockRestore();
    });

    // Priyansh Bimbisariye, A0265903B
    // bva - zero input boundary
    // empty body should trigger first validation guard
    it("should return message when body is empty", async () => {
        // arrange
        req.body = {};

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: "Name is Required" });
    });
});

// Priyansh Bimbisariye, A0265903B
describe("forgotPasswordController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                email: "jane@example.com",
                answer: "random_answer",
                newPassword: "newSecurePass123",
            },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - invalid partition (missing email)
    it("should return 400 when email is missing", async () => {
        // arrange
        delete req.body.email;

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Email is required" });
        expect(res.send).toHaveBeenCalledTimes(1);
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - invalid partition (missing answer)
    it("should return 400 when answer is missing", async () => {
        // arrange
        delete req.body.answer;

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "answer is required" });
        expect(res.send).toHaveBeenCalledTimes(1);
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - invalid partition (missing newPassword)
    it("should return 400 when newPassword is missing", async () => {
        // arrange
        delete req.body.newPassword;

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            message: "New Password is required",
        });
        expect(res.send).toHaveBeenCalledTimes(1);
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - non-existent user partition
    // mock findOne to return null
    it("should return 404 when email or answer is incorrect", async () => {
        // arrange
        mockUserFindOne.mockResolvedValue(null);

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Wrong Email Or Answer",
            }),
        );
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - valid partition (successful reset)
    // mocks user found, hash success, update success
    // state-based verification
    it("should reset password successfully and return 200", async () => {
        // arrange
        const mockUser = { _id: "user_123", email: "jane@example.com" };
        mockUserFindOne.mockResolvedValue(mockUser);
        mockHashPassword.mockResolvedValue("hashedNewPass");
        mockUserFindByIdAndUpdate.mockResolvedValue({});

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(mockUserFindOne).toHaveBeenCalledWith({
            email: "jane@example.com",
            answer: "random_answer",
        });
        expect(mockHashPassword).toHaveBeenCalledWith("newSecurePass123");
        expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith("user_123", {
            password: "hashedNewPass",
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Password Reset Successfully",
            }),
        );
    });

    // Priyansh Bimbisariye, A0265903B
    // resilience - database error / exception path
    it("should return 500 when something goes wrong", async () => {
        // arrange
        mockUserFindOne.mockRejectedValue(new Error("DB Error"));
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Something went wrong",
            }),
        );
        consoleSpy.mockRestore();
    });
});
