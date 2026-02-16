import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// 1. Mock mongoose
await jest.unstable_mockModule('mongoose', () => ({
    default: {
        Schema: jest.fn(),
        model: jest.fn(),
        ObjectId: jest.fn()
    },
    Schema: jest.fn(),
    model: jest.fn()
}));

// 2. Mock userModel 函式
const mockUserFindByIdAndUpdate = jest.fn();
const mockUserFindByIdAndDelete = jest.fn();

await jest.unstable_mockModule('../models/userModel.js', () => ({
    default: {
        findByIdAndUpdate: mockUserFindByIdAndUpdate,
        findByIdAndDelete: mockUserFindByIdAndDelete
    }
}));

// 3. 在 Mock 之後導入 Controller
const { updateRoleController, deleteUserController } = await import('./authController.js');

describe('updateRoleController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { id: 'user_123' },
            body: { role: 1 },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe('Success path', () => {
        it('should update user role successfully', async () => {
            const mockUser = { _id: 'user_123', name: 'John', role: 1 };
            const selectMock = jest.fn().mockResolvedValue(mockUser);
            mockUserFindByIdAndUpdate.mockReturnValue({ select: selectMock });

            await updateRoleController(req, res);

            expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
                'user_123',
                { role: 1 },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('Error handling', () => {
        it('should return 500 when database error occurs', async () => {
            const dbError = new Error('DB Error');
            mockUserFindByIdAndUpdate.mockImplementation(() => { throw dbError; });
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            await updateRoleController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
            expect(consoleSpy).toHaveBeenCalledWith(dbError);

            consoleSpy.mockRestore();
        });
    });
});

describe('deleteUserController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { id: 'user_999' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe('Success path', () => {
        it('should delete user and return 200', async () => {
            const mockDeletedUser = { _id: 'user_999', name: 'Deleted User' };
            const selectMock = jest.fn().mockResolvedValue(mockDeletedUser);
            mockUserFindByIdAndDelete.mockReturnValue({ select: selectMock });

            await deleteUserController(req, res);

            expect(mockUserFindByIdAndDelete).toHaveBeenCalledWith('user_999');
            expect(selectMock).toHaveBeenCalledWith('-password');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'User Deleted Successfully',
                user: mockDeletedUser,
            });
        });
    });

    describe('Error handling', () => {
        it('should return 500 on database failure', async () => {
            const dbError = new Error('Delete Failed');
            mockUserFindByIdAndDelete.mockImplementation(() => { throw dbError; });
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            await deleteUserController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Error while deleting user',
            }));

            consoleSpy.mockRestore();
        });
    });
});