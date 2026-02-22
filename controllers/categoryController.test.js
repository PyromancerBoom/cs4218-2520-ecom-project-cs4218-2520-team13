const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('mongoose', () => ({
    Schema: jest.fn(),
    model: jest.fn(),
    default: {
        Schema: jest.fn(),
        model: jest.fn(),
        ObjectId: jest.fn()
    },
    ObjectId: jest.fn()
}));

const mockCategorySave = jest.fn();
const mockCategoryFind = jest.fn();
const mockCategoryFindOne = jest.fn();

// Priyansh Bimbisariye, A0265903B
jest.mock('../models/categoryModel.js', () => {
    const mockModel = function (data) {
        this.name = data.name;
        this.slug = data.slug;
        this.save = mockCategorySave;
    };
    mockModel.find = mockCategoryFind;
    mockModel.findOne = mockCategoryFindOne;
    return mockModel;
});

jest.mock('slugify', () => jest.fn((name) => `mocked-slug-${name}`));
const slugify = require('slugify');

//LOU,YING-WEN A0338250J
const { createCategoryController, categoryControlller, singleCategoryController } = require('./categoryController.js');

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
        //LOU,YING-WEN A0338250J
        it('should return all categories successfully', async () => {
            const mockCategories = [{ name: "Tech", slug: "tech" }];
            mockCategoryFind.mockResolvedValue(mockCategories);

            await categoryControlller(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "All Categories List",
                category: mockCategories,
            });
        });

        //LOU,YING-WEN A0338250J
        it('should return 200 and an empty array when no categories exist', async () => {
            mockCategoryFind.mockResolvedValue([]);
            await categoryControlller(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                category: []
            }));
        });
    });

    describe('Error handling', () => {

        //LOU,YING-WEN A0338250J
        it('should handle errors and return 500 status', async () => {
            const mockError = new Error("Database error");
            mockCategoryFind.mockRejectedValue(mockError);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            await categoryControlller(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: "Error while getting all categories"
            }));
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
            consoleSpy.mockRestore();
        });
    });
});

//LOU,YING-WEN A0338250J
describe('singleCategoryController', () => {
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

        //LOU,YING-WEN A0338250J
        it('should return a single category successfully', async () => {
            const mockCategory = { name: "Tech", slug: "tech" };
            req.params.slug = "tech";
            mockCategoryFindOne.mockResolvedValue(mockCategory);

            await singleCategoryController(req, res);

            expect(mockCategoryFindOne).toHaveBeenCalledWith({ slug: "tech" });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                category: mockCategory
            }));
        });

        //LOU,YING-WEN A0338250J
        it('should return 200 and null if the category slug does not exist', async () => {
            req.params.slug = "non-existent";
            mockCategoryFindOne.mockResolvedValue(null);

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                category: null
            }));
        });
    });

    describe('Error handling', () => {

        //LOU,YING-WEN A0338250J
        it('should handle errors in singleCategoryController and return 500', async () => {
            const mockError = new Error("Database error");
            req.params.slug = "tech";
            mockCategoryFindOne.mockRejectedValue(mockError);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Error While getting Single Category");
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
            consoleSpy.mockRestore();
        });
    });
});