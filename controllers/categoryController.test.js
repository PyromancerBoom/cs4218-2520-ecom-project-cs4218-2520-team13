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

const mockCategoryFind = jest.fn();
const mockCategoryFindOne = jest.fn();

jest.mock('../models/categoryModel.js', () => ({
    find: mockCategoryFind,
    findOne: mockCategoryFindOne
}));

const { categoryControlller, singleCategoryController } = require('./categoryController.js');

//LOU,YING-WEN A0338250J
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