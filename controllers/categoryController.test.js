const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('mongoose', () => ({
    Schema: jest.fn(),
    model: jest.fn(),
    default: {
        Schema: jest.fn(),
        model: jest.fn(),
        ObjectId: jest.fn()
    },
    ObjectId: jest.fn(),
    Types: {
        ObjectId: {
            isValid: jest.fn((id) => {
                // mock implementation for ObjectId validation
                if (!id || id === '' || id === null || id === undefined) {
                    return false;
                }
                //24 hex characters (valid MongoDB ObjectId format)
                return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
            })
        }
    }
}));

const mockCategorySave = jest.fn();
const mockCategoryFind = jest.fn();
const mockCategoryFindOne = jest.fn();
const mockCategoryFindByIdAndDelete = jest.fn();
const mockCategoryFindByIdAndUpdate = jest.fn();

// Priyansh Bimbisariye, A0265903B
jest.mock('../models/categoryModel.js', () => {
    const mockModel = function (data) {
        this.name = data.name;
        this.slug = data.slug;
        this.save = mockCategorySave;
    };
    mockModel.find = mockCategoryFind;
    mockModel.findOne = mockCategoryFindOne;
    mockModel.findByIdAndDelete = mockCategoryFindByIdAndDelete;
    mockModel.findByIdAndUpdate = mockCategoryFindByIdAndUpdate;
    return mockModel;
});

jest.mock('slugify', () => jest.fn((name) => `mocked-slug-${name}`));
const slugify = require('slugify');

const { createCategoryController, categoryControlller, singleCategoryController, deleteCategoryController, updateCategoryController } = require('./categoryController.js');

// Priyansh Bimbisariye, A0265903B
describe('createCategoryController', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockImplementation((data) => {
                res.body = data;
                return res;
            }),
        };
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When validating the request payload (name property)', () => {
        // using bva
        // Priyansh Bimbisariye, A0265903B
        it('should return 401 when request body is completely empty', async () => {
            // arrange
            req.body = {};

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.body).toEqual({ message: "Name is required" });
            expect(mockCategoryFindOne).not.toHaveBeenCalled();
            expect(mockCategorySave).not.toHaveBeenCalled();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should return 401 when name is null', async () => {
            // arrange
            req.body = { name: null };

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.body).toEqual({ message: "Name is required" });
            expect(mockCategoryFindOne).not.toHaveBeenCalled();
            expect(mockCategorySave).not.toHaveBeenCalled();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should return 401 when name is undefined', async () => {
            // arrange
            req.body = { name: undefined };

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.body).toEqual({ message: "Name is required" });
            expect(mockCategoryFindOne).not.toHaveBeenCalled();
            expect(mockCategorySave).not.toHaveBeenCalled();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should return 401 when name is empty string', async () => {
            // arrange
            req.body = { name: "" };

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.body).toEqual({ message: "Name is required" });
            expect(mockCategoryFindOne).not.toHaveBeenCalled();
            expect(mockCategorySave).not.toHaveBeenCalled();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should reject whitespace-only name', async () => {
            // arrange
            req.body = { name: "   " };

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.body).toEqual({ message: "Name is required" });
            expect(mockCategoryFindOne).not.toHaveBeenCalled();
            expect(mockCategorySave).not.toHaveBeenCalled();
        });

        // Priyansh Bimbisariye, A0265903B
        // resilience check
        it('should handle numeric input without crashing', async () => {
            // test if system crashes when unexpected data types are passed
            // arrange
            req.body = { name: 123 };
            mockCategoryFindOne.mockResolvedValue(null);
            const mockSavedCategory = { name: 123, slug: "mocked-slug-123" };
            mockCategorySave.mockResolvedValue(mockSavedCategory);

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "new category created",
                category: mockSavedCategory,
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When processing a valid category creation request', () => {
        // ep and state-based here
        // Priyansh Bimbisariye, A0265903B
        it('should return 200 and not save when category already exists', async () => {
            // arrange
            req.body = { name: "ExistingCategory" };
            mockCategoryFindOne.mockResolvedValue({ name: "ExistingCategory" });

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.body).toEqual({
                success: true,
                message: "Category Already Exists",
            });
            expect(mockCategoryFindOne).toHaveBeenCalledWith({ name: "ExistingCategory" });
            expect(mockCategorySave).not.toHaveBeenCalled();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should return 201 and save new category successfully', async () => {
            // arrange
            req.body = { name: "NewCategory" };
            mockCategoryFindOne.mockResolvedValue(null);
            const mockSavedCategory = { name: "NewCategory", slug: "mocked-slug-NewCategory" };
            mockCategorySave.mockResolvedValue(mockSavedCategory);

            // act
            await createCategoryController(req, res);

            // assert
            expect(mockCategoryFindOne).toHaveBeenCalledWith({ name: "NewCategory" });
            expect(slugify).toHaveBeenCalledWith("NewCategory");
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.body).toEqual({
                success: true,
                message: "new category created",
                category: mockSavedCategory,
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When database operations fail unexpectedly', () => {
        // relisience and error handling

        // Priyansh Bimbisariye, A0265903B
        it('should handle database exception during findOne and return 500', async () => {
            // arrange
            req.body = { name: "TestError" };
            const mockError = new Error("Database find connection dropped");
            mockCategoryFindOne.mockRejectedValue(mockError);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            // act
            await createCategoryController(req, res);

            // assert
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Error in Category");
            expect(res.body).toHaveProperty("error");

            consoleSpy.mockRestore();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle database exception during save and return 500', async () => {
            // arrange
            req.body = { name: "TestSaveError" };
            mockCategoryFindOne.mockResolvedValue(null);
            const mockSaveError = new Error("Database save failure");
            mockCategorySave.mockRejectedValue(mockSaveError);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            // act
            await createCategoryController(req, res);

            // assert
            expect(consoleSpy).toHaveBeenCalledWith(mockSaveError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Error in Category");
            expect(res.body).toHaveProperty("error");

            consoleSpy.mockRestore();
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When testing enhanced input validation', () => {
        // Priyansh Bimbisariye, A0265903B
        it('should return 401 when name is boolean false', async () => {
            // arrange
            req.body = { name: false };

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.body).toEqual({ message: "Name is required" });
            expect(mockCategoryFindOne).not.toHaveBeenCalled();
            expect(mockCategorySave).not.toHaveBeenCalled();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle boolean true without crashing', async () => {
            //  if controller handles non-string types gracefully
            // arrange
            req.body = { name: true };
            mockCategoryFindOne.mockResolvedValue(null);
            const mockSavedCategory = { name: true, slug: "mocked-slug-true" };
            mockCategorySave.mockResolvedValue(mockSavedCategory);

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockCategoryFindOne).toHaveBeenCalledWith({ name: true });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle object input without crashing', async () => {
            //  if controller handles non-string object types gracefully
            // arrange
            req.body = { name: { nested: "value" } };
            mockCategoryFindOne.mockResolvedValue(null);
            const mockSavedCategory = { name: { nested: "value" }, slug: "mocked-slug-[object Object]" };
            mockCategorySave.mockResolvedValue(mockSavedCategory);

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockCategoryFindOne).toHaveBeenCalledWith({ name: { nested: "value" } });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle array input without crashing', async () => {
            //  if controller handles non-string array types gracefully
            // arrange
            req.body = { name: ["Electronics"] };
            mockCategoryFindOne.mockResolvedValue(null);
            const mockSavedCategory = { name: ["Electronics"], slug: "mocked-slug-Electronics" };
            mockCategorySave.mockResolvedValue(mockSavedCategory);

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockCategoryFindOne).toHaveBeenCalledWith({ name: ["Electronics"] });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle extremely long string without crashing', async () => {
            // dos attacks prevention
            // arrange
            const longName = "A".repeat(5000);
            req.body = { name: longName };
            mockCategoryFindOne.mockResolvedValue(null);
            const mockSavedCategory = { name: longName, slug: `mocked-slug-${longName}` };
            mockCategorySave.mockResolvedValue(mockSavedCategory);

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockCategoryFindOne).toHaveBeenCalledWith({ name: longName });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When testing valid input variations', () => {
        // Priyansh Bimbisariye, A0265903B
        it('should handle special characters in name', async () => {
            // partition - special chars in name
            // arrange
            req.body = { name: "Tech and Gadgets!" };
            mockCategoryFindOne.mockResolvedValue(null);
            const mockSavedCategory = { name: "Tech and Gadgets!", slug: "mocked-slug-Tech and Gadgets!" };
            mockCategorySave.mockResolvedValue(mockSavedCategory);

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(slugify).toHaveBeenCalledWith("Tech and Gadgets!");
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "new category created",
                category: mockSavedCategory,
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When testing error handling edge cases', () => {
        // Priyansh Bimbisariye, A0265903B
        it('should handle findOne returning undefined', async () => {
            // bva - undefined vs null
            // arrange
            req.body = { name: "TestCategory" };
            mockCategoryFindOne.mockResolvedValue(undefined);
            const mockSavedCategory = { name: "TestCategory", slug: "mocked-slug-TestCategory" };
            mockCategorySave.mockResolvedValue(mockSavedCategory);

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "new category created",
                category: mockSavedCategory,
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle save returning null', async () => {
            // resilience - unexpected response
            // arrange
            req.body = { name: "TestCategory" };
            mockCategoryFindOne.mockResolvedValue(null);
            mockCategorySave.mockResolvedValue(null);

            // act
            await createCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "new category created",
                category: null,
            });
        });
    });
});

describe('categoryControlller', () => {
    let req, res;

    beforeEach(() => {
        req = { params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockImplementation((data) => {
                res.body = data;
                return res;
            }),
        };
        jest.clearAllMocks();
    });

    describe('Success path', () => {

    });

    describe('Error handling', () => {

    });
});


// Priyansh Bimbisariye, A0265903B
describe('deleteCategoryController', () => {
    let req, res;

    beforeEach(() => {
        req = { params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockImplementation((data) => {
                res.body = data;
                return res;
            }),
        };
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When validating input parameters', () => {
        // using bva for id parameter

        // Priyansh Bimbisariye, A0265903B
        it('should return 400 when id parameter is missing', async () => {
            // arrange
            req.params = {};

            // act
            await deleteCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.body).toEqual({
                success: false,
                message: "Category ID is required"
            });
            expect(mockCategoryFindByIdAndDelete).not.toHaveBeenCalled();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should return 400 when id is undefined', async () => {
            // arrange
            req.params = { id: undefined };

            // act
            await deleteCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.body).toEqual({
                success: false,
                message: "Category ID is required"
            });
            expect(mockCategoryFindByIdAndDelete).not.toHaveBeenCalled();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should return 400 when id is null', async () => {
            // arrange
            req.params = { id: null };

            // act
            await deleteCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.body).toEqual({
                success: false,
                message: "Invalid category ID"
            });
            expect(mockCategoryFindByIdAndDelete).not.toHaveBeenCalled();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should return 400 when id is empty string', async () => {
            // arrange
            req.params = { id: "" };

            // act
            await deleteCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.body).toEqual({
                success: false,
                message: "Invalid category ID"
            });
            expect(mockCategoryFindByIdAndDelete).not.toHaveBeenCalled();
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When validating id format', () => {
        // Priyansh Bimbisariye, A0265903B
        it('should return 400 for invalid ObjectId format', async () => {
            // arrange
            req.params = { id: "invalid-objectid-format" };

            // act
            await deleteCategoryController(req, res);

            // assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.body).toEqual({
                success: false,
                message: "Invalid category ID format"
            });
            expect(mockCategoryFindByIdAndDelete).not.toHaveBeenCalled();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should proceed with valid ObjectId format', async () => {
            // arrange
            const validId = "507f1f77bcf86cd799439011";
            req.params = { id: validId };
            const mockDeletedCategory = { _id: validId, name: "Electronics", slug: "electronics" };
            mockCategoryFindByIdAndDelete.mockResolvedValue(mockDeletedCategory);

            // act
            await deleteCategoryController(req, res);

            // assert
            expect(mockCategoryFindByIdAndDelete).toHaveBeenCalledWith(validId);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When processing delete request', () => {
        // ep and state-based

        // Priyansh Bimbisariye, A0265903B
        it('should return 200 and delete category successfully', async () => {
            // arrange
            const validId = "507f1f77bcf86cd799439011";
            req.params = { id: validId };
            const mockDeletedCategory = { _id: validId, name: "Electronics", slug: "electronics" };
            mockCategoryFindByIdAndDelete.mockResolvedValue(mockDeletedCategory);

            // act
            await deleteCategoryController(req, res);

            // assert
            expect(mockCategoryFindByIdAndDelete).toHaveBeenCalledWith(validId);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.body).toEqual({
                success: true,
                message: "Category Deleted Successfully"
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should return 404 when category does not exist', async () => {
            // arrange
            const validId = "507f1f77bcf86cd799439012";
            req.params = { id: validId };
            mockCategoryFindByIdAndDelete.mockResolvedValue(null);

            // act
            await deleteCategoryController(req, res);

            // assert
            expect(mockCategoryFindByIdAndDelete).toHaveBeenCalledWith(validId);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.body).toEqual({
                success: false,
                message: "Category not found"
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When database operations fail', () => {
        // resilience and error handling

        // Priyansh Bimbisariye, A0265903B
        it('should handle database error and return 500', async () => {
            // arrange
            const validId = "507f1f77bcf86cd799439013";
            req.params = { id: validId };
            const mockError = new Error("Database connection failed");
            mockCategoryFindByIdAndDelete.mockRejectedValue(mockError);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            // act
            await deleteCategoryController(req, res);

            // assert
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Error while deleting category");
            expect(res.body).toHaveProperty("error");

            consoleSpy.mockRestore();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle Mongoose CastError and return 500', async () => {
            // arrange
            const malformedId = "507f1f77bcf86cd799439014";
            req.params = { id: malformedId };
            const mockCastError = new Error("Cast to ObjectId failed");
            mockCastError.name = "CastError";
            mockCategoryFindByIdAndDelete.mockRejectedValue(mockCastError);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            // act
            await deleteCategoryController(req, res);

            // assert
            expect(consoleSpy).toHaveBeenCalledWith(mockCastError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Error while deleting category");
            expect(res.body).toHaveProperty("error");

            consoleSpy.mockRestore();
        });
    });
});

// Priyansh Bimbisariye, A0265903B
describe('updateCategoryController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockImplementation((data) => {
                res.body = data;
                return res;
            }),
        };
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When processing a valid update category request', () => {
        // ep and state-based

        // Priyansh Bimbisariye, A0265903B
        it('should return 200 and update category successfully', async () => {
            // arrange
            const validId = "507f1f77bcf86cd799439011";
            req.params = { id: validId };
            req.body = { name: "Updated Electronics" };
            const mockUpdatedCategory = { _id: validId, name: "Updated Electronics", slug: "mocked-slug-Updated Electronics" };
            mockCategoryFindByIdAndUpdate.mockResolvedValue(mockUpdatedCategory);

            // act
            await updateCategoryController(req, res);

            // assert
            expect(mockCategoryFindByIdAndUpdate).toHaveBeenCalledWith(
                validId,
                { name: "Updated Electronics", slug: "mocked-slug-Updated Electronics" },
                { new: true }
            );
            expect(slugify).toHaveBeenCalledWith("Updated Electronics");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.body).toEqual({
                success: true,
                message: "Category Updated Successfully",
                category: mockUpdatedCategory,
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should return 404 when updating non-existent category', async () => {
            // arrange
            const validId = "507f1f77bcf86cd799439012";
            req.params = { id: validId };
            req.body = { name: "NonExistent" };
            mockCategoryFindByIdAndUpdate.mockResolvedValue(null);

            // act
            await updateCategoryController(req, res);

            // assert
            expect(mockCategoryFindByIdAndUpdate).toHaveBeenCalledWith(
                validId,
                { name: "NonExistent", slug: "mocked-slug-NonExistent" },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.body).toEqual({
                success: false,
                message: "Category not found"
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle special characters in name correctly', async () => {
            // arrange
            const validId = "507f1f77bcf86cd799439011";
            req.params = { id: validId };
            req.body = { name: "Tech & Gadgets!" };
            const mockUpdatedCategory = { _id: validId, name: "Tech & Gadgets!", slug: "mocked-slug-Tech & Gadgets!" };
            mockCategoryFindByIdAndUpdate.mockResolvedValue(mockUpdatedCategory);

            // act
            await updateCategoryController(req, res);

            // assert
            expect(mockCategoryFindByIdAndUpdate).toHaveBeenCalledWith(
                validId,
                { name: "Tech & Gadgets!", slug: "mocked-slug-Tech & Gadgets!" },
                { new: true }
            );
            expect(slugify).toHaveBeenCalledWith("Tech & Gadgets!");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.body).toEqual({
                success: true,
                message: "Category Updated Successfully",
                category: mockUpdatedCategory,
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('When database operations fail', () => {
        // resilience and error handling

        // Priyansh Bimbisariye, A0265903B
        it('should handle database error and return 500', async () => {
            // arrange
            const validId = "507f1f77bcf86cd799439013";
            req.params = { id: validId };
            req.body = { name: "FailDB" };
            const mockError = new Error("Database update connection dropped");
            mockCategoryFindByIdAndUpdate.mockRejectedValue(mockError);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            // act
            await updateCategoryController(req, res);

            // assert
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Error while updating category");
            expect(res.body).toHaveProperty("error");

            consoleSpy.mockRestore();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle Mongoose CastError and return 500', async () => {
            // arrange
            const malformedId = "invalid-id";
            req.params = { id: malformedId };
            req.body = { name: "Update" };
            const mockCastError = new Error("Cast to ObjectId failed");
            mockCastError.name = "CastError";
            mockCategoryFindByIdAndUpdate.mockRejectedValue(mockCastError);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            // act
            await updateCategoryController(req, res);

            // assert
            expect(consoleSpy).toHaveBeenCalledWith(mockCastError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Error while updating category");
            expect(res.body).toHaveProperty("error");

            consoleSpy.mockRestore();
        });
    });
});