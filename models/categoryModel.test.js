const { describe, it, expect } = require('@jest/globals');
const Category = require('./categoryModel').default;

//LOU,YING-WEN A0338250J
describe("Category Model Unit Test", () => {

    it("should have the correct schema structure", () => {
        const { name, slug } = Category.schema.obj;

        expect(name.type).toBe(String);
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

    it("should create an instance even when fields are missing", () => {
        const category = new Category({});

        expect(category.name).toBeUndefined();
        expect(category.slug).toBeUndefined();
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