const { describe, it, expect, beforeEach } = require('@jest/globals');

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

jest.mock('../models/userModel.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock('../models/orderModel.js', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn()
  }
}));

jest.mock('../helpers/authHelper.js', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn()
  }
}));

const { updateProfileController, getOrdersController, getAllOrdersController, orderStatusController, updateRoleController, deleteUserController, getAllUsersController } = require('./authController.js');

const mockUserModel = require('../models/userModel.js').default;
const mockUserFind = mockUserModel.find;
const mockUserFindById = mockUserModel.findById;
const mockUserFindByIdAndUpdate = mockUserModel.findByIdAndUpdate;
const mockUserFindByIdAndDelete = mockUserModel.findByIdAndDelete;

const mockOrderModel = require('../models/orderModel.js').default;
const mockOrderFind = mockOrderModel.find;
const mockOrderFindByIdAndUpdate = mockOrderModel.findByIdAndUpdate;

const mockAuthHelper = require('../helpers/authHelper.js');
const mockHashPassword = mockAuthHelper.hashPassword;

let consoleLogSpy;

beforeAll(() => {
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  consoleLogSpy.mockRestore();
});

// Wei Sheng, A0259272X
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

  describe('Field updates', () => {

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
    it('should fall back to existing value when a field is an empty string', async () => {
      req.body = { name: '' };
      const mockUser = { _id: 'user123', name: 'Original Name', password: 'hashed' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

      await updateProfileController(req, res);

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({ name: 'Original Name' }),
        { new: true }
      );
    });

    // Wei Sheng, A0259272X
    it('should update multiple fields simultaneously', async () => {
      req.body = { name: 'New Name', phone: '9999999999', address: '789 New Ave' };
      const mockUser = { _id: 'user123', name: 'Old', phone: '1111111111', address: '111 Old St', password: 'hashed' };
      const updatedUser = { ...mockUser, name: 'New Name', phone: '9999999999', address: '789 New Ave' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

      await updateProfileController(req, res);

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          name: 'New Name',
          phone: '9999999999',
          address: '789 New Ave'
        }),
        { new: true }
      );
    });
  });

  describe('Password updates', () => {

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
    it('should reject password shorter than 6 characters', async () => {
      req.body = { password: 'ab' };

      await updateProfileController(req, res);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Password is required and 6 character long'
      });
      expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
    });

    // Wei Sheng, A0259272X
    it('should reject password with exactly 5 characters (boundary)', async () => {
      req.body = { password: '12345' };

      await updateProfileController(req, res);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Password is required and 6 character long'
      });
      expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
    });

    // Wei Sheng, A0259272X
    it('should accept password with exactly 6 characters', async () => {
      req.body = { password: '123456' };
      const mockUser = { _id: 'user123', password: 'oldhashed' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockHashPassword.mockResolvedValueOnce('newhashed');
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

      await updateProfileController(req, res);

      expect(mockHashPassword).toHaveBeenCalledWith('123456');
    });

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
    it('should return 200 status on success', async () => {
      req.body = { name: 'Updated Name' };
      const mockUser = { _id: 'user123', name: 'Old Name', password: 'hashed' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(mockUser);

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    // Wei Sheng, A0259272X
    it('should return correct response structure: { success: true, message, updatedUser }', async () => {
      req.body = { name: 'Updated Name' };
      const mockUser = { _id: 'user123', name: 'Old Name', password: 'hashed' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

      await updateProfileController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Profile Updated Successfully',
        updatedUser
      });
    });

    // note this: this is not a bug, it is a feature.
    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
    it('should handle database errors and return 400 status', async () => {
      req.body = { name: 'Updated Name' };
      mockUserFindById.mockRejectedValueOnce(new Error('Database error'));

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Update Profile',
        error: expect.any(Error)
      });
    });

    // Wei Sheng, A0259272X
    it('should handle findByIdAndUpdate errors', async () => {
      req.body = { name: 'Updated Name' };
      const mockUser = { _id: 'user123', name: 'Old', password: 'hashed' };

      mockUserFindById.mockResolvedValueOnce(mockUser);
      mockUserFindByIdAndUpdate.mockRejectedValueOnce(new Error('Update failed'));

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    // Wei Sheng, A0259272X
    it('should return 400 when user is not found (findById returns null)', async () => {
      req.body = { name: 'Updated Name' };
      mockUserFindById.mockResolvedValueOnce(null);

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Update Profile',
        error: expect.any(Error)
      });
    });
  });
});

// Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
    it('should filter orders by buyer: req.user._id', async () => {
      const mockOrders = [{ _id: 'order1', buyer: 'user123', products: [] }];
      const populateMock2 = jest.fn().mockResolvedValue(mockOrders);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getOrdersController(req, res);

      expect(mockOrderFind).toHaveBeenCalledWith({ buyer: 'user123' });
    });

    // Wei Sheng, A0259272X
    it('should populate products field (excluding photo)', async () => {
      const mockOrders = [{ _id: 'order1', buyer: 'user123', products: [] }];
      const populateMock2 = jest.fn().mockResolvedValue(mockOrders);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getOrdersController(req, res);

      expect(populateMock1).toHaveBeenCalledWith('products', '-photo');
    });

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
    it('should handle user with no orders (returns empty array)', async () => {
      const populateMock2 = jest.fn().mockResolvedValue([]);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getOrdersController(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('Error handling', () => {

    // Wei Sheng, A0259272X
    it('should handle database errors and return 500 status', async () => {
      const populateMock2 = jest.fn().mockRejectedValue(new Error('Database error'));
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Getting Orders',
        error: expect.any(Error)
      });
    });
  });
});

// Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
    it('should sort orders by createdAt: "-1" (newest first)', async () => {
      const mockOrders = [{ _id: 'order1', buyer: 'user1', products: [] }];
      const sortMock = jest.fn().mockResolvedValue(mockOrders);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getAllOrdersController(req, res);

      expect(sortMock).toHaveBeenCalledWith({ createdAt: '-1' });
    });

    // Wei Sheng, A0259272X
    it('should populate products field (excluding photo)', async () => {
      const mockOrders = [{ _id: 'order1', buyer: 'user1', products: [] }];
      const sortMock = jest.fn().mockResolvedValue(mockOrders);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getAllOrdersController(req, res);

      expect(populateMock1).toHaveBeenCalledWith('products', '-photo');
    });

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
    it('should return orders as JSON', async () => {
      const mockOrders = [{ _id: 'order1' }, { _id: 'order2' }];
      const sortMock = jest.fn().mockResolvedValue(mockOrders);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getAllOrdersController(req, res);

      expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    // Wei Sheng, A0259272X
    it('should return empty array when no orders exist', async () => {
      const sortMock = jest.fn().mockResolvedValue([]);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getAllOrdersController(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('Error handling', () => {

    // Wei Sheng, A0259272X
    it('should handle database errors and return 500 status', async () => {
      const sortMock = jest.fn().mockRejectedValue(new Error('Database error'));
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });

      mockOrderFind.mockReturnValue({ populate: populateMock1 });

      await getAllOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Getting Orders',
        error: expect.any(Error)
      });
    });
  });
});

// Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
    it('should return updated order as JSON response', async () => {
      const updatedOrder = { _id: 'order123', status: 'Processing' };
      mockOrderFindByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

      await orderStatusController(req, res);

      expect(res.json).toHaveBeenCalledWith(updatedOrder);
    });
  });

  describe('Edge cases', () => {

    // Wei Sheng, A0259272X
    it('should handle order not found (returns null)', async () => {
      mockOrderFindByIdAndUpdate.mockResolvedValueOnce(null);

      await orderStatusController(req, res);

      expect(res.json).toHaveBeenCalledWith(null);
    });

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
    it('should handle database errors and return 500 status', async () => {
      mockOrderFindByIdAndUpdate.mockRejectedValueOnce(new Error('Database error'));

      await orderStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Updating Order',
        error: expect.any(Error)
      });
    });
  });
});

describe('authController Management Tests', () => {
    let req, res, consoleSpy;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('updateRoleController', () => {
        beforeEach(() => {
            req = {
                params: { id: 'user_123' },
                body: { role: 1 },
            };
        });

        describe('Success path', () => {

            //LOU,YING-WEN A0338250J
            it('should update user role successfully', async () => {
                const mockUser = { _id: 'user_123', name: 'John', role: 1 };
                const selectMock = jest.fn().mockResolvedValue(mockUser);
                mockUserFindByIdAndUpdate.mockReturnValue({ select: selectMock });

                await updateRoleController(req, res);

                expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith('user_123', { role: 1 }, { new: true });
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            });

            //LOU,YING-WEN A0338250J
            it('should correctly exclude password from the result', async () => {
                const selectMock = jest.fn().mockResolvedValue({});
                mockUserFindByIdAndUpdate.mockReturnValue({ select: selectMock });

                await updateRoleController(req, res);

                expect(selectMock).toHaveBeenCalledWith("-password");
            });
        });

        describe('Error handling & Edge cases', () => {

            //LOU,YING-WEN A0338250J
            it('should return 200 even if user to update is not found', async () => {
                const selectMock = jest.fn().mockResolvedValue(null);
                mockUserFindByIdAndUpdate.mockReturnValue({ select: selectMock });

                await updateRoleController(req, res);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ user: null }));
            });

            //LOU,YING-WEN A0338250J
            it('should return 500 when database error occurs', async () => {
                const dbError = new Error('DB Error');
                mockUserFindByIdAndUpdate.mockImplementation(() => { throw dbError; });

                await updateRoleController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                    success: false,
                    message: 'Error while updating role',
                }));
                expect(consoleSpy).toHaveBeenCalledWith(dbError);
            });
        });
    });
    //LOU,YING-WEN A0338250J
    describe('deleteUserController', () => {
        beforeEach(() => {
            req = { params: { id: 'user_999' } };
        });

        describe('Success path', () => {

            //LOU,YING-WEN A0338250J
            it('should delete user and return 200', async () => {
                const mockDeletedUser = { _id: 'user_999', name: 'Deleted User' };
                const selectMock = jest.fn().mockResolvedValue(mockDeletedUser);
                mockUserFindByIdAndDelete.mockReturnValue({ select: selectMock });

                await deleteUserController(req, res);

                expect(mockUserFindByIdAndDelete).toHaveBeenCalledWith('user_999');
                expect(selectMock).toHaveBeenCalledWith("-password");
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                    success: true,
                    message: "User Deleted Successfully"
                }));
            });
        });

        describe('Error handling', () => {

            //LOU,YING-WEN A0338250J
            it('should return 500 on database failure', async () => {
                const dbError = new Error('Delete Failed');
                mockUserFindByIdAndDelete.mockImplementation(() => { throw dbError; });

                await deleteUserController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                    success: false,
                    message: 'Error while deleting user',
                }));
                expect(consoleSpy).toHaveBeenCalledWith(dbError);
            });
        });
    });

    describe('getAllUsersController', () => {
        beforeEach(() => {
            req = {};
        });

        describe('Success path', () => {
            //LOU,YING-WEN A0338250J
            it('should get all users successfully and exclude password', async () => {
                const mockUsers = [
                    { _id: '1', name: 'User 1', email: 'u1@test.com' },
                    { _id: '2', name: 'User 2', email: 'u2@test.com' }
                ];
                const selectMock = jest.fn().mockResolvedValue(mockUsers);
                mockUserFind.mockReturnValue({ select: selectMock });

                await getAllUsersController(req, res);

                expect(mockUserFind).toHaveBeenCalledWith({});
                expect(selectMock).toHaveBeenCalledWith("-password");
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "All Users List",
                    users: mockUsers,
                });
            });
        });

        describe('Error handling', () => {
            //LOU,YING-WEN A0338250J
            it('should return 500 when database error occurs during fetch', async () => {
                const dbError = new Error('Fetch Failed');

                mockUserFind.mockImplementation(() => { throw dbError; });
                await getAllUsersController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                    success: false,
                    message: "Error while getting all users",
                }));
                expect(consoleSpy).toHaveBeenCalledWith(dbError);
            });
        });
    });
});