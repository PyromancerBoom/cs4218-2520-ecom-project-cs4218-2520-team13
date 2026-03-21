// Integration tests for POST /create-product, PUT /update-product, DELETE /delete-product
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js'; 
import {
  startMemoryDB, stopMemoryDB, clearCollections,
  createAdmin, createUser, createProduct, generateToken,
} from '../helpers/db.js'; 
import productModel from '../../models/productModel.js';

// Lim Yik Seng, A0338506B
describe('Product Write Endpoints Integration Tests', () => {
  beforeAll(startMemoryDB);
  afterAll(stopMemoryDB);
  afterEach(clearCollections);

  // ─── POST /api/v1/product/create-product ─────────────────────────────────────
  describe('POST /api/v1/product/create-product', () => {
    // Lim Yik Seng, A0338506B
    it('returns 201 and correctly processes a valid uploaded photo', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      const categoryId = new mongoose.Types.ObjectId().toString();

      // Create a small, valid mock image buffer (e.g., 10 bytes)
      const validImageBuffer = Buffer.from('fake image');

      const res = await request(app)
        .post('/api/v1/product/create-product')
        .set('Authorization', token)
        .field('name', 'Product With Photo')
        .field('description', 'Has a nice photo')
        .field('price', 299)
        .field('category', categoryId)
        .field('quantity', 5)
        // Attach the mock image to trigger the if (photo) block
        .attach('photo', validImageBuffer, 'test-image.png'); 

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      
      // Verify the product is saved
      const savedProduct = await productModel.findOne({ name: 'Product With Photo' });
      expect(savedProduct).toBeTruthy();
      // Verify that the photo data was actually processed and saved
      expect(savedProduct.photo.data).toBeDefined();
      expect(savedProduct.photo.contentType).toBe('image/png');
    });

    // Lim Yik Seng, A0338506B
    it('returns 201 and creates product successfully without a photo', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      const categoryId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/product/create-product')
        .set('Authorization', token)
        .field('name', 'No Photo Product')
        .field('description', 'This product has no photo initially')
        .field('price', 100)
        .field('category', categoryId)
        .field('quantity', 10);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Product Created Successfully');
    });

    // Lim Yik Seng, A0338506B
    // Test the catch block by forcing a database CastError
    it('returns 500 and catches error when database operation fails (e.g., invalid category ObjectId)', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);

      const res = await request(app)
        .post('/api/v1/product/create-product')
        .set('Authorization', token)
        .field('name', 'Error Trigger Product')
        .field('description', 'This will fail DB validation')
        .field('price', 100)
        // Provide an intentionally malformed ObjectId to force Mongoose to throw an error during save()
        .field('category', 'invalid-mongoose-id-format') 
        .field('quantity', 10);
        // 🗑️ 已經把 .attach('photo', ...) 刪除，讓請求更單純

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in creating product');
    });

    // Lim Yik Seng, A0338506B
    // Parameterized test for missing text fields
    const missingFieldScenarios = [
      { missingField: 'name', expectedError: 'Name is Required' },
      { missingField: 'description', expectedError: 'Description is Required' },
      { missingField: 'price', expectedError: 'Price is Required' },
      { missingField: 'category', expectedError: 'Category is Required' },
      { missingField: 'quantity', expectedError: 'Quantity is Required' },
    ];

    it.each(missingFieldScenarios)(
      'returns 500 when $missingField is missing', 
      async ({ missingField, expectedError }) => {
        const { user: admin } = await createAdmin();
        const token = generateToken(admin._id);
        const categoryId = new mongoose.Types.ObjectId().toString();

        const validPayload = {
          name: 'Integration Test Product',
          description: 'This is a test description',
          price: 199,
          category: categoryId,
          quantity: 10,
          shipping: true
        };

        delete validPayload[missingField];

        let req = request(app)
          .post('/api/v1/product/create-product')
          .set('Authorization', token);

        Object.entries(validPayload).forEach(([key, value]) => {
          req = req.field(key, value);
        });

        // Attach a valid mock image so the request ONLY fails due to the missing text field
        // req.attach('photo', Buffer.from('dummy image'), 'dummy.png');

        const res = await req;
        expect(res.status).toBe(500);
        expect(res.body.error).toBe(expectedError);
    });

    // Lim Yik Seng, A0338506B
    // Explicit test for oversized photo
    it('returns 500 when uploaded photo is 1MB or larger', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      const categoryId = new mongoose.Types.ObjectId().toString();

      const largeImageBuffer = Buffer.alloc(1000000, 'a');

      const res = await request(app)
        .post('/api/v1/product/create-product')
        .set('Authorization', token)
        .field('name', 'Large Image Product')
        .field('description', 'Test desc')
        .field('price', 100)
        .field('category', categoryId)
        .field('quantity', 1)
        .attach('photo', largeImageBuffer, 'large.jpg');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('photo is Required and should be less than 1mb');
    });

    // Lim Yik Seng, A0338506B
    it('returns 401 when a non-admin user tries to create a product', async () => {
      const { user } = await createUser(); // Create a regular buyer (Role 0)
      const token = generateToken(user._id);

      const res = await request(app)
        .post('/api/v1/product/create-product')
        .set('Authorization', token)
        .field('name', 'Hacked Product')
        .field('price', 100);

      // Verify that the isAdmin middleware blocks the request and returns exact response
      expect(res.status).toBe(401); 
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('UnAuthorized Access'); 
    });

    // Lim Yik Seng, A0338506B
    it('returns 401 when an unauthenticated user tries to create a product', async () => {
      const res = await request(app)
        .post('/api/v1/product/create-product')
        .field('name', 'Hacked Product'); 
        // Intentionally omitting the Authorization header

      // Verify that the requireSignIn middleware catches the missing token
      expect(res.status).toBe(401); 
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Unauthorized'); 
    });

    // Lim Yik Seng, A0338506B
    // Edge Case: Negative Numbers for Price and Quantity
    it('returns 500 when price or quantity are invalid negative numbers', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      const categoryId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/product/create-product')
        .set('Authorization', token)
        .field('name', 'Negative Value Product')
        .field('description', 'Testing negative bounds')
        .field('price', -50) // Invalid negative price
        .field('category', categoryId)
        .field('quantity', -5) // Invalid negative quantity
        .attach('photo', Buffer.from('dummy image'), 'dummy.png');

      // Mongoose will fail the schema validation (min: 0) and throw a ValidationError
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in creating product');
    });

    // Lim Yik Seng, A0338506B
    // Edge Case: Extreme String Length
    it('returns 500 when the product name exceeds reasonable maximum length', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      const categoryId = new mongoose.Types.ObjectId().toString();

      // Generate a ridiculously long string (10,000 characters)
      const extremeLongName = 'A'.repeat(10000);

      const res = await request(app)
        .post('/api/v1/product/create-product')
        .set('Authorization', token)
        .field('name', extremeLongName)
        .field('description', 'Testing extreme string length')
        .field('price', 100)
        .field('category', categoryId)
        .field('quantity', 10)
        .attach('photo', Buffer.from('dummy image'), 'dummy.png');

      // Mongoose will fail to cast these strings to Numbers and throw a CastError
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in creating product');
    });

    // Lim Yik Seng, A0338506B
    // Edge Case: Description exceeds maximum length (8000 characters)
    it('returns 500 when the product description exceeds the 8000 character limit', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      const categoryId = new mongoose.Types.ObjectId().toString();

      // Generate a string with exactly 8001 characters to breach the Schema limit
      const overSizedDescription = 'A'.repeat(8001);

      const res = await request(app)
        .post('/api/v1/product/create-product')
        .set('Authorization', token)
        .field('name', 'Long Description Product')
        .field('description', overSizedDescription) // This should trigger a Mongoose ValidationError
        .field('price', 100)
        .field('category', categoryId)
        .field('quantity', 10)
        .attach('photo', Buffer.from('dummy image'), 'dummy.png');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in creating product');
    });

    // Lim Yik Seng, A0338506B
    // Edge Case: Invalid Data Types (Mongoose CastError)
    it('returns 500 when price or quantity are provided as invalid data types (e.g., strings instead of numbers)', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      const categoryId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/product/create-product')
        .set('Authorization', token)
        .field('name', 'Invalid Type Product')
        .field('description', 'Testing type casting error')
        // Intentionally sending non-numeric strings to Number fields
        .field('price', 'Not-A-Number') 
        .field('category', categoryId)
        .field('quantity', 'invalid-qty') 
        .attach('photo', Buffer.from('dummy image'), 'dummy.png');

      // Mongoose will fail to cast these strings to Numbers and throw a CastError
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in creating product');
    });

  });

  // ─── PUT /api/v1/product/update-product/:pid ───────────────────────────────
  describe('PUT /api/v1/product/update-product/:pid', () => {
    // Lim Yik Seng, A0338506B
    it('returns 201 and updates the product successfully without updating the photo', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      
      // Create an initial product to update
      const initialProduct = await createProduct({ name: 'Old Name', price: 100 });

      // Send PUT request to update text fields only (no photo attached)
      const res = await request(app)
        .put(`/api/v1/product/update-product/${initialProduct._id}`)
        .set('Authorization', token)
        .field('name', 'Updated Name')
        .field('description', 'Updated Description')
        .field('price', 150)
        .field('category', initialProduct.category.toString())
        .field('quantity', 20);

      // Assertions
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Product Updated Successfully');
      expect(res.body.products.name).toBe('Updated Name');
      expect(res.body.products.price).toBe(150);
    });

    // Lim Yik Seng, A0338506B
    it('returns 201 and updates the product successfully including a new photo', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      
      // Create initial product
      const initialProduct = await createProduct({ name: 'Product Before Photo Update' });

      // Prepare a specific buffer to distinguish from the old one
      const newImageBuffer = Buffer.from('new specific image content');

      // Send update request
      const res = await request(app)
        .put(`/api/v1/product/update-product/${initialProduct._id}`)
        .set('Authorization', token)
        .field('name', 'Product After Photo Update')
        .field('description', 'Updated Description')
        .field('price', 200)
        .field('category', initialProduct.category.toString())
        .field('quantity', 30)
        .attach('photo', newImageBuffer, 'new_dummy.png');

      // Basic assertions
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.products.name).toBe('Product After Photo Update');

      // Deep Verification: Fetch from DB to ensure photo was actually updated
      const updatedProduct = await productModel.findById(initialProduct._id);
      expect(updatedProduct).toBeTruthy();
      
      // Check if photo exists and matches the new data we sent
      expect(updatedProduct.photo.data).toBeDefined();
      expect(updatedProduct.photo.contentType).toBe('image/png');
      
      // Compare buffers to be 100% sure it's the new content
      expect(updatedProduct.photo.data.toString()).toBe('new specific image content');
    });

    // Lim Yik Seng, A0338506B
    // Parameterized test for missing required text fields during update
    const updateMissingFieldScenarios = [
      { missingField: 'name', expectedError: 'Name is Required' },
      { missingField: 'description', expectedError: 'Description is Required' },
      { missingField: 'price', expectedError: 'Price is Required' },
      { missingField: 'category', expectedError: 'Category is Required' },
      { missingField: 'quantity', expectedError: 'Quantity is Required' },
    ];

    it.each(updateMissingFieldScenarios)(
      'returns 500 when $missingField is missing during update', 
      async ({ missingField, expectedError }) => {
        const { user: admin } = await createAdmin();
        const token = generateToken(admin._id);
        const initialProduct = await createProduct({ name: 'Target Product' });

        const validPayload = {
          name: 'Updated Name',
          description: 'Updated Description',
          price: 150,
          category: initialProduct.category.toString(),
          quantity: 20
        };

        // Remove the specific field to trigger validation error
        delete validPayload[missingField];

        let req = request(app)
          .put(`/api/v1/product/update-product/${initialProduct._id}`)
          .set('Authorization', token);

        Object.entries(validPayload).forEach(([key, value]) => {
          req = req.field(key, value);
        });

        const res = await req;
        
        expect(res.status).toBe(500);
        expect(res.body.error).toBe(expectedError);
    });

    // Lim Yik Seng, A0338506B
    it('returns 500 when the attached photo is 1MB or larger during update', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      const initialProduct = await createProduct({ name: 'Product For Large Image Test' });

      const largeImageBuffer = Buffer.alloc(1000000, 'a');

      const res = await request(app)
        .put(`/api/v1/product/update-product/${initialProduct._id}`)
        .set('Authorization', token)
        .field('name', 'Updated Name')
        .field('description', 'Updated Desc')
        .field('price', 100)
        .field('category', initialProduct.category.toString())
        .field('quantity', 10)
        .attach('photo', largeImageBuffer, 'large.png');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('photo is Required and should be less than 1mb'); 
    });

    // Lim Yik Seng, A0338506B
    it('returns 500 and catches error when database update fails (e.g., invalid product pid)', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      const categoryId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        // Inject an invalid MongoDB ObjectId format into the URL parameter
        .put('/api/v1/product/update-product/invalid-product-id')
        .set('Authorization', token)
        .field('name', 'Valid Name')
        .field('description', 'Valid Desc')
        .field('price', 100)
        .field('category', categoryId)
        .field('quantity', 10);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in Update product');
    });

    // Lim Yik Seng, A0338506B
    it('returns 401 when a non-admin user tries to update a product', async () => {
      const { user } = await createUser(); // Regular buyer
      const token = generateToken(user._id);
      const initialProduct = await createProduct({ name: 'Hacked Product' });

      const res = await request(app)
        .put(`/api/v1/product/update-product/${initialProduct._id}`)
        .set('Authorization', token)
        .field('name', 'Malicious Update')
        .field('price', 1);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('UnAuthorized Access');
    });

    // Lim Yik Seng, A0338506B
    it('returns 401 when an unauthenticated user tries to update a product', async () => {
      const initialProduct = await createProduct({ name: 'Hacked Product' });

      const res = await request(app)
        .put(`/api/v1/product/update-product/${initialProduct._id}`)
        .field('name', 'Malicious Update'); // Missing Authorization header

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Unauthorized');
    });

    // Lim Yik Seng, A0338506B
    // Edge Case: Negative Numbers (Validation during update)
    it('returns 500 when updating price or quantity to negative numbers', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      const initialProduct = await createProduct({ name: 'Price Update Test', price: 100 });

      const res = await request(app)
        .put(`/api/v1/product/update-product/${initialProduct._id}`)
        .set('Authorization', token)
        .field('name', 'Price Update Test')
        .field('description', 'Trying negative price')
        .field('price', -1) // Invalid
        .field('category', initialProduct.category.toString())
        .field('quantity', -10); // Invalid

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in Update product');
    });

    // Lim Yik Seng, A0338506B
    // Edge Case: String Length Limits
    it('returns 500 when updating description to exceed 8000 characters', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      const initialProduct = await createProduct({ name: 'Desc Update Test' });

      const res = await request(app)
        .put(`/api/v1/product/update-product/${initialProduct._id}`)
        .set('Authorization', token)
        .field('name', 'Desc Update Test')
        .field('description', 'A'.repeat(8001)) // Breach limit
        .field('price', 100)
        .field('category', initialProduct.category.toString())
        .field('quantity', 10);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in Update product');
    });

    // Lim Yik Seng, A0338506B
    // Edge Case: Invalid ID format (CastError for Params)
    it('returns 500 when providing a malformed product ID in the URL', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);

      const res = await request(app)
        .put('/api/v1/product/update-product/not-a-valid-object-id')
        .set('Authorization', token)
        .field('name', 'New Name')
        .field('description', 'Desc')
        .field('price', 100)
        .field('category', new mongoose.Types.ObjectId().toString())
        .field('quantity', 10);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in Update product');
    });

    // Lim Yik Seng, A0338506B
    // Edge Case: Product Name exceeds maxlength (200 characters)
    it('returns 500 when updating the product name to exceed the 200 character schema limit', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      
      const initialProduct = await createProduct({ name: 'Valid Short Name' });

      const extremeLongName = 'A'.repeat(201);

      const res = await request(app)
        .put(`/api/v1/product/update-product/${initialProduct._id}`)
        .set('Authorization', token)
        .field('name', extremeLongName) 
        .field('description', 'Testing name length validation during update')
        .field('price', 100)
        .field('category', initialProduct.category.toString())
        .field('quantity', 10);

      // Verify that Mongoose validation triggers and the controller returns 500
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in Update product');
    });
  });

  // ─── DELETE /api/v1/product/delete-product/:pid ────────────────────────────
  describe('DELETE /api/v1/product/delete-product/:pid', () => {
    // Lim Yik Seng, A0338506B
    // Happy Path: Delete an existing product
    it('returns 200 and successfully deletes the product', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);
      
      // Create a product that will be deleted
      const productToDelete = await createProduct({ name: 'Product to be Deleted' });

      // Send DELETE request
      const res = await request(app)
        .delete(`/api/v1/product/delete-product/${productToDelete._id}`)
        .set('Authorization', token);

      // Assertions
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Product Deleted successfully');

      // Verify the product is no longer in the database
      const deletedCheck = await productModel.findById(productToDelete._id);
      expect(deletedCheck).toBeNull();
    });

    // Lim Yik Seng, A0338506B
    it('returns 401 when a non-admin user tries to delete a product', async () => {
      const { user } = await createUser(); // Regular user
      const token = generateToken(user._id);
      const product = await createProduct({ name: 'Safe Product' });

      const res = await request(app)
        .delete(`/api/v1/product/delete-product/${product._id}`)
        .set('Authorization', token);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('UnAuthorized Access');
    });

    // Lim Yik Seng, A0338506B
    it('returns 401 when an unauthenticated user tries to delete a product', async () => {
      const product = await createProduct({ name: 'Safe Product' });

      const res = await request(app)
        .delete(`/api/v1/product/delete-product/${product._id}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Unauthorized');
    });

    // Lim Yik Seng, A0338506B
    // Database Error: Trigger catch block via malformed ID
    it('returns 500 when database operation fails during deletion due to malformed ID', async () => {
      const { user: admin } = await createAdmin();
      const token = generateToken(admin._id);

      const res = await request(app)
        .delete('/api/v1/product/delete-product/invalid-id-format')
        .set('Authorization', token);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error while deleting product');
    });
  });

});