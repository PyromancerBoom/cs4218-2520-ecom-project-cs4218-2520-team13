import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Store the schema configuration passed to mongoose.Schema
let capturedSchemaConfig = null;
let capturedSchemaOptions = null;

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
    model: mockModel
  },
  Schema: MockSchema,
  model: mockModel
}));

// Import the model to trigger schema creation
await import('./userModel.js');

describe('userModel Schema Definition', () => {
  describe('Schema fields', () => {
    it('should define name field with required: true and trim: true', () => {
      expect(capturedSchemaConfig.name).toEqual({
        type: String,
        required: true,
        trim: true
      });
    });

    it('should define email field with required: true and unique: true', () => {
      expect(capturedSchemaConfig.email).toEqual({
        type: String,
        required: true,
        unique: true
      });
    });

    it('should define password field with required: true', () => {
      expect(capturedSchemaConfig.password).toEqual({
        type: String,
        required: true
      });
    });

    it('should define phone field with required: true', () => {
      expect(capturedSchemaConfig.phone).toEqual({
        type: String,
        required: true
      });
    });

    it('should define address field with required: true and type: {}', () => {
      expect(capturedSchemaConfig.address).toEqual({
        type: {},
        required: true
      });
    });

    it('should define answer field with required: true', () => {
      expect(capturedSchemaConfig.answer).toEqual({
        type: String,
        required: true
      });
    });

    it('should define role field with default: 0', () => {
      expect(capturedSchemaConfig.role).toEqual({
        type: Number,
        default: 0
      });
    });
  });

  describe('Schema options', () => {
    it('should enable timestamps', () => {
      expect(capturedSchemaOptions).toEqual({ timestamps: true });
    });
  });

  describe('Model registration', () => {
    it('should register model with name "users"', () => {
      expect(mockModel).toHaveBeenCalledWith('users', expect.any(Object));
    });
  });

  describe('Field type verification', () => {
    it('should use String type for name', () => {
      expect(capturedSchemaConfig.name.type).toBe(String);
    });

    it('should use String type for email', () => {
      expect(capturedSchemaConfig.email.type).toBe(String);
    });

    it('should use String type for password', () => {
      expect(capturedSchemaConfig.password.type).toBe(String);
    });

    it('should use String type for phone', () => {
      expect(capturedSchemaConfig.phone.type).toBe(String);
    });

    it('should use Object type for address (type: {})', () => {
      expect(capturedSchemaConfig.address.type).toEqual({});
    });

    it('should use String type for answer', () => {
      expect(capturedSchemaConfig.answer.type).toBe(String);
    });

    it('should use Number type for role', () => {
      expect(capturedSchemaConfig.role.type).toBe(Number);
    });
  });

  describe('Required field validation', () => {
    it('should require name field', () => {
      expect(capturedSchemaConfig.name.required).toBe(true);
    });

    it('should require email field', () => {
      expect(capturedSchemaConfig.email.required).toBe(true);
    });

    it('should require password field', () => {
      expect(capturedSchemaConfig.password.required).toBe(true);
    });

    it('should require phone field', () => {
      expect(capturedSchemaConfig.phone.required).toBe(true);
    });

    it('should require address field', () => {
      expect(capturedSchemaConfig.address.required).toBe(true);
    });

    it('should require answer field', () => {
      expect(capturedSchemaConfig.answer.required).toBe(true);
    });

    it('should NOT require role field (has default)', () => {
      expect(capturedSchemaConfig.role.required).toBeUndefined();
    });
  });

  describe('Unique constraint', () => {
    it('should enforce unique constraint on email', () => {
      expect(capturedSchemaConfig.email.unique).toBe(true);
    });

    it('should NOT enforce unique constraint on name', () => {
      expect(capturedSchemaConfig.name.unique).toBeUndefined();
    });
  });

  describe('Default values', () => {
    it('should set default role to 0 (regular user)', () => {
      expect(capturedSchemaConfig.role.default).toBe(0);
    });
  });

  describe('String transformations', () => {
    it('should trim whitespace from name field', () => {
      expect(capturedSchemaConfig.name.trim).toBe(true);
    });

    it('should NOT trim email field', () => {
      expect(capturedSchemaConfig.email.trim).toBeUndefined();
    });
  });
});
