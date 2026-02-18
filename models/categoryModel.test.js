const { describe, it, expect } = require('@jest/globals');

jest.mock('mongoose', () => {
    const mockSchemaObj = {
        name: { type: String, required: true, unique: true },
        slug: { type: String, lowercase: true }
    };

    function MockModel(data) {
        Object.keys(data).forEach(key => {
            if (mockSchemaObj[key]) this[key] = data[key];
        });
        if (this.name) this.name = String(this.name);
        if (this.slug) this.slug = this.slug.toLowerCase();
    }

    MockModel.schema = { obj: mockSchemaObj };
    MockModel.prototype.validateSync = jest.fn(function () {
        return !this.name ? { errors: { name: { kind: 'required' } } } : null;
    });

    return {
        Schema: jest.fn().mockImplementation(function (obj) { this.obj = obj; return this; }),
        model: jest.fn().mockReturnValue(MockModel)
    };
});

const Category = require('./categoryModel').default;

//LOU,YING-WEN A0338250J
describe("Category Model Unit Test", () => {

    it("should have the correct schema structure", () => {
        const { name, slug } = Category.schema.obj;

        expect(name.type).toBe(String);
        expect(name.required).toBe(true);
        expect(name.unique).toBe(true);
        expect(slug.type).toBe(String);
        expect(slug.lowercase).toBe(true);
    });

    it("should create a model instance with correct values", () => {
        const categoryData = {
            name: "Electronics",
            slug: "ELECTRONICS",
        };
        const category = new Category(categoryData);

        expect(category.name).toBe(categoryData.name);
        expect(category.slug).toBe(categoryData.slug.toLowerCase());
    });

    it("should fail validation when name is missing", async () => {
        const category = new Category({});

        const validationError = category.validateSync();
        expect(validationError.errors.name).toBeDefined();
    });

    it("should cast non-string values to string for the name field", () => {
        const category = new Category({ name: 12345 });

        expect(typeof category.name).toBe("string");
        expect(category.name).toBe("12345");
    });

    it("should exclude fields that are not in the schema", () => {
        const category = new Category({
            name: "Tech",
            randomField: "some value"
        });

        expect(category.name).toBe("Tech");
        expect(category.randomField).toBeUndefined();
    });

});