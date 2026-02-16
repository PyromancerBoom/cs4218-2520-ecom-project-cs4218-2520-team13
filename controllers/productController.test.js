import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';

// Mock mongoose before importing models
await jest.unstable_mockModule('mongoose', () => ({
  default: {
    Schema: jest.fn(),
    model: jest.fn(),
    ObjectId: jest.fn()
  },
  Schema: jest.fn(),
  model: jest.fn()
}));

// Mock fs
const mockReadFileSync = jest.fn();
await jest.unstable_mockModule('fs', () => ({
  default: {
    readFileSync: mockReadFileSync
  },
  readFileSync: mockReadFileSync
}));

// Mock slugify
const mockSlugify = jest.fn();
await jest.unstable_mockModule('slugify', () => ({
  default: mockSlugify
}));

// Mock productModel as a constructor function with static methods
const mockProductSave = jest.fn();
const mockProductFindByIdAndUpdate = jest.fn();
const mockProductFindByIdAndDelete = jest.fn();

// Create a mock constructor that returns an instance with save method
const MockProductModel = jest.fn().mockImplementation((data) => ({
  ...data,
  photo: { data: null, contentType: null },
  save: mockProductSave
}));

// Add static methods to the constructor
MockProductModel.findByIdAndUpdate = mockProductFindByIdAndUpdate;
MockProductModel.findByIdAndDelete = mockProductFindByIdAndDelete;

await jest.unstable_mockModule('../models/productModel.js', () => ({
  default: MockProductModel
}));

// Mock categoryModel
await jest.unstable_mockModule('../models/categoryModel.js', () => ({
  default: {
    findOne: jest.fn()
  }
}));

// Mock orderModel
await jest.unstable_mockModule('../models/orderModel.js', () => ({
  default: jest.fn()
}));

// Mock braintree
await jest.unstable_mockModule('braintree', () => ({
  default: {
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      clientToken: { generate: jest.fn() },
      transaction: { sale: jest.fn() }
    })),
    Environment: { Sandbox: 'sandbox' }
  }
}));

// Mock dotenv
await jest.unstable_mockModule('dotenv', () => ({
  default: { config: jest.fn() }
}));

// Import after mocking
const { createProductController, deleteProductController, updateProductController } = await import('./productController.js');

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
});

// Wei Sheng, A0259272X
describe('createProductController', () => {
  let req, res;

  // Wei Sheng, A0259272X
  beforeEach(() => {
    req = {
      fields: {},
      files: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    jest.clearAllMocks();
    mockSlugify.mockImplementation((str) => str.toLowerCase().replace(/\s+/g, '-'));
  });

  // Wei Sheng, A0259272X
  describe('Validation', () => {
    it('should validate name field (required)', async () => {
      req.fields = { description: 'Desc', price: 100, category: 'cat1', quantity: 10 };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Name is Required' });
    });

    // Wei Sheng, A0259272X
    it('should validate description field (required)', async () => {
      req.fields = { name: 'Product', price: 100, category: 'cat1', quantity: 10 };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Description is Required' });
    });

    // Wei Sheng, A0259272X
    it('should validate price field (required)', async () => {
      req.fields = { name: 'Product', description: 'Desc', category: 'cat1', quantity: 10 };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Price is Required' });
    });

    // Wei Sheng, A0259272X
    it('should validate category field (required)', async () => {
      req.fields = { name: 'Product', description: 'Desc', price: 100, quantity: 10 };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Category is Required' });
    });

    // Wei Sheng, A0259272X
    it('should validate quantity field (required)', async () => {
      req.fields = { name: 'Product', description: 'Desc', price: 100, category: 'cat1' };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Quantity is Required' });
    });

    // Wei Sheng, A0259272X
    it('should not accept photo of size exactly 1MB', async () => {
      req.fields = { name: 'Product', description: 'Desc', price: 100, category: 'cat1', quantity: 10 };
      req.files = { photo: { size: 1000000, path: '/tmp/photo.jpg', type: 'image/jpeg' } };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'photo is Required and should be less then 1mb'
      });
    });

    // Wei Sheng, A0259272X
    it('should accept photo less than 1MB (1000000 bytes)', async () => {
      req.fields = {
        name: 'Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };
      req.files = { photo: { size: 99999, path: '/tmp/photo.jpg', type: 'image/jpeg' } };

      mockProductSave.mockResolvedValueOnce(true);
      mockReadFileSync.mockReturnValue(Buffer.from('photo-data'));

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    }); 
  });

  describe('Product creation', () => {
    
    // Wei Sheng, A0259272X
    it('should create slug from name using slugify(name)', async () => {
      req.fields = {
        name: 'Test Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };

      mockProductSave.mockResolvedValueOnce(true);

      await createProductController(req, res);

      expect(mockSlugify).toHaveBeenCalledWith('Test Product');
    });

    // Wei Sheng, A0259272X
    it('should create product with all fields', async () => {
      req.fields = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        category: 'category123',
        quantity: 50,
        shipping: true
      };

      mockProductSave.mockResolvedValueOnce(true);

      await createProductController(req, res);

      expect(MockProductModel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Product',
          description: 'Test Description',
          price: 99.99,
          category: 'category123',
          quantity: 50,
          shipping: true,
          slug: 'test-product'
        })
      );
    });

    // Wei Sheng, A0259272X
    it('should save photo data when provided', async () => {
      req.fields = {
        name: 'Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };
      req.files = { photo: { size: 500000, path: '/tmp/photo.jpg', type: 'image/jpeg' } };

      const mockPhotoData = Buffer.from('photo-data');
      mockReadFileSync.mockReturnValue(mockPhotoData);
      mockProductSave.mockResolvedValueOnce(true);

      await createProductController(req, res);

      expect(mockReadFileSync).toHaveBeenCalledWith('/tmp/photo.jpg');
    });

    // Wei Sheng, A0259272X
    it('should not require photo for product creation', async () => {
      req.fields = {
        name: 'Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };
      req.files = {};

      mockProductSave.mockResolvedValueOnce(true);

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });
  });

  describe('Response handling', () => {
    
    // Wei Sheng, A0259272X
    it('should return 201 status on success', async () => {
      req.fields = {
        name: 'Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };

      mockProductSave.mockResolvedValueOnce(true);

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    // Wei Sheng, A0259272X
    it('should return correct response structure on success', async () => {
      req.fields = {
        name: 'Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };

      mockProductSave.mockResolvedValueOnce(true);

      await createProductController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Product Created Successfully',
        products: expect.any(Object)
      });
    });
  });

  describe('Error handling', () => {
    
    // Wei Sheng, A0259272X
    it('should handle errors and return 500 status', async () => {
      req.fields = {
        name: 'Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };

      mockProductSave.mockRejectedValueOnce(new Error('Database error'));

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        message: 'Error in creating product'
      });
    });
  });
});

// Wei Sheng, A0259272X
describe('deleteProductController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { pid: 'product123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('Product deletion', () => {

    // Wei Sheng, A0259272X
    it('should delete product by ID from req.params.pid', async () => {
      mockProductFindByIdAndDelete.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'product123' })
      });

      await deleteProductController(req, res);

      expect(mockProductFindByIdAndDelete).toHaveBeenCalledWith('product123');
    });

    // Wei Sheng, A0259272X
    it('should exclude photo from response using select("-photo")', async () => {
      const selectMock = jest.fn().mockResolvedValue({ _id: 'product123' });
      mockProductFindByIdAndDelete.mockReturnValue({ select: selectMock });

      await deleteProductController(req, res);

      expect(selectMock).toHaveBeenCalledWith('-photo');
    });
  });

  describe('Response handling', () => {

    // Wei Sheng, A0259272X
    it('should return 200 status on success with success message', async () => {
      mockProductFindByIdAndDelete.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'product123' })
      });

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Product Deleted successfully'
      });
    });

    // Wei Sheng, A0259272X
    it('should handle product not found (still returns success)', async () => {
      mockProductFindByIdAndDelete.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Product Deleted successfully'
      });
    });
  });

  describe('Error handling', () => {

    // Wei Sheng, A0259272X
    it('should handle database errors and return 500 status', async () => {
      mockProductFindByIdAndDelete.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error while deleting product',
        error: expect.any(Error)
      });
    });
  });
});

// Wei Sheng, A0259272X
describe('updateProductController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { pid: 'product123' },
      fields: {},
      files: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    jest.clearAllMocks();
    mockSlugify.mockImplementation((str) => str.toLowerCase().replace(/\s+/g, '-'));
  });

  describe('Validation', () => {

    // Wei Sheng, A0259272X
    it('should validate name field (required)', async () => {
      req.fields = { description: 'Desc', price: 100, category: 'cat1', quantity: 10 };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Name is Required' });
    });

    // Wei Sheng, A0259272X
    it('should validate description field (required)', async () => {
      req.fields = { name: 'Product', price: 100, category: 'cat1', quantity: 10 };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Description is Required' });
    });

    // Wei Sheng, A0259272X
    it('should validate price field (required)', async () => {
      req.fields = { name: 'Product', description: 'Desc', category: 'cat1', quantity: 10 };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Price is Required' });
    });

    // Wei Sheng, A0259272X
    it('should validate category field (required)', async () => {
      req.fields = { name: 'Product', description: 'Desc', price: 100, quantity: 10 };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Category is Required' });
    });

    // Wei Sheng, A0259272X
    it('should validate quantity field (required)', async () => {
      req.fields = { name: 'Product', description: 'Desc', price: 100, category: 'cat1' };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Quantity is Required' });
    });

    // Wei Sheng, A0259272X
    it('should validate photo size (max 1MB)', async () => {
      req.fields = { name: 'Product', description: 'Desc', price: 100, category: 'cat1', quantity: 10 };
      req.files = { photo: { size: 1000001, path: '/tmp/photo.jpg', type: 'image/jpeg' } };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'photo is Required and should be less than 1mb'
      });
    });

    // Wei Sheng, A0259272X
    it('should accept photo less than 1MB (1000000 bytes)', async () => {
      req.fields = {
        name: 'Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };
      req.files = { photo: { size: 999999, path: '/tmp/photo.jpg', type: 'image/jpeg' } };

      const mockProduct = {
        photo: { data: null, contentType: null },
        save: jest.fn().mockResolvedValue(true)
      };

      mockProductFindByIdAndUpdate.mockResolvedValueOnce(mockProduct);
      mockReadFileSync.mockReturnValue(Buffer.from('photo-data'));

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    }); 
  });

  describe('Product update', () => {

    // Wei Sheng, A0259272X
    it('should update product by ID from req.params.pid', async () => {
      req.fields = {
        name: 'Updated Product',
        description: 'Updated Desc',
        price: 200,
        category: 'cat1',
        quantity: 20
      };

      const mockProduct = {
        _id: 'product123',
        name: 'Updated Product',
        photo: { data: null, contentType: null },
        save: jest.fn().mockResolvedValue(true)
      };

      mockProductFindByIdAndUpdate.mockResolvedValueOnce(mockProduct);

      await updateProductController(req, res);

      expect(mockProductFindByIdAndUpdate).toHaveBeenCalledWith(
        'product123',
        expect.objectContaining({ name: 'Updated Product' }),
        { new: true }
      );
    });

    // Wei Sheng, A0259272X
    it('should update slug when name changes', async () => {
      req.fields = {
        name: 'New Product Name',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };

      const mockProduct = {
        _id: 'product123',
        name: 'New Product Name',
        slug: 'new-product-name',
        photo: { data: null, contentType: null },
        save: jest.fn().mockResolvedValue(true)
      };

      mockProductFindByIdAndUpdate.mockResolvedValueOnce(mockProduct);

      await updateProductController(req, res);

      expect(mockSlugify).toHaveBeenCalledWith('New Product Name');
      expect(mockProductFindByIdAndUpdate).toHaveBeenCalledWith(
        'product123',
        expect.objectContaining({ slug: 'new-product-name' }),
        { new: true }
      );
    });

    // Wei Sheng, A0259272X
    it('should update photo when new photo is provided', async () => {
      req.fields = {
        name: 'Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };
      req.files = { photo: { size: 500000, path: '/tmp/new-photo.jpg', type: 'image/png' } };

      const mockPhotoData = Buffer.from('new-photo-data');
      mockReadFileSync.mockReturnValue(mockPhotoData);

      const mockProduct = {
        _id: 'product123',
        photo: { data: null, contentType: null },
        save: jest.fn().mockResolvedValue(true)
      };

      mockProductFindByIdAndUpdate.mockResolvedValueOnce(mockProduct);

      await updateProductController(req, res);

      expect(mockReadFileSync).toHaveBeenCalledWith('/tmp/new-photo.jpg');
      expect(mockProduct.photo.data).toEqual(mockPhotoData);
      expect(mockProduct.photo.contentType).toBe('image/png');
    });

    // Wei Sheng, A0259272X
    it('should return updated product with { new: true }', async () => {
      req.fields = {
        name: 'Updated Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };

      const mockProduct = {
        _id: 'product123',
        name: 'Updated Product',
        photo: { data: null, contentType: null },
        save: jest.fn().mockResolvedValue(true)
      };

      mockProductFindByIdAndUpdate.mockResolvedValueOnce(mockProduct);

      await updateProductController(req, res);

      expect(mockProductFindByIdAndUpdate).toHaveBeenCalledWith(
        'product123',
        expect.any(Object),
        { new: true }
      );
    });
  });

  describe('Response handling', () => {

    // Wei Sheng, A0259272X
    it('should return 201 status with correct response structure on success', async () => {
      req.fields = {
        name: 'Updated Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };

      const mockProduct = {
        _id: 'product123',
        name: 'Updated Product',
        photo: { data: null, contentType: null },
        save: jest.fn().mockResolvedValue(true)
      };

      mockProductFindByIdAndUpdate.mockResolvedValueOnce(mockProduct);

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Product Updated Successfully',
        products: expect.any(Object)
      });
    });
  });

  describe('Error handling', () => {

    // Wei Sheng, A0259272X
    it('should handle product not found', async () => {
      req.fields = {
        name: 'Updated Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };

      mockProductFindByIdAndUpdate.mockResolvedValueOnce(null);

      await updateProductController(req, res);

      expect(mockProductFindByIdAndUpdate).toHaveBeenCalled();
    });

    // Wei Sheng, A0259272X
    it('should handle errors and return 500 status', async () => {
      req.fields = {
        name: 'Updated Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };

      mockProductFindByIdAndUpdate.mockRejectedValueOnce(new Error('Database error'));

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        message: 'Error in Update product'
      });
    });
  });
});
