jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    Schema: jest.fn(),
    model: jest.fn(),
    ObjectId: jest.fn()
  },
  Schema: jest.fn(),
  model: jest.fn()
}));

jest.mock('fs', () => {
  const readFileSync = jest.fn();
  return { __esModule: true, default: { readFileSync }, readFileSync };
});

jest.mock('slugify', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../models/productModel.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../models/categoryModel.js', () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));

jest.mock('../models/orderModel.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('braintree', () => ({
  __esModule: true,
  default: {
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      clientToken: { generate: jest.fn() },
      transaction: { sale: jest.fn() }
    })),
    Environment: { Sandbox: 'sandbox' }
  }
}));

jest.mock('dotenv', () => ({
  __esModule: true,
  default: { config: jest.fn() }
}));

const { createProductController, deleteProductController, updateProductController } = require('./productController.js');

const MockProductModel = require('../models/productModel.js').default;
const mockReadFileSync = require('fs').readFileSync;
const mockSlugify = require('slugify').default;

// Mock save function shared across all product instances
const mockProductSave = jest.fn();
const mockProductFindByIdAndUpdate = jest.fn();
const mockProductFindByIdAndDelete = jest.fn();

MockProductModel.mockImplementation((data) => ({
  ...data,
  photo: { data: null, contentType: null },
  save: mockProductSave
}));
MockProductModel.findByIdAndUpdate = mockProductFindByIdAndUpdate;
MockProductModel.findByIdAndDelete = mockProductFindByIdAndDelete;

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
    MockProductModel.mockImplementation((data) => ({
      ...data,
      photo: { data: null, contentType: null },
      save: mockProductSave
    }));
    MockProductModel.findByIdAndUpdate = mockProductFindByIdAndUpdate;
    MockProductModel.findByIdAndDelete = mockProductFindByIdAndDelete;
  });

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
        error: 'photo is Required and should be less than 1mb'
      });
    });

    // Wei Sheng, A0259272X
    it('should accept photo less than 1MB (999999 bytes boundary)', async () => {
      req.fields = {
        name: 'Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };
      req.files = { photo: { size: 999999, path: '/tmp/photo.jpg', type: 'image/jpeg' } };

      mockProductSave.mockResolvedValueOnce(true);
      mockReadFileSync.mockReturnValue(Buffer.from('photo-data'));

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockReadFileSync).toHaveBeenCalledWith('/tmp/photo.jpg');
    });

    // Wei Sheng, A0259272X
    it('should not access the database when required fields are missing', async () => {
      req.fields = {};

      await createProductController(req, res);

      expect(MockProductModel).not.toHaveBeenCalled();
      expect(mockProductSave).not.toHaveBeenCalled();
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

      const productInstance = MockProductModel.mock.results[0].value;
      expect(mockReadFileSync).toHaveBeenCalledWith('/tmp/photo.jpg');
      expect(productInstance.photo.data).toEqual(mockPhotoData);
      expect(productInstance.photo.contentType).toBe('image/jpeg');
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
    it('should return 201 status with correct response structure on success', async () => {
      req.fields = {
        name: 'Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };

      mockProductSave.mockResolvedValueOnce(true);

      await createProductController(req, res);

      expect(mockProductSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
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
    MockProductModel.findByIdAndDelete = mockProductFindByIdAndDelete;
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
    MockProductModel.findByIdAndUpdate = mockProductFindByIdAndUpdate;
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

    // Wei Sheng, A0259272X
    it('should not access the database when required fields are missing', async () => {
      req.fields = {};

      await updateProductController(req, res);

      expect(mockProductFindByIdAndUpdate).not.toHaveBeenCalled();
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
    it('should handle product not found and return 500', async () => {
      req.fields = {
        name: 'Updated Product',
        description: 'Desc',
        price: 100,
        category: 'cat1',
        quantity: 10
      };

      mockProductFindByIdAndUpdate.mockResolvedValueOnce(null);

      await updateProductController(req, res);

      // When findByIdAndUpdate returns null, products.save() throws TypeError
      // which is caught and returned as a 500 error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        message: 'Error in Update product'
      });
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
