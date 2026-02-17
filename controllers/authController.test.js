const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('mongoose', () => ({
    Schema: jest.fn(),
    model: jest.fn(),
    default: {
        Schema: jest.fn(),
        model: jest.fn()
    }
}));

const mockUserFindByIdAndUpdate = jest.fn();
const mockUserFindByIdAndDelete = jest.fn();

jest.mock('../models/userModel.js', () => ({
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
    findByIdAndDelete: mockUserFindByIdAndDelete
}));

const { updateRoleController, deleteUserController } = require('./authController.js');

//LOU,YING-WEN A0338250J
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

            expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith('user_123', { role: 1 }, { new: true });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should correctly exclude password from the result', async () => {
            const selectMock = jest.fn().mockResolvedValue({});
            mockUserFindByIdAndUpdate.mockReturnValue({ select: selectMock });

            await updateRoleController(req, res);

            expect(selectMock).toHaveBeenCalledWith("-password");
        });
    });

    describe('Error handling & Edge cases', () => {
        it('should return 200 even if user to update is not found', async () => {
            const selectMock = jest.fn().mockResolvedValue(null);
            mockUserFindByIdAndUpdate.mockReturnValue({ select: selectMock });

            await updateRoleController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ user: null }));
        });

        it('should return 500 when database error occurs', async () => {
            const dbError = new Error('DB Error');
            mockUserFindByIdAndUpdate.mockImplementation(() => { throw dbError; });
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            await updateRoleController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(consoleSpy).toHaveBeenCalledWith(dbError);
            consoleSpy.mockRestore();
        });
    });
});
//LOU,YING-WEN A0338250J
describe('deleteUserController', () => {
    let req, res;

    beforeEach(() => {
        req = { params: { id: 'user_999' } };
        res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        jest.clearAllMocks();
    });

    describe('Success path', () => {
        it('should delete user and return 200', async () => {
            const mockDeletedUser = { _id: 'user_999', name: 'Deleted User' };
            const selectMock = jest.fn().mockResolvedValue(mockDeletedUser);
            mockUserFindByIdAndDelete.mockReturnValue({ select: selectMock });

            await deleteUserController(req, res);

            expect(mockUserFindByIdAndDelete).toHaveBeenCalledWith('user_999');
            expect(selectMock).toHaveBeenCalledWith("-password");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
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