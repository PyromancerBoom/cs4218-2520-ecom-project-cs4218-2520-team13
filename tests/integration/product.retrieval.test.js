import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js'; 
import {
  startMemoryDB, stopMemoryDB, clearCollections,
  createAdmin, createUser, createProduct, createCategory, generateToken,
} from '../helpers/db.js'; 
import productModel from '../../models/productModel.js';
// If your retrieval logic involves categories, you might need this:
import categoryModel from '../../models/categoryModel.js'; 

// Lim Yik Seng, A0338506B
describe('Product Retrieval Endpoints Integration Tests', () => {
  beforeAll(startMemoryDB);
  afterAll(stopMemoryDB);
    // Note: We might use clearCollections afterEach, 
  // but for retrieval tests, you'll often seed data in each 'it' block.
  afterEach(clearCollections); 

  // Lim Yik Seng, A0338506B
  describe('GET /api/v1/product/get-product', () => {
    // Lim Yik Seng, A0338506B
    it('returns 200 and all products with populated categories, strictly excluding photo data', async () => {
      const category = await createCategory({ name: 'Electronics' });
      
      await createProduct({ name: 'Oldest Product', category: category._id });
      await productModel.create({
        name: 'Newest Product',
        slug: 'newest-product',
        description: 'Testing list retrieval with photo filter',
        price: 100,
        category: category._id,
        quantity: 10,
        photo: { data: Buffer.from('image-data'), contentType: 'image/png' } 
      });

      const res = await request(app).get('/api/v1/product/get-product');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.countTotal).toBe(2);

      expect(res.body.products[0].name).toBe('Newest Product');
      
      expect(res.body.products[0]).not.toHaveProperty('photo');
      expect(res.body.products[0].category.name).toBe('Electronics');
    });

    // Lim Yik Seng, A0338506B
    it('returns 200 and limits the response to a maximum of 12 products', async () => {
      const category = await createCategory();
      
      // Seed 13 products to test the .limit(12) logic
      for (let i = 0; i < 13; i++) {
        await createProduct({ name: `Product ${i}`, category: category._id });
      }

      const res = await request(app).get('/api/v1/product/get-product');

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBe(12);
      expect(res.body.countTotal).toBe(12);
    });

    // Lim Yik Seng, A0338506B
    it('returns 200 and an empty array when no products exist in the database', async () => {
      const res = await request(app).get('/api/v1/product/get-product');

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(0);
      expect(res.body.countTotal).toBe(0);
    });

    // Lim Yik Seng, A0338506B
    it('returns 500 and catches error when database operation fails during get-product', async () => {
      // Force an error by mocking the find method to throw an error
      const findSpy = jest.spyOn(productModel, 'find').mockImplementation(() => {
        throw new Error('Database Error');
      });

      const res = await request(app).get('/api/v1/product/get-product');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in getting products');
      expect(res.body.error).toBe('Database Error');

      // Clean up the spy
      findSpy.mockRestore();
    });
  });

  // Lim Yik Seng, A0338506B
  describe('GET /api/v1/product/get-product/:slug', () => {
    
    // Lim Yik Seng, A0338506B
    it('returns 200 and should strictly exclude photo data and include full category details', async () => {
      const category = await createCategory({ name: 'Gaming' });
      await productModel.create({
        name: 'PS5 Controller',
        slug: 'ps5-controller',
        description: 'Professional gaming controller with haptic feedback',
        price: 69.99,
        category: category._id,
        quantity: 100,
        photo: { data: Buffer.from('large-image-stream'), contentType: 'image/png' }
      });

      const res = await request(app).get('/api/v1/product/get-product/ps5-controller');

      expect(res.status).toBe(200);
      expect(res.body.product).toMatchObject({
        name: 'PS5 Controller',
        slug: 'ps5-controller',
        price: 69.99
      });
      expect(res.body.product).not.toHaveProperty('photo');
      expect(res.body.product.category.name).toBe('Gaming');
      expect(Date.parse(res.body.product.createdAt)).not.toBeNaN();
    });

    // Lim Yik Seng, A0338506B
    // Case: Product not found (Valid slug format but doesn't exist)
    it('returns 200 and product as null when the slug does not exist in database', async () => {
      // Based on your controller logic, findOne returns null and still sends 200
      const res = await request(app).get('/api/v1/product/get-product/non-existent-slug');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.product).toBeNull();
    });

    // Lim Yik Seng, A0338506B
    // Catch Error: Database failure during single product retrieval
    it('returns 500 and catches error when database fails during get-single-product', async () => {
      // Mock findOne to throw an error for 100% coverage
      const findOneSpy = jest.spyOn(productModel, 'findOne').mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const res = await request(app).get('/api/v1/product/get-product/any-slug');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error while getting single product');
      expect(res.body.error).toBe('Database connection failed');

      findOneSpy.mockRestore();
    });

    // Lim Yik Seng, A0338506B
    // URL Encoding & Special Characters
    it('should correctly handle slugs with special characters and URL encoding', async () => {
      await createProduct({ 
        name: 'Special Edition & Limited', 
        slug: 'special-edition-&-limited' 
      });

      const res = await request(app).get('/api/v1/product/get-product/special-edition-%26-limited');

      expect(res.status).toBe(200);
      expect(res.body.product.name).toBe('Special Edition & Limited');
      expect(res.body.product.slug).toBe('special-edition-&-limited');
    });

  });

  // Lim Yik Seng, A0338506B
  describe('GET /api/v1/product/product-photo/:pid', () => {
    
    // Happy Path (Successfully retrieve binary image)
    it('should return 200 and the correct image binary with proper Content-Type', async () => {
      // Setup: Create a product with actual photo buffer
      const photoData = Buffer.from('fake-binary-image-content');
      const contentType = 'image/png';
      
      const product = await productModel.create({
        name: 'Photo Test Product',
        slug: 'photo-test',
        description: 'Testing binary photo retrieval',
        price: 10,
        category: new mongoose.Types.ObjectId(),
        quantity: 1,
        photo: { data: photoData, contentType: contentType }
      });

      // Action: Request the photo
      const res = await request(app).get(`/api/v1/product/product-photo/${product._id}`);

      // Assertions
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe(contentType);
      expect(res.body).toEqual(photoData);
    });

    // Product Not Found (404)
    it('returns 404 when the product ID does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/v1/product/product-photo/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Product not found');
    });

    // Product Exists but No Photo Data (404)
    it('returns 404 when the product exists but has no photo data', async () => {
      // Create a product without the photo field
      const product = await createProduct({ name: 'No Photo Product' });

      const res = await request(app).get(`/api/v1/product/product-photo/${product._id}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('No photo found for this product');
    });

    // Invalid ID Format (500 / Catch Error)
    it('returns 500 when an invalid ID format is provided', async () => {
      const res = await request(app).get('/api/v1/product/product-photo/123-invalid-id');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error while getting photo');
    });
  });

  // Lim Yik Seng, A0338506B
  describe('POST /api/v1/product/product-filters', () => {
    let catElectronics, catAudio;

    beforeEach(async () => {
      catElectronics = await createCategory({ name: 'Electronics' });
      catAudio = await createCategory({ name: 'Audio' });

      await createProduct({ name: 'Laptop', price: 1000, category: catElectronics._id });
      await createProduct({ name: 'Smartphone', price: 500, category: catElectronics._id });
      await createProduct({ name: 'Headphones', price: 100, category: catAudio._id });
      await createProduct({ name: 'Speaker', price: 200, category: catAudio._id });
    });

    // Lim Yik Seng, A0338506B
    // Filter by Categories only
    it('should return only products from the selected categories', async () => {
      const res = await request(app)
        .post('/api/v1/product/product-filters')
        .send({ checked: [catAudio._id.toString()] }); 
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products).toHaveLength(2);
      
      const names = res.body.products.map(p => p.name);
      expect(names).toContain('Headphones');
      expect(names).toContain('Speaker');
      expect(names).not.toContain('Laptop');
    });

    // Lim Yik Seng, A0338506B
    // Filter by Price Range only
    it('should return only products within the specified price range', async () => {
      const res = await request(app)
        .post('/api/v1/product/product-filters')
        .send({ radio: [400, 600] }); 

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe('Smartphone');
    });

    // Lim Yik Seng, A0338506B
    // Combined Filters (Category + Price)
    it('should return products that match both category and price criteria', async () => {
      const res = await request(app)
        .post('/api/v1/product/product-filters')
        .send({ 
          checked: [catElectronics._id.toString()],
          radio: [0, 600] 
        });

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe('Smartphone');
    });

    // Lim Yik Seng, A0338506B
    // Edge Case - Empty filters
    it('should return all products when filters are empty or missing', async () => {
      const res = await request(app)
        .post('/api/v1/product/product-filters')
        .send({ checked: [], radio: [] });

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(4);
    });

    // Lim Yik Seng, A0338506B
    // Error Handling (400 Bad Request)
    it('should return 400 when database operation fails', async () => {
      const spy = jest.spyOn(productModel, 'find').mockImplementation(() => {
        throw new Error('Filter operation failed');
      });

      const res = await request(app)
        .post('/api/v1/product/product-filters')
        .send({ checked: [] });

      expect(res.status).toBe(400); 
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error While Filtering Products');
      expect(res.body.error).toBe('Filter operation failed');

      spy.mockRestore();
    });
  });

  // Lim Yik Seng, A0338506B
  describe('GET /api/v1/product/product-count', () => {
    
    // Empty Database
    it('returns 200 and a total of 0 when there are no products in the database', async () => {
      const res = await request(app).get('/api/v1/product/product-count');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(0);
    });

    // Populated Database
    it('returns 200 and the correct total count of products', async () => {
      // Setup
      const category = await createCategory({ name: 'Count Test Category' });
      await createProduct({ name: 'Product 1', category: category._id });
      await createProduct({ name: 'Product 2', category: category._id });
      await createProduct({ name: 'Product 3', category: category._id });

      // Action
      const res = await request(app).get('/api/v1/product/product-count');

      // Assertions
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(3);
    });

    // Error Handling
    it('returns 500 and catches error when database operation fails', async () => {
      const countSpy = jest.spyOn(productModel, 'estimatedDocumentCount').mockImplementation(() => {
        throw new Error('Count operation failed');
      });

      const res = await request(app).get('/api/v1/product/product-count');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error in product count');
      expect(res.body.error).toBe('Count operation failed');
      countSpy.mockRestore();
    });

  });

  // Lim Yik Seng, A0338506B
  describe('GET /api/v1/product/product-list/:page', () => {
    let category;

    // Setup: Create 8 products before each test to verify the perPage = 6 pagination logic
    beforeEach(async () => {
      category = await createCategory({ name: 'Pagination Category' });
      
      // Batch create 8 products
      for (let i = 1; i <= 8; i++) {
        await createProduct({ 
          name: `Product ${i}`, 
          price: 100 * i, 
          category: category._id 
        });
      }
    });

    // Lim Yik Seng, A0338506B
    // Happy Path - Page 1
    it('returns 200 and the first 6 products for page 1', async () => {
      const res = await request(app).get('/api/v1/product/product-list/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify if limit(6) is applied correctly
      expect(res.body.products).toHaveLength(6);
      
      // Verify security filter (exclude photo)
      expect(res.body.products[0]).not.toHaveProperty('photo');
    });

    // Lim Yik Seng, A0338506B
    // Happy Path - Page 2 (Partial Page)
    it('returns 200 and the remaining 2 products for page 2', async () => {
      const res = await request(app).get('/api/v1/product/product-list/2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // 8 products total - 6 on page 1 = 2 remaining for page 2. Verifies skip() logic.
      expect(res.body.products).toHaveLength(2);
    });

    // Lim Yik Seng, A0338506B
    // Edge Case: Invalid string parameter
    it('defaults to page 1 and returns 6 products when page parameter is a non-numeric string', async () => {
      // Intentionally pass a string to trigger the (parseInt(req.params.page) || 1) fallback
      const res = await request(app).get('/api/v1/product/product-list/not-a-number');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products).toHaveLength(6);
    });

    // Lim Yik Seng, A0338506B
    // Edge Case: Zero parameter
    it('defaults to page 1 and returns 6 products when page parameter is exactly 0', async () => {
      // Intentionally pass 0 to trigger the (pageNum < 1 ? 1 : pageNum) fallback
      const res = await request(app).get('/api/v1/product/product-list/0');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products).toHaveLength(6);
    });

    // Lim Yik Seng, A0338506B
    // Edge Case: Negative number parameter
    it('defaults to page 1 and returns 6 products when page parameter is a negative number', async () => {
      // Intentionally pass a negative number to trigger the (pageNum < 1 ? 1 : pageNum) fallback
      const res = await request(app).get('/api/v1/product/product-list/-5');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products).toHaveLength(6);
    });

    // Lim Yik Seng, A0338506B
    // Edge Case - Out of Bounds (Empty Page)
    it('returns 200 and an empty array when requesting a page with no products', async () => {
      // Total is 8 products, so page 10 must be empty
      const res = await request(app).get('/api/v1/product/product-list/10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Should gracefully return an empty array instead of throwing an error
      expect(res.body.products).toHaveLength(0); 
    });

    // Lim Yik Seng, A0338506B
    // Error Catch (500)
    it('returns 500 when database pagination operation fails', async () => {
      const spy = jest.spyOn(productModel, 'find').mockImplementation(() => {
        throw new Error('Pagination DB Crash');
      });

      const res = await request(app).get('/api/v1/product/product-list/1');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('error in per page ctrl'); 
      expect(res.body.error).toBe('Pagination DB Crash');

      spy.mockRestore();
    });
  });

  // Lim Yik Seng, A0338506B
  describe('GET /api/v1/product/search/:keyword', () => {
    let category;

    // Setup: Seed the database with specific keywords in names and descriptions
    beforeEach(async () => {
      category = await createCategory({ name: 'Tech' });

      await createProduct({ 
        name: 'Apple iPhone 15', 
        description: 'Latest flagship smartphone', 
        category: category._id 
      });

      await createProduct({ 
        name: 'MacBook Pro', 
        description: 'Powerful Apple laptop with M3 chip', 
        category: category._id 
      });

      await createProduct({ 
        name: 'Samsung Galaxy S24', 
        description: 'High-end Android device', 
        category: category._id 
      });
    });

    // Lim Yik Seng, A0338506B
    // Match by Name (Case-Insensitive)
    it('returns 200 and matches products by name regardless of casing', async () => {
      // Keyword "IPHONE" tests the $options: "i" (case-insensitive) logic
      const res = await request(app).get('/api/v1/product/search/IPHONE');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].name).toBe('Apple iPhone 15');
      
      // Verify security filter is active
      expect(res.body.results[0]).not.toHaveProperty('photo');
    });

    // Lim Yik Seng, A0338506B
    // Match by Description
    it('returns 200 and matches products by description', async () => {
      const res = await request(app).get('/api/v1/product/search/laptop');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].name).toBe('MacBook Pro');
    });

    // Lim Yik Seng, A0338506B
    // Multiple Matches ($or logic)
    it('returns 200 and all products that contain the keyword in either name or description', async () => {
      // "Apple" is in iPhone's name and MacBook's description
      const res = await request(app).get('/api/v1/product/search/apple');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results).toHaveLength(2);
      
      const names = res.body.results.map(p => p.name);
      expect(names).toContain('Apple iPhone 15');
      expect(names).toContain('MacBook Pro');
      expect(names).not.toContain('Samsung Galaxy S24');
    });

    // Lim Yik Seng, A0338506B
    // No Matches Found
    it('returns 200 and an empty array when no products match the keyword', async () => {
      const res = await request(app).get('/api/v1/product/search/nokia');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results).toHaveLength(0);
    });

    // Lim Yik Seng, A0338506B
    // Input Validation (Whitespace)
    it('returns 400 when the keyword consists only of empty spaces', async () => {
      // Send URL-encoded spaces (%20) to bypass Express routing limitations and hit the controller
      const res = await request(app).get('/api/v1/product/search/%20%20%20');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Keyword is required');
    });

    // Lim Yik Seng, A0338506B
    // Server Error
    it('returns 500 when database search operation fails', async () => {
      const spy = jest.spyOn(productModel, 'find').mockImplementation(() => {
        throw new Error('Search DB Crash');
      });

      const res = await request(app).get('/api/v1/product/search/apple');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error In Search Product API');
      expect(res.body.error).toBe('Search DB Crash');

      spy.mockRestore();
    });
  });

  // Lim Yik Seng, A0338506B
  describe('GET /api/v1/product/related-product/:pid/:cid', () => {
    let targetCategory, otherCategory;
    let mainProduct;

    // Setup: Create necessary categories and products before each test
    beforeEach(async () => {
      targetCategory = await createCategory({ name: 'Smartphones' });
      otherCategory = await createCategory({ name: 'Laptops' });

      // The product we are currently viewing
      mainProduct = await createProduct({ 
        name: 'iPhone 15', 
        category: targetCategory._id 
      });

      // Related products in the SAME category
      await createProduct({ name: 'Samsung S24', category: targetCategory._id });
      await createProduct({ name: 'Google Pixel 8', category: targetCategory._id });
      await createProduct({ name: 'OnePlus 12', category: targetCategory._id });
      await createProduct({ name: 'Sony Xperia', category: targetCategory._id }); // 4th related product

      // Unrelated product in a DIFFERENT category
      await createProduct({ name: 'MacBook Pro', category: otherCategory._id });
    });

    // Lim Yik Seng, A0338506B
    // Happy Path - Retrieve related products with correct logic
    it('returns 200 and up to 3 related products from the same category, excluding the current product', async () => {
      const res = await request(app).get(`/api/v1/product/related-product/${mainProduct._id}/${targetCategory._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify limit(3) - even though we created 4 related products, it should only return 3
      expect(res.body.products).toHaveLength(3);

      const returnedNames = res.body.products.map(p => p.name);

      // Verify $ne logic - the main product should NOT be in the results
      expect(returnedNames).not.toContain('iPhone 15');

      // Verify category logic - products from other categories should NOT be included
      expect(returnedNames).not.toContain('MacBook Pro');

      // Verify population and security exclusion
      expect(res.body.products[0].category.name).toBe('Smartphones');
      expect(res.body.products[0]).not.toHaveProperty('photo');
    });

    // Lim Yik Seng, A0338506B
    // Empty Results
    it('returns 200 and an empty array if there are no other products in the same category', async () => {
      // Create a new isolated category and product
      const lonelyCategory = await createCategory({ name: 'Tablets' });
      const lonelyProduct = await createProduct({ name: 'iPad Pro', category: lonelyCategory._id });

      const res = await request(app).get(`/api/v1/product/related-product/${lonelyProduct._id}/${lonelyCategory._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Since there are no other tablets, the result should be empty
      expect(res.body.products).toHaveLength(0);
    });

    // Lim Yik Seng, A0338506B
    // Error Handling (500)
    it('returns 500 when invalid ObjectIds are provided, triggering a database cast error', async () => {
      // Providing invalid MongoDB ObjectIds to force Mongoose to throw a CastError
      const res = await request(app).get('/api/v1/product/related-product/invalid-pid/invalid-cid');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('error while getting related product');
      // The exact error message depends on Mongoose version, but it should exist
      expect(res.body.error).toBeDefined(); 
    });
  });

  // Lim Yik Seng, A0338506B
  describe('GET /api/v1/product/product-category/:slug', () => {
    let populatedCategory;
    let emptyCategory;

    // Setup: Create categories and products for testing the two-step query logic
    beforeEach(async () => {
      // Create a category that will contain products
      populatedCategory = await categoryModel.create({ 
        name: 'Laptops', 
        slug: 'laptops' 
      });

      // Create a category that will have NO products linked to it
      emptyCategory = await categoryModel.create({ 
        name: 'Desktops', 
        slug: 'desktops' 
      });

      // Seed products linked only to the populatedCategory
      await createProduct({ 
        name: 'MacBook Air', 
        category: populatedCategory._id 
      });
      await createProduct({ 
        name: 'Dell XPS 15', 
        category: populatedCategory._id 
      });
    });

    // Lim Yik Seng, A0338506B
    // Happy Path - Category exists and has products
    it('returns 200, the category details, and a populated list of products', async () => {
      const res = await request(app).get('/api/v1/product/product-category/laptops');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify the category object is returned correctly
      expect(res.body.category.name).toBe('Laptops');
      expect(res.body.category.slug).toBe('laptops');

      // Verify the products array contains the expected items
      expect(res.body.products).toHaveLength(2);
      
      const productNames = res.body.products.map(p => p.name);
      expect(productNames).toContain('MacBook Air');
      expect(productNames).toContain('Dell XPS 15');

      // Verify populate('category') worked correctly on the products
      expect(res.body.products[0].category.name).toBe('Laptops');
    });

    // Lim Yik Seng, A0338506B
    // Category exists but has NO products
    it('returns 200 and an empty products array when the category has no associated products', async () => {
      const res = await request(app).get('/api/v1/product/product-category/desktops');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Category is successfully found
      expect(res.body.category.name).toBe('Desktops');
      
      // But products array must be strictly empty, not null or undefined
      expect(res.body.products).toHaveLength(0);
    });

    // Lim Yik Seng, A0338506B
    // Category Not Found (404)
    it('returns 404 when the requested category slug does not exist in the database', async () => {
      // A valid string format, but doesn't exist in DB (no CastError will happen)
      const res = await request(app).get('/api/v1/product/product-category/non-existent-slug');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Category not found in database');
    });

    // Lim Yik Seng, A0338506B
    // Server Error (500)
    it('returns 500 when database category retrieval operation fails', async () => {
      // We MUST mock this because querying a string slug will never throw a natural error
      const spy = jest.spyOn(categoryModel, 'findOne').mockImplementation(() => {
        throw new Error('Database failure during category lookup');
      });

      const res = await request(app).get('/api/v1/product/product-category/laptops');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error While Getting products');
      expect(res.body.error).toBe('Database failure during category lookup');

      spy.mockRestore();
    });
  });
});