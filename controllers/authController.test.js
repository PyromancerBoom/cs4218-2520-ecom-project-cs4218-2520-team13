import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';

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

// Mock userModel
const mockUserFindById = jest.fn();
const mockUserFindByIdAndUpdate = jest.fn();
const mockUserFindOne = jest.fn();

await jest.unstable_mockModule('../models/userModel.js', () => ({
  default: {
    findById: mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
    findOne: mockUserFindOne
  }
}));

// Mock orderModel
const mockOrderFind = jest.fn();
const mockOrderFindByIdAndUpdate = jest.fn();

await jest.unstable_mockModule('../models/orderModel.js', async () => {
  const actual = await jest.importActual('../models/orderModel.js');
  return {
    ...actual,
    default: {
      find: mockOrderFind,
      findByIdAndUpdate: mockOrderFindByIdAndUpdate
    }
  };
});

// Mock authHelper
const mockHashPassword = jest.fn();
const mockComparePassword = jest.fn();

await jest.unstable_mockModule('../helpers/authHelper.js', () => ({
  hashPassword: mockHashPassword,
  comparePassword: mockComparePassword
}));

// Mock jsonwebtoken (used at module level in authController, but not needed for these tests)
await jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn()
  }
}));

// Import after mocking
const { updateProfileController, getOrdersController, getAllOrdersController, orderStatusController } = await import('./authController.js');
const { ORDER_STATUSES } = await import('../models/orderModel.js');

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
});

describe('updateProfileController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: 'user123' },
      body: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should require authentication (uses req.user._id from requireSignIn middleware)', async () => {
      req.body = { name: 'Test' };
      const mockUser = { _id: 'user123', name: 'Old', password: 'hashed' };
      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

      await updateProfileController(req, res);

      expect(mockUserFindById).toHaveBeenCalledWith('user123');
    });
  });

  describe('Field updates', () => {
    it('should update name from req.body.name', async () => {
      req.body = { name: 'Updated Name' };
      const mockUser = { _id: 'user123', name: 'Old Name', password: 'hashed' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

      await updateProfileController(req, res);

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({ name: 'Updated Name' }),
        { new: true }
      );
    });

    it('should update phone from req.body.phone', async () => {
      req.body = { phone: '9876543210' };
      const mockUser = { _id: 'user123', phone: '1234567890', password: 'hashed' };
      const updatedUser = { ...mockUser, phone: '9876543210' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

      await updateProfileController(req, res);

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({ phone: '9876543210' }),
        { new: true }
      );
    });

    it('should update address from req.body.address', async () => {
      req.body = { address: '456 New St' };
      const mockUser = { _id: 'user123', address: '123 Old St', password: 'hashed' };
      const updatedUser = { ...mockUser, address: '456 New St' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

      await updateProfileController(req, res);

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({ address: '456 New St' }),
        { new: true }
      );
    });

    it('should keep existing values when fields are not provided', async () => {
      req.body = {};
      const mockUser = {
        _id: 'user123',
        name: 'Original Name',
        phone: '1234567890',
        address: '123 Main St',
        password: 'hashed'
      };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

      await updateProfileController(req, res);

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          name: 'Original Name',
          phone: '1234567890',
          address: '123 Main St'
        }),
        { new: true }
      );
    });
  });

  describe('Password updates', () => {
    it('should update password when provided and length >= 6 (hashes password)', async () => {
      req.body = { password: 'newpass123' };
      const mockUser = { _id: 'user123', password: 'oldhashed' };
      const updatedUser = { ...mockUser, password: 'newhashed' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockHashPassword.mockResolvedValueOnce('newhashed');
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

      await updateProfileController(req, res);

      expect(mockHashPassword).toHaveBeenCalledWith('newpass123');
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({ password: 'newhashed' }),
        { new: true }
      );
    });

    it('should validate password length (returns error when password provided but length < 6)', async () => {
      req.body = { password: 'short' };

      await updateProfileController(req, res);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Passsword is required and 6 character long'
      });
      expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should reject password with exactly 5 characters', async () => {
      req.body = { password: '12345' };

      await updateProfileController(req, res);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Passsword is required and 6 character long'
      });
    });

    it('should accept password with exactly 6 characters', async () => {
      req.body = { password: '123456' };
      const mockUser = { _id: 'user123', password: 'oldhashed' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockHashPassword.mockResolvedValueOnce('newhashed');
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

      await updateProfileController(req, res);

      expect(mockHashPassword).toHaveBeenCalledWith('123456');
    });

    it('should keep existing password when no new password is provided', async () => {
      req.body = { name: 'New Name' };
      const mockUser = { _id: 'user123', name: 'Old', password: 'existinghashed' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

      await updateProfileController(req, res);

      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({ password: 'existinghashed' }),
        { new: true }
      );
    });
  });

  describe('Response handling', () => {
    it('should return 200 status on success', async () => {
      req.body = { name: 'Updated Name' };
      const mockUser = { _id: 'user123', name: 'Old Name', password: 'hashed' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return correct response structure: { success: true, message, updatedUser }', async () => {
      req.body = { name: 'Updated Name' };
      const mockUser = { _id: 'user123', name: 'Old Name', password: 'hashed' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

      await updateProfileController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Profile Updated SUccessfully',
        updatedUser
      });
    });

    // note this: this is not a bug, it is a feature.
    it('should not update email even when provided in request body', async () => {
      req.body = { name: 'Updated Name', email: 'newemail@example.com' };
      const mockUser = { _id: 'user123', name: 'Old Name', email: 'original@example.com', password: 'hashed' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

      await updateProfileController(req, res);

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({ email: expect.anything() }),
        expect.anything()
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors and return 400 status', async () => {
      req.body = { name: 'Updated Name' };
      mockUserFindById.mockRejectedValueOnce(new Error('Database error'));

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error WHile Update profile',
        error: expect.any(Error)
      });
    });

    it('should handle findByIdAndUpdate errors', async () => {
      req.body = { name: 'Updated Name' };
      const mockUser = { _id: 'user123', name: 'Old', password: 'hashed' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockRejectedValueOnce(new Error('Update failed'));

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

describe('getOrdersController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: 'user123' }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('Query and population', () => {
    it('should filter orders by buyer: req.user._id', async () => {
      const mockOrders = [{ _id: 'order1', buyer: 'user123', products: [] }];
      const populateMock2 = jest.fn().mockResolvedValue(mockOrders);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getOrdersController(req, res);

      expect(mockOrderFind).toHaveBeenCalledWith({ buyer: 'user123' });
    });

    it('should populate products field (excluding photo)', async () => {
      const mockOrders = [{ _id: 'order1', buyer: 'user123', products: [] }];
      const populateMock2 = jest.fn().mockResolvedValue(mockOrders);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getOrdersController(req, res);

      expect(populateMock1).toHaveBeenCalledWith('products', '-photo');
    });

    it('should populate buyer field with name only', async () => {
      const mockOrders = [{ _id: 'order1', buyer: { name: 'John Doe' }, products: [] }];
      const populateMock2 = jest.fn().mockResolvedValue(mockOrders);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getOrdersController(req, res);

      expect(populateMock2).toHaveBeenCalledWith('buyer', 'name');
    });
  });

  describe('Response handling', () => {
    it('should return orders as JSON array', async () => {
      const mockOrders = [
        { _id: 'order1', buyer: 'user123', products: [] },
        { _id: 'order2', buyer: 'user123', products: [] }
      ];
      const populateMock2 = jest.fn().mockResolvedValue(mockOrders);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getOrdersController(req, res);

      expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    it('should handle user with no orders (returns empty array)', async () => {
      const populateMock2 = jest.fn().mockResolvedValue([]);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getOrdersController(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors and return 500 status', async () => {
      const populateMock2 = jest.fn().mockRejectedValue(new Error('Database error'));
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error WHile Geting Orders',
        error: expect.any(Error)
      });
    });
  });
});

describe('getAllOrdersController', () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('Query and population', () => {
    it('should return all orders (no buyer filter)', async () => {
      const mockOrders = [
        { _id: 'order1', buyer: 'user1', products: [] },
        { _id: 'order2', buyer: 'user2', products: [] }
      ];
      const sortMock = jest.fn().mockResolvedValue(mockOrders);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getAllOrdersController(req, res);

      expect(mockOrderFind).toHaveBeenCalledWith({});
    });

    it('should sort orders by createdAt: "-1" (newest first)', async () => {
      const mockOrders = [{ _id: 'order1', buyer: 'user1', products: [] }];
      const sortMock = jest.fn().mockResolvedValue(mockOrders);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getAllOrdersController(req, res);

      expect(sortMock).toHaveBeenCalledWith({ createdAt: '-1' });
    });

    it('should populate products field (excluding photo)', async () => {
      const mockOrders = [{ _id: 'order1', buyer: 'user1', products: [] }];
      const sortMock = jest.fn().mockResolvedValue(mockOrders);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getAllOrdersController(req, res);

      expect(populateMock1).toHaveBeenCalledWith('products', '-photo');
    });

    it('should populate buyer field with name', async () => {
      const mockOrders = [{ _id: 'order1', buyer: { name: 'John Doe' }, products: [] }];
      const sortMock = jest.fn().mockResolvedValue(mockOrders);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getAllOrdersController(req, res);

      expect(populateMock2).toHaveBeenCalledWith('buyer', 'name');
    });
  });

  describe('Response handling', () => {
    it('should return orders as JSON', async () => {
      const mockOrders = [{ _id: 'order1' }, { _id: 'order2' }];
      const sortMock = jest.fn().mockResolvedValue(mockOrders);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getAllOrdersController(req, res);

      expect(res.json).toHaveBeenCalledWith(mockOrders);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors and return 500 status', async () => {
      const sortMock = jest.fn().mockRejectedValue(new Error('Database error'));
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getAllOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error WHile Geting Orders',
        error: expect.any(Error)
      });
    });
  });
});

describe('orderStatusController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { orderId: 'order123' },
      body: { status: 'Processing' }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('Order update', () => {
    it('should update order by ID from req.params.orderId', async () => {
      const updatedOrder = { _id: 'order123', status: 'Processing' };
      mockOrderFindByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

      await orderStatusController(req, res);

      expect(mockOrderFindByIdAndUpdate).toHaveBeenCalledWith(
        'order123',
        { status: 'Processing' },
        { new: true }
      );
    });

    it('should update status from req.body.status', async () => {
      req.body.status = 'Shipped';
      const updatedOrder = { _id: 'order123', status: 'Shipped' };
      mockOrderFindByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

      await orderStatusController(req, res);

      expect(mockOrderFindByIdAndUpdate).toHaveBeenCalledWith(
        'order123',
        { status: 'Shipped' },
        { new: true }
      );
    });

    it('should return updated order with { new: true }', async () => {
      const updatedOrder = { _id: 'order123', status: 'Processing' };
      mockOrderFindByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

      await orderStatusController(req, res);

      expect(mockOrderFindByIdAndUpdate).toHaveBeenCalledWith(
        'order123',
        { status: 'Processing' },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedOrder);
    });
  });

  describe('Status validation', () => {
    it.each(ORDER_STATUSES)('should accept valid status: %s', async (status) => {
      req.body.status = status;
      const updatedOrder = { _id: 'order123', status };
      mockOrderFindByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

      await orderStatusController(req, res);

      expect(mockOrderFindByIdAndUpdate).toHaveBeenCalledWith(
        'order123',
        { status },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedOrder);
    });
  });

  describe('Edge cases', () => {
    it('should handle order not found (returns null)', async () => {
      mockOrderFindByIdAndUpdate.mockResolvedValueOnce(null);

      await orderStatusController(req, res);

      expect(res.json).toHaveBeenCalledWith(null);
    });

    it('should pass status value to database unchanged', async () => {
      req.body.status = 'InvalidStatus';
      mockOrderFindByIdAndUpdate.mockResolvedValueOnce(null);

      await orderStatusController(req, res);

      expect(mockOrderFindByIdAndUpdate).toHaveBeenCalledWith(
        'order123',
        { status: 'InvalidStatus' },
        { new: true }
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors and return 500 status', async () => {
      mockOrderFindByIdAndUpdate.mockRejectedValueOnce(new Error('Database error'));

      await orderStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Updateing Order',
        error: expect.any(Error)
      });
    });
  });
});
