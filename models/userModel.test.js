jest.mock('mongoose', () => {
  const Schema = jest.fn().mockImplementation((config, options) => ({ config, options }));
  const model = jest.fn().mockImplementation((name, schema) => ({ modelName: name, schema }));
  return {
    __esModule: true,
    default: { Schema, model },
    Schema,
    model,
  };
});

require('./userModel.js');

const mongoose = require('mongoose').default;
const capturedSchemaConfig = mongoose.Schema.mock.calls[0][0];
const capturedSchemaOptions = mongoose.Schema.mock.calls[0][1];
const mockModel = mongoose.model;

describe('userModel Schema Definition', () => {
  describe('Schema fields', () => {
    // Wei Sheng, A0259272X
    it('should define name field with required: true and trim: true', () => {
      expect(capturedSchemaConfig.name).toEqual({
        type: String,
        required: true,
        trim: true
      });
    });

    // Wei Sheng, A0259272X
    it('should define email field with type String, required: true and unique: true', () => {
      expect(capturedSchemaConfig.email).toEqual({
        type: String,
        required: true,
        unique: true
      });
    });

    // Wei Sheng, A0259272X
    it('should define password field with type String and required: true', () => {
      expect(capturedSchemaConfig.password).toEqual({
        type: String,
        required: true
      });
    });

    // Wei Sheng, A0259272X
    it('should define phone field with type String and required: true', () => {
      expect(capturedSchemaConfig.phone).toEqual({
        type: String,
        required: true
      });
    });

    // Wei Sheng, A0259272X
    it('should define address field with type {} and required: true', () => {
      expect(capturedSchemaConfig.address).toEqual({
        type: {},
        required: true
      });
    });

    // Wei Sheng, A0259272X
    it('should define answer field with type String and required: true', () => {
      expect(capturedSchemaConfig.answer).toEqual({
        type: String,
        required: true
      });
    });

    // Wei Sheng, A0259272X
    it('should define role field with type Number and default: 0', () => {
      expect(capturedSchemaConfig.role).toEqual({
        type: Number,
        default: 0
      });
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
    it('should register model with name "users"', () => {
      expect(mockModel).toHaveBeenCalledWith('users', expect.any(Object));
    });
  });

  describe('Unique constraint', () => {

    // Wei Sheng, A0259272X
    it('should enforce unique constraint on email', () => {
      expect(capturedSchemaConfig.email.unique).toBe(true);
    });

    // Wei Sheng, A0259272X
    it('should NOT enforce unique constraint on name', () => {
      expect(capturedSchemaConfig.name.unique).toBeUndefined();
    });
  });

  describe('String transformations', () => {

    // Wei Sheng, A0259272X
    it('should trim whitespace from name field', () => {
      expect(capturedSchemaConfig.name.trim).toBe(true);
    });

    // Wei Sheng, A0259272X
    it('should NOT trim email field', () => {
      expect(capturedSchemaConfig.email.trim).toBeUndefined();
    });
  });
});
