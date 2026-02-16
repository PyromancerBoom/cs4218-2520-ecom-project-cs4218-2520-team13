import { jest, describe, it, expect, beforeEach } from '@jest/globals';

await jest.unstable_mockModule('mongoose', () => ({
    default: {
        Schema: jest.fn(),
        model: jest.fn(),
        ObjectId: jest.fn()
    },
    Schema: jest.fn(),
    model: jest.fn()
}));

const mockCategoryFind = jest.fn();
const mockCategoryFindOne = jest.fn();

await jest.unstable_mockModule('../models/categoryModel.js', () => ({
    default: {
        find: mockCategoryFind,
        findOne: mockCategoryFindOne
    }
}));

const { categoryControlller, singleCategoryController } = await import('./categoryController.js');

describe('categoryControlller', () => {
    let req, res;

    beforeEach(() => {
        req = { params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe('Success path', () => {
        it('should return all categories successfully', async () => {
            const mockCategories = [
                { name: "Tech", slug: "tech" },
                { name: "Food", slug: "food" }
            ];
            mockCategoryFind.mockResolvedValue(mockCategories);

            await categoryControlller(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "All Categories List",
                category: mockCategories,
            });
        });
    });

    describe('Error handling', () => {
        it('should handle errors and return 500 status', async () => {
            const mockError = new Error("Database error");
            mockCategoryFind.mockRejectedValue(mockError);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            await categoryControlller(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: mockError,
                message: "Error while getting all categories",
            });

            consoleSpy.mockRestore();
        });
    });
});

describe('singleCategoryController', () => {
    let req, res;

    beforeEach(() => {
        req = { params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe('Success path', () => {
        it('should return a single category successfully', async () => {
            const mockCategory = { name: "Tech", slug: "tech" };
            req.params.slug = "tech";
            mockCategoryFindOne.mockResolvedValue(mockCategory);

            await singleCategoryController(req, res);

            expect(mockCategoryFindOne).toHaveBeenCalledWith({ slug: "tech" });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Get Single Category Successfully",
                category: mockCategory,
            });
        });
    });

    describe('Error handling', () => {
        it('should handle errors in singleCategoryController', async () => {
            const mockError = new Error("Not found");
            req.params.slug = "invalid";
            mockCategoryFindOne.mockRejectedValue(mockError);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: mockError,
                message: "Error While getting Single Category",
            });

            consoleSpy.mockRestore();
        });
    });
});