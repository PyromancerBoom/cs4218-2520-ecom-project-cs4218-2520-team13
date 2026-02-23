import mongoose from 'mongoose';
import productModel from '../models/productModel';

// Lim Yik Seng, A0338506B
describe('Product Model Unit Tests', () => {

    // Helper function to create valid product data base
    const getValidProductData = () => ({
        name: 'Professional Camera',
        slug: 'professional-camera',
        description: 'High-end DSLR camera for professionals',
        price: 1200,
        category: new mongoose.Types.ObjectId(),
        quantity: 15,
        shipping: true,
        photo: {
            data: Buffer.from('fake-image-data'),
            contentType: 'image/png'
        }
    });

    // Lim Yik Seng, A0338506B
    // 1. POSITIVE TESTING
    it('should validate successfully with all valid required fields', async () => {
        const product = new productModel(getValidProductData());
        let error;
        try {
            await product.validate();
        } catch (err) {
            error = err;
        }
        expect(error).toBeUndefined();
    });

    // Lim Yik Seng, A0338506B
    // 2. GRANULAR REQUIRED FIELDS TESTING (Negative Testing)
    const requiredFields = ['name', 'slug', 'description', 'price', 'category', 'quantity'];
    
    test.each(requiredFields)('should throw a validation error if the "%s" field is missing', async (field) => {
        const productData = getValidProductData();
        delete productData[field]; // Remove the specific field to test requirement

        const product = new productModel(productData);
        let error;

        try {
            await product.validate();
        } catch (err) {
            error = err;
        }

        expect(error).toBeDefined();
        // Check if the specific field triggered the error
        expect(error.errors[field]).toBeDefined();
        expect(error.errors[field].kind).toBe('required');
    });

    // Lim Yik Seng, A0338506B
    // 3. DATA TYPE VALIDATION (Negative Testing)
    const numericFields = ['price', 'quantity'];

    test.each(numericFields)('should fail if the "%s" field is not a number', async (field) => {
        const productData = getValidProductData();
        productData[field] = 'invalid_string_data'; // Injecting a string where a number is expected

        const product = new productModel(productData);
        let error;

        try {
            await product.validate();
        } catch (err) {
            error = err;
        }

        expect(error).toBeDefined();
        // Mongoose records the expected type in the "kind" property
        expect(error.errors[field].kind).toBe('Number');
    });

    // Lim Yik Seng, A0338506B
    it('should fail validation if category is not a valid ObjectId', async () => {
        const productData = getValidProductData();
        productData.category = 'invalid-id-string'; // Invalid format

        const product = new productModel(productData);
        let error;
        try {
            await product.validate();
        } catch (err) {
            error = err;
        }

        expect(error).toBeDefined();
        expect(error.errors.category.kind).toBe('ObjectId');
    });

    // Lim Yik Seng, A0338506B
    // 4. NESTED OBJECT TESTING (Photo Field)
    it('should allow valid photo data and contentType', async () => {
        const productData = getValidProductData();
        const product = new productModel(productData);
        
        let error;
        try {
            await product.validate();
        } catch (err) {
            error = err;
        }
        
        expect(error).toBeUndefined();
        expect(product.photo.data).toBeInstanceOf(Buffer);
        expect(typeof product.photo.contentType).toBe('string');
    });

    // Lim Yik Seng, A0338506B
    // 5. OPTIONAL FIELDS TESTING
    it('should pass validation when optional fields like photo and shipping are missing', async () => {
        const productData = getValidProductData();
        delete productData.shipping; // Optional field
        delete productData.photo;   // Optional field

        const product = new productModel(productData);
        let error;
        try {
            await product.validate();
        } catch (err) {
            error = err;
        }

        expect(error).toBeUndefined();
    });
});