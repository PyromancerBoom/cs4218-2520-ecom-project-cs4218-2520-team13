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
const mockSave = jest.fn();

jest.mock('../models/userModel.js', () => {
    const fn = jest.fn().mockImplementation(() => ({
        save: mockSave
    }));
    fn.findByIdAndUpdate = mockUserFindByIdAndUpdate;
    fn.findByIdAndDelete = mockUserFindByIdAndDelete;
    fn.findOne = mockUserFindOne;
    return fn;
});

// Priyansh Bimbisariye, A0265903B
const mockComparePassword = jest.fn();
const mockHashPassword = jest.fn();
jest.mock('./../helpers/authHelper.js', () => ({
    comparePassword: mockComparePassword,
    hashPassword: mockHashPassword
}));

const mockJwtSign = jest.fn();
jest.mock('jsonwebtoken', () => ({
    sign: mockJwtSign
}));

const { updateRoleController, deleteUserController, testController, loginController, registerController, forgotPasswordController } = require('./authController.js');


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
            message: 'Email is not registered',
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
    // cft - exception path
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

// Priyansh Bimbisariye, A0265903B
describe('registerController', () => {
    let req, res;

    const validBody = {
        name: 'Jane Snow',
        email: 'jane@example.com',
        password: 'securePass123',
        phone: '91234568',
        address: 'Kent Ridge',
        answer: 'mango',
    };

    beforeEach(() => {
        req = { body: { ...validBody } };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (name)
    // expected: 'message' key so frontend can catch it
    it('should return message when name is not provided', async () => {
        // arrange
        req.body = { ...validBody, name: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: 'Name is Required' });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (email)
    it('should return message when email is not provided', async () => {
        // arrange
        req.body = { ...validBody, email: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: 'Email is Required' });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (password)
    it('should return message when password is not provided', async () => {
        // arrange
        req.body = { ...validBody, password: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: 'Password is Required' });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (phone)
    it('should return message when phone is not provided', async () => {
        // arrange
        req.body = { ...validBody, phone: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: 'Phone no is Required' });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (address)
    it('should return message when address is not provided', async () => {
        // arrange
        req.body = { ...validBody, address: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: 'Address is Required' });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - missing required field (answer)
    it('should return message when answer is not provided', async () => {
        // arrange
        req.body = { ...validBody, answer: undefined };

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: 'Answer is Required' });
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - duplicate user partition
    it('should return 200 with success false when user already exists', async () => {
        // arrange
        mockUserFindOne.mockResolvedValue({ _id: 'existing_user' });

        // act
        await registerController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Already Register please login',
        }));
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - valid partition (happy path)
    // verifies 201 status, success flag, and user object in response
    it('should register user successfully and return 201', async () => {
        // arrange
        const savedUser = { ...validBody, _id: 'new_user_001', password: 'hashedPass' };
        mockUserFindOne.mockResolvedValue(null);
        mockHashPassword.mockResolvedValue('hashedPass');
        mockSave.mockResolvedValue(savedUser);

        // act
        await registerController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: 'User Registered Successfully',
            user: savedUser,
        }));
    });

    // Priyansh Bimbisariye, A0265903B
    // resilience - database error on save
    // cft - exception path
    it('should return 500 when a database error occurs during save', async () => {
        // arrange
        mockUserFindOne.mockResolvedValue(null);
        mockHashPassword.mockResolvedValue('hashedPass');
        mockSave.mockRejectedValue(new Error('DB write failed'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // act
        await registerController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Error in Registration',
        }));
        consoleSpy.mockRestore();
    });

    // Priyansh Bimbisariye, A0265903B
    // bva - zero input boundary
    // empty body should trigger first validation guard
    it('should return message when body is empty', async () => {
        // arrange
        req.body = {};

        // act
        await registerController(req, res);

        // assert ,  no explicit status set, implicit 200
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({ message: 'Name is Required' });
    });
});

// Priyansh Bimbisariye, A0265903B
describe('forgotPasswordController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                email: 'jane@example.com',
                answer: 'random_answer',
                newPassword: 'newSecurePass123'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - invalid partition (missing email)
    it('should return 400 when email is missing', async () => {
        // arrange
        delete req.body.email;

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: 'Email is required' });
        expect(res.send).toHaveBeenCalledTimes(1);
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - invalid partition (missing answer)
    it('should return 400 when answer is missing', async () => {
        // arrange
        delete req.body.answer;

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: 'answer is required' });
        expect(res.send).toHaveBeenCalledTimes(1);
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - invalid partition (missing newPassword)
    it('should return 400 when newPassword is missing', async () => {
        // arrange
        delete req.body.newPassword;

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: 'New Password is required' });
        expect(res.send).toHaveBeenCalledTimes(1);
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - non-existent user partition
    // mock findOne to return null
    it('should return 404 when email or answer is incorrect', async () => {
        // arrange
        mockUserFindOne.mockResolvedValue(null);

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Wrong Email Or Answer'
        }));
    });

    // Priyansh Bimbisariye, A0265903B
    // ep - valid partition (successful reset)
    // mocks user found, hash success, update success
    // state-based verification
    it('should reset password successfully and return 200', async () => {
        // arrange
        const mockUser = { _id: 'user_123', email: 'jane@example.com' };
        mockUserFindOne.mockResolvedValue(mockUser);
        mockHashPassword.mockResolvedValue('hashedNewPass');
        mockUserFindByIdAndUpdate.mockResolvedValue({});

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(mockUserFindOne).toHaveBeenCalledWith({ email: 'jane@example.com', answer: 'random_answer' });
        expect(mockHashPassword).toHaveBeenCalledWith('newSecurePass123');
        expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith('user_123', { password: 'hashedNewPass' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: 'Password Reset Successfully'
        }));
    });

    // Priyansh Bimbisariye, A0265903B
    // resilience - database error / exception path
    it('should return 500 when something goes wrong', async () => {
        // arrange
        mockUserFindOne.mockRejectedValue(new Error('DB Error'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // act
        await forgotPasswordController(req, res);

        // assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Something went wrong'
        }));
        consoleSpy.mockRestore();
    });
});