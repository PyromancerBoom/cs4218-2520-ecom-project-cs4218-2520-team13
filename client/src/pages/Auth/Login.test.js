import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Login from './Login';

// Mocking axios.post
jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
}));

// Mock useCategory to prevent TypeError from unmocked axios.get
jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia = window.matchMedia || function () {
  return {
    matches: false,
    addListener: function () { },
    removeListener: function () { }
  };
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form', () => {
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText('LOGIN FORM')).toBeInTheDocument();
    expect(getByPlaceholderText('Enter Your Email')).toBeInTheDocument();
    expect(getByPlaceholderText('Enter Your Password')).toBeInTheDocument();
  });
  it('inputs should be initially empty', () => {
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText('LOGIN FORM')).toBeInTheDocument();
    expect(getByPlaceholderText('Enter Your Email').value).toBe('');
    expect(getByPlaceholderText('Enter Your Password').value).toBe('');
  });

  it('should allow typing email and password', () => {
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
    expect(getByPlaceholderText('Enter Your Email').value).toBe('test@example.com');
    expect(getByPlaceholderText('Enter Your Password').value).toBe('password123');
  });

  // Priyansh Bimbisariye, A0265903B
  // updated spec: toast must show the server's message, not undefined
  // added msg in arrange accordignly.
  it('should login the user successfully', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Login successful',
        user: { id: 1, name: 'John Doe', email: 'test@example.com' },
        token: 'mockToken'
      }
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
    fireEvent.click(getByText('LOGIN'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Login successful', {
      duration: 5000,
      icon: '🙏',
      style: {
        background: 'green',
        color: 'white'
      }
    });
  });

  it('should display error message on failed login', async () => {
    axios.post.mockRejectedValueOnce({ message: 'Invalid credentials' });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
    fireEvent.click(getByText('LOGIN'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('Something went wrong');
  });

  // Priyansh Bimbisariye, A0265903B
  // ep - server failure partition
  // server returns HTTP 200 but success: false
  // separate branch from an axios rejection
  it('should show server error message when login fails with success false', async () => {
    // arrange
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: 'Invalid credentials' }
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    // act
    fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
    fireEvent.click(getByText('LOGIN'));

    // assert
    // the component must forward the server message, not a hardcoded string
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid credentials'));
    expect(toast.success).not.toHaveBeenCalled();
    // no auth data should be saved on failure
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  // Priyansh Bimbisariye, A0265903B
  // state-based testing
  // initial state (unauthenticated on /login)
  // action (login)
  // new state (authenticated on /)
  it('should persist auth data to localStorage and redirect to home on successful login', async () => {
    // arrange
    const mockResponse = {
      data: {
        success: true,
        message: 'Login successful',
        user: { id: 1, name: 'John Doe', email: 'test@example.com' },
        token: 'mockToken'
      }
    };
    axios.post.mockResolvedValueOnce(mockResponse);

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // act
    fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
    fireEvent.click(getByText('LOGIN'));

    // assert
    await waitFor(() => expect(getByText('Home Page')).toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith('Login successful', expect.any(Object));
    expect(localStorage.setItem).toHaveBeenCalledWith('auth', JSON.stringify(mockResponse.data));
  });

  // Priyansh Bimbisariye, A0265903B
  // ep - user interaction partition - forgot password button is a type="button"
  // its only behavior is navigation, no api call should ever happen
  // state-based
  // initial state on /login then click then state on /forgot-password
  it('should navigate to forgot-password page when Forgot Password is clicked', () => {
    // arrange
    const { getByText } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // act
    fireEvent.click(getByText('Forgot Password'));

    // assert
    expect(getByText('Forgot Password Page')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });
});
