import mongoose from "mongoose";
import Category from "./categoryModel";

//LOU,YING-WEN A0338250J
describe("Category Model Unit Test", () => {

    test("should have the correct schema structure", () => {
        // Arrange & Act
        const { name, slug } = Category.schema.obj;

        // Assert
        expect(name.type).toBe(String);
        expect(slug.type).toBe(String);
        expect(slug.lowercase).toBe(true);
    });

    test("should create a model instance with correct values", () => {
        // Arrange & Act
        const categoryData = {
            name: "Electronics",
            slug: "ELECTRONICS", // Test if lowercase: true works later in DB
        };
        const category = new Category(categoryData);

        // Assert
        expect(category.name).toBe(categoryData.name);
        expect(category.slug).toBe(categoryData.slug.toLowerCase());
    });
});