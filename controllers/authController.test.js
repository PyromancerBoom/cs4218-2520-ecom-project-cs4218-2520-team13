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
const mockUserFindOne = jest.fn();

jest.mock('../models/userModel.js', () => ({
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
    findByIdAndDelete: mockUserFindByIdAndDelete,
    findOne: mockUserFindOne
}));

// Priyansh Bimbisariye, A0265903B
const mockComparePassword = jest.fn();
jest.mock('./../helpers/authHelper.js', () => ({
    comparePassword: mockComparePassword
}));

const mockJwtSign = jest.fn();
jest.mock('jsonwebtoken', () => ({
    sign: mockJwtSign
}));

const { updateRoleController, deleteUserController, testController, loginController } = require('./authController.js');


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
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            await updateRoleController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Error while updating role',
            }));
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

        //LOU,YING-WEN A0338250J
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

        //LOU,YING-WEN A0338250J
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

// Priyansh Bimbisariye, A0265903B
describe('testController', () => {
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    it('should send "Protected Routes" on success', () => {
        testController(req, res);

        expect(res.send).toHaveBeenCalledTimes(1);
        expect(res.send).toHaveBeenCalledWith('Protected Routes');
    });

    // Priyansh Bimbisariye, A0265903B
    it('should propagate the error if res.send throws', () => {
        const error = new Error('send failed');
        res.send.mockImplementation(() => {
            throw error;
        });

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        expect(() => testController(req, res)).toThrow('send failed');
        expect(consoleSpy).toHaveBeenCalledWith(error);
        consoleSpy.mockRestore();
    });
});

// Priyansh Bimbisariye, A0265903B
describe('loginController', () => {
    let req, res;

    const mockUser = {
        _id: 'user_001',
        name: 'John Snow',
        email: 'john@example.com',
        phone: '91234567',
        address: '123 Street',
        role: 0,
        password: 'hashedPassword123',
    };

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        process.env.JWT_SECRET = 'test-secret';
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    // ep partition- missing required field (email) should reject with 404
    it('should return 404 when email is not provided', async () => {
        // arrange
        req.body = { password: 'password123' };

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Invalid email or password',
        }));
    });

    // Priyansh Bimbisariye, A0265903B
    // ep partition- missing required field (password) should reject with 404
    it('should return 404 when password is not provided', async () => {
        // arrange
        req.body = { email: 'john@example.com' };

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Invalid email or password',
        }));
    });

    // Priyansh Bimbisariye, A0265903B
    // ep partition - non-existent user, email not registered
    it('should return 404 when user is not found', async () => {
        // arrange
        req.body = { email: 'iqhdqhdlqwhljk@example.com', password: 'lqdhiqwudhoi2i27' };
        mockUserFindOne.mockResolvedValue(null); // db returns no user

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Email is not registerd',
        }));
    });

    // Priyansh Bimbisariye, A0265903B
    // ep partition - wrong credential
    // password does not match
    it('should return 200 with success false when password is incorrect', async () => {
        // arrange
        req.body = { email: 'john@example.com', password: 'wrongpassword' };
        mockUserFindOne.mockResolvedValue(mockUser);
        mockComparePassword.mockResolvedValue(false);

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Invalid Password',
        }));
    });

    // Priyansh Bimbisariye, A0265903B
    // ep partition - valid partition
    // successful login returns user info and token
    it('should return 200 with user and token on successful login', async () => {
        // arrange
        req.body = { email: 'john@example.com', password: 'correctpassword' };
        mockUserFindOne.mockResolvedValue(mockUser); // user exists
        mockComparePassword.mockResolvedValue(true); // passwrod matches
        mockJwtSign.mockResolvedValue('mocked-jwt-token'); // token generated

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: 'login successfully',
            token: 'mocked-jwt-token',
            user: {
                _id: mockUser._id,
                name: mockUser.name,
                email: mockUser.email,
                phone: mockUser.phone,
                address: mockUser.address,
                role: mockUser.role,
            },
        }));
    });

    // Priyansh Bimbisariye, A0265903B
    // system should fail gracefully, not crash
    it('should return 500 when a database error occurs', async () => {
        // arrange
        req.body = { email: 'john@example.com', password: 'password123' };
        mockUserFindOne.mockRejectedValue(new Error('DB connection lost'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // act
        await loginController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Error in login',
        }));
        consoleSpy.mockRestore();
    });
});