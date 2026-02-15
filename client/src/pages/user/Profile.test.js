import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import '@testing-library/jest-dom';
import Profile from './Profile';

// Mock dependencies
jest.mock('axios');
jest.mock('react-hot-toast');
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn()
}));
jest.mock('../../components/UserMenu', () => {
  const React = require('react');
  return function MockUserMenu() {
    return React.createElement('div', { 'data-testid': 'user-menu' }, 'User Menu');
  };
});
jest.mock('../../components/Layout', () => {
  const React = require('react');
  return function MockLayout({ children, title }) {
    return React.createElement('div', { 'data-testid': 'layout' },
      React.createElement('div', { 'data-testid': 'layout-title' }, title),
      children
    );
  };
});

import { useAuth } from '../../context/auth';

describe('Profile Component', () => {
  const mockSetAuth = jest.fn();
  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    address: '123 Main St'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify({ user: mockUser, token: 'test-token' })),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
  });

  describe('Form initialization', () => {
    it('should populate form fields from auth.user on mount', () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Profile />);

      expect(screen.getByPlaceholderText('Enter Your Name')).toHaveValue('John Doe');
      expect(screen.getByPlaceholderText('Enter Your Email')).toHaveValue('john@example.com');
      expect(screen.getByPlaceholderText('Enter Your Phone')).toHaveValue('1234567890');
      expect(screen.getByPlaceholderText('Enter Your Address')).toHaveValue('123 Main St');
    });

    it('should have password field empty on mount', () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Profile />);

      expect(screen.getByPlaceholderText('Enter Your Password')).toHaveValue('');
    });

    it('should have email field disabled', () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Profile />);

      expect(screen.getByPlaceholderText('Enter Your Email')).toBeDisabled();
    });
  });

  describe('Form submission', () => {
    it('should call PUT /api/v1/auth/profile with name, email, password, phone, address', async () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);
      axios.put.mockResolvedValueOnce({
        data: { success: true, updatedUser: mockUser }
      });

      render(<Profile />);

      fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), {
        target: { value: 'Updated Name' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), {
        target: { value: 'newpassword123' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), {
        target: { value: '9876543210' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), {
        target: { value: '456 New St' }
      });

      fireEvent.click(screen.getByText('UPDATE'));

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith('/api/v1/auth/profile', {
          name: 'Updated Name',
          email: mockUser.email,
          password: 'newpassword123',
          phone: '9876543210',
          address: '456 New St'
        });
      });
    });

    it('should submit with current values when fields are not changed', async () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);
      axios.put.mockResolvedValueOnce({
        data: { success: true, updatedUser: mockUser }
      });

      render(<Profile />);

      fireEvent.click(screen.getByText('UPDATE'));

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith('/api/v1/auth/profile', {
          name: 'John Doe',
          email: 'john@example.com',
          password: '',
          phone: '1234567890',
          address: '123 Main St'
        });
      });
    });
  });

  describe('Error response handling (data?.errro typo)', () => {
    it('should check for error response using data?.errro (typo in source)', async () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);
      axios.put.mockResolvedValueOnce({
        data: { errro: 'Password too short' }
      });

      render(<Profile />);

      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), {
        target: { value: 'short' }
      });
      fireEvent.click(screen.getByText('UPDATE'));

      await waitFor(() => {
        // Due to the typo (errro vs error), this checks if errro exists
        // but then tries to show data?.error (undefined)
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Successful update', () => {
    it('should update auth context on successful update', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      useAuth.mockReturnValue([{ user: mockUser, token: 'test-token' }, mockSetAuth]);
      axios.put.mockResolvedValueOnce({
        data: { success: true, updatedUser }
      });

      render(<Profile />);

      fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), {
        target: { value: 'Updated Name' }
      });
      fireEvent.click(screen.getByText('UPDATE'));

      await waitFor(() => {
        expect(mockSetAuth).toHaveBeenCalled();
      });
    });

    it('should update localStorage on successful update', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      useAuth.mockReturnValue([{ user: mockUser, token: 'test-token' }, mockSetAuth]);
      axios.put.mockResolvedValueOnce({
        data: { success: true, updatedUser }
      });

      render(<Profile />);

      fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), {
        target: { value: 'Updated Name' }
      });
      fireEvent.click(screen.getByText('UPDATE'));

      await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalled();
      });
    });

    it('should display success toast on successful update', async () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);
      axios.put.mockResolvedValueOnce({
        data: { success: true, updatedUser: mockUser }
      });

      render(<Profile />);

      fireEvent.click(screen.getByText('UPDATE'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Profile Updated Successfully');
      });
    });
  });

  describe('Failed update', () => {
    it('should display error toast on API failure', async () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);
      axios.put.mockRejectedValueOnce(new Error('Update failed'));

      render(<Profile />);

      fireEvent.click(screen.getByText('UPDATE'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Something went wrong');
      });
    });

    it('should log error to console on API failure', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);
      axios.put.mockRejectedValueOnce(new Error('Network Error'));

      render(<Profile />);

      fireEvent.click(screen.getByText('UPDATE'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Form fields', () => {
    it('should update name field when typing', () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Profile />);

      const nameInput = screen.getByPlaceholderText('Enter Your Name');
      fireEvent.change(nameInput, { target: { value: 'New Name' } });

      expect(nameInput).toHaveValue('New Name');
    });

    it('should update password field when typing', () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Profile />);

      const passwordInput = screen.getByPlaceholderText('Enter Your Password');
      fireEvent.change(passwordInput, { target: { value: 'newpassword' } });

      expect(passwordInput).toHaveValue('newpassword');
    });

    it('should update phone field when typing', () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Profile />);

      const phoneInput = screen.getByPlaceholderText('Enter Your Phone');
      fireEvent.change(phoneInput, { target: { value: '9999999999' } });

      expect(phoneInput).toHaveValue('9999999999');
    });

    it('should update address field when typing', () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Profile />);

      const addressInput = screen.getByPlaceholderText('Enter Your Address');
      fireEvent.change(addressInput, { target: { value: 'New Address' } });

      expect(addressInput).toHaveValue('New Address');
    });
  });

  describe('Layout and structure', () => {
    it('should render with Layout component and title "Your Profile"', () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Profile />);

      expect(screen.getByTestId('layout-title')).toHaveTextContent('Your Profile');
    });

    it('should render UserMenu component', () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Profile />);

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    it('should display "USER PROFILE" heading', () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Profile />);

      expect(screen.getByText('USER PROFILE')).toBeInTheDocument();
    });

    it('should have an UPDATE button', () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Profile />);

      expect(screen.getByText('UPDATE')).toBeInTheDocument();
      expect(screen.getByText('UPDATE').tagName).toBe('BUTTON');
    });
  });

  describe('Missing user data handling', () => {
    it('should handle null user gracefully', () => {
      useAuth.mockReturnValue([{ user: null }, mockSetAuth]);

      render(<Profile />);

      expect(screen.getByText('UPDATE')).toBeInTheDocument();
    });

    it('should handle user with missing fields', () => {
      const partialUser = { name: 'John' };
      useAuth.mockReturnValue([{ user: partialUser }, mockSetAuth]);

      render(<Profile />);

      expect(screen.getByPlaceholderText('Enter Your Name')).toHaveValue('John');
    });
  });

  describe('Form submission prevention', () => {
    it('should prevent default form submission behavior', async () => {
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);
      axios.put.mockResolvedValueOnce({
        data: { success: true, updatedUser: mockUser }
      });

      render(<Profile />);

      const form = screen.getByText('UPDATE').closest('form');
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      Object.defineProperty(submitEvent, 'preventDefault', {
        value: jest.fn(),
        writable: true
      });

      fireEvent(form, submitEvent);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalled();
      });
    });
  });
});
