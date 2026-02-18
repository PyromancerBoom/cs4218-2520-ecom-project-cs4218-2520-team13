jest.mock('mongoose', () => {
  const Schema = jest.fn().mockImplementation((config, options) => ({ config, options }));
  const model = jest.fn().mockImplementation((name, schema) => ({ modelName: name, schema }));
  const ObjectId = {};
  return {
    __esModule: true,
    default: { Schema, model, ObjectId },
    Schema,
    model,
    ObjectId,
  };
});

require('./orderModel.js');

const mongoose = require('mongoose').default;
const capturedSchemaConfig = mongoose.Schema.mock.calls[0][0];
const capturedSchemaOptions = mongoose.Schema.mock.calls[0][1];
const MockObjectId = mongoose.ObjectId;
const mockModel = mongoose.model;

describe('orderModel Schema Definition', () => {
  describe('Products field', () => {

    // Wei Sheng, A0259272X
    it('should define products as an array', () => {
      expect(Array.isArray(capturedSchemaConfig.products)).toBe(true);
    });

    // Wei Sheng, A0259272X
    it('should define products array items with type ObjectId', () => {
      expect(capturedSchemaConfig.products[0].type).toBe(MockObjectId);
    });

    // Wei Sheng, A0259272X
    it('should reference "Products" collection', () => {
      expect(capturedSchemaConfig.products[0].ref).toBe('Products');
    });
  });

  describe('Payment field', () => {

    // Wei Sheng, A0259272X
    it('should define payment as an object type ({})', () => {
      expect(capturedSchemaConfig.payment).toEqual({});
    });
  });

  describe('Buyer field', () => {

    // Wei Sheng, A0259272X
    it('should define buyer with type ObjectId', () => {
      expect(capturedSchemaConfig.buyer.type).toBe(MockObjectId);
    });


    // Wei Sheng, A0259272X
    it('should reference "users" collection', () => {
      expect(capturedSchemaConfig.buyer.ref).toBe('users');
    });
  });

  describe('Status field', () => {

    // Wei Sheng, A0259272X
    it('should define status with String type', () => {
      expect(capturedSchemaConfig.status.type).toBe(String);
    });

    // Wei Sheng, A0259272X
    it('should set default status to "Not Process"', () => {
      expect(capturedSchemaConfig.status.default).toBe('Not Process');
    });

    // Wei Sheng, A0259272X
    it('should define enum with valid status values', () => {
      expect(capturedSchemaConfig.status.enum).toEqual([
        'Not Process',
        'Processing',
        'Shipped',
        'delivered',
        'cancel'
      ]);
    });
  });

  describe('Schema options', () => {

    // Wei Sheng, A0259272X
    it('should enable timestamps', () => {
      expect(capturedSchemaOptions).toEqual({ timestamps: true });
    });
  });

  describe('Model registration', () => {

    // Wei Sheng, A0259272X
    it('should register model with name "Order"', () => {
      expect(mockModel).toHaveBeenCalledWith('Order', expect.any(Object));
    });
  });

  describe('Default values', () => {

    // Wei Sheng, A0259272X
    it('should NOT have default values for products', () => {
      expect(capturedSchemaConfig.products[0].default).toBeUndefined();
    });

    // Wei Sheng, A0259272X
    it('should NOT have default values for payment', () => {
      expect(capturedSchemaConfig.payment.default).toBeUndefined();
    });

    // Wei Sheng, A0259272X
    it('should NOT have default values for buyer', () => {
      expect(capturedSchemaConfig.buyer.default).toBeUndefined();
    });
  });
});
