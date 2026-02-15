import { jest, describe, it, expect } from '@jest/globals';

// Store the schema configuration passed to mongoose.Schema
let capturedSchemaConfig = null;
let capturedSchemaOptions = null;

// Create a mock ObjectId for comparison
const MockObjectId = Symbol('ObjectId');

// Mock mongoose Schema constructor to capture the schema definition
const MockSchema = jest.fn().mockImplementation((config, options) => {
  capturedSchemaConfig = config;
  capturedSchemaOptions = options;
  return { config, options };
});

// Mock mongoose model function
const mockModel = jest.fn().mockImplementation((name, schema) => {
  return { modelName: name, schema };
});

await jest.unstable_mockModule('mongoose', () => ({
  default: {
    Schema: MockSchema,
    model: mockModel,
    ObjectId: MockObjectId
  },
  Schema: MockSchema,
  model: mockModel,
  ObjectId: MockObjectId
}));

// Import the model to trigger schema creation
await import('./orderModel.js');

describe('orderModel Schema Definition', () => {
  describe('Products field', () => {
    it('should define products as an array', () => {
      expect(Array.isArray(capturedSchemaConfig.products)).toBe(true);
    });

    it('should define products array items with type ObjectId', () => {
      expect(capturedSchemaConfig.products[0].type).toBe(MockObjectId);
    });

    it('should reference "Products" collection', () => {
      expect(capturedSchemaConfig.products[0].ref).toBe('Products');
    });
  });

  describe('Payment field', () => {
    it('should define payment as an object type ({})', () => {
      expect(capturedSchemaConfig.payment).toEqual({});
    });
  });

  describe('Buyer field', () => {
    it('should define buyer with type ObjectId', () => {
      expect(capturedSchemaConfig.buyer.type).toBe(MockObjectId);
    });

    it('should reference "users" collection', () => {
      expect(capturedSchemaConfig.buyer.ref).toBe('users');
    });
  });

  describe('Status field', () => {
    it('should define status with String type', () => {
      expect(capturedSchemaConfig.status.type).toBe(String);
    });

    it('should set default status to "Not Process"', () => {
      expect(capturedSchemaConfig.status.default).toBe('Not Process');
    });

    it('should define enum with valid status values', () => {
      expect(capturedSchemaConfig.status.enum).toEqual([
        'Not Process',
        'Processing',
        'Shipped',
        'deliverd',
        'cancel'
      ]);
    });

    it('should include "Not Process" in enum', () => {
      expect(capturedSchemaConfig.status.enum).toContain('Not Process');
    });

    it('should include "Processing" in enum', () => {
      expect(capturedSchemaConfig.status.enum).toContain('Processing');
    });

    it('should include "Shipped" in enum', () => {
      expect(capturedSchemaConfig.status.enum).toContain('Shipped');
    });

    it('should include "deliverd" in enum (note: typo in original)', () => {
      expect(capturedSchemaConfig.status.enum).toContain('deliverd');
    });

    it('should include "cancel" in enum', () => {
      expect(capturedSchemaConfig.status.enum).toContain('cancel');
    });

    it('should NOT include invalid status values', () => {
      expect(capturedSchemaConfig.status.enum).not.toContain('Pending');
      expect(capturedSchemaConfig.status.enum).not.toContain('Completed');
      expect(capturedSchemaConfig.status.enum).not.toContain('Delivered');
    });
  });

  describe('Schema options', () => {
    it('should enable timestamps', () => {
      expect(capturedSchemaOptions).toEqual({ timestamps: true });
    });
  });

  describe('Model registration', () => {
    it('should register model with name "Order"', () => {
      expect(mockModel).toHaveBeenCalledWith('Order', expect.any(Object));
    });
  });

  describe('Reference relationships', () => {
    it('should have products referencing Products model', () => {
      expect(capturedSchemaConfig.products[0].ref).toBe('Products');
    });

    it('should have buyer referencing users model', () => {
      expect(capturedSchemaConfig.buyer.ref).toBe('users');
    });
  });

  describe('Status validation behavior', () => {
    const validStatuses = ['Not Process', 'Processing', 'Shipped', 'deliverd', 'cancel'];
    const invalidStatuses = ['Invalid', 'Pending', 'Completed', 'Done', ''];

    validStatuses.forEach(status => {
      it(`should accept valid status: "${status}"`, () => {
        expect(capturedSchemaConfig.status.enum).toContain(status);
      });
    });

    invalidStatuses.forEach(status => {
      it(`should reject invalid status: "${status}"`, () => {
        expect(capturedSchemaConfig.status.enum).not.toContain(status);
      });
    });
  });

  describe('Default values', () => {
    it('should have "Not Process" as the default status', () => {
      expect(capturedSchemaConfig.status.default).toBe('Not Process');
    });

    it('should NOT have default values for products', () => {
      expect(capturedSchemaConfig.products[0].default).toBeUndefined();
    });

    it('should NOT have default values for payment', () => {
      expect(capturedSchemaConfig.payment.default).toBeUndefined();
    });

    it('should NOT have default values for buyer', () => {
      expect(capturedSchemaConfig.buyer.default).toBeUndefined();
    });
  });

  describe('Timestamps functionality', () => {
    it('should automatically add createdAt field via timestamps option', () => {
      expect(capturedSchemaOptions.timestamps).toBe(true);
    });

    it('should automatically add updatedAt field via timestamps option', () => {
      expect(capturedSchemaOptions.timestamps).toBe(true);
    });
  });

  describe('Enum count', () => {
    it('should have exactly 5 status options', () => {
      expect(capturedSchemaConfig.status.enum).toHaveLength(5);
    });
  });
});
