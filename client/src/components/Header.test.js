//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and recommended testing methods like equivalence partitioning and boundary value analysis, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments like adjusting mocks and assertions, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../context/auth';
import { useCart } from '../context/cart';
import useCategory from '../hooks/useCategory';
import toast from 'react-hot-toast';

jest.mock('../context/auth');
jest.mock('../context/cart');
jest.mock('../hooks/useCategory');
jest.mock('react-hot-toast');
jest.mock('./Form/SearchInput', () => () => <div data-testid="search-input" />);
jest.mock('antd', () => ({
  Badge: ({ count, children }) => <div data-testid="badge">{count}{children}</div>
}));

const renderHeader = () => render(<BrowserRouter><Header /></BrowserRouter>);

describe('Header Component Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCart.mockReturnValue([[]]); 
    useCategory.mockReturnValue([]);
    toast.success = jest.fn();
  });

  describe('Authentication Partitions', () => {
    test('Guest View: Shows Login/Register, hides Logout/UserDropdown', () => {
      useAuth.mockReturnValue([{ user: null }, jest.fn()]);
      renderHeader();

      expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login');
      expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register');
      expect(screen.queryByText(/logout/i)).not.toBeInTheDocument();
    });

    test('Authenticated View: Shows User Name/Logout, hides Login/Register', () => {
      useAuth.mockReturnValue([{ user: { name: 'Aashim', role: 0 } }, jest.fn()]);
      renderHeader();

      expect(screen.getByText('Aashim')).toBeInTheDocument();
      expect(screen.getByText(/logout/i)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /login/i })).not.toBeInTheDocument();
    });
  });

  describe('Role-Based Dashboard Routing', () => {
    test('Role 0 (User): Navigates to /dashboard/user', () => {
      useAuth.mockReturnValue([{ user: { name: 'User', role: 0 } }, jest.fn()]);
      renderHeader();
      const links = screen.getAllByText(/dashboard/i);
      expect(links[0].closest('a')).toHaveAttribute('href', '/dashboard/user');
    });

    test('Role 1 (Admin): Navigates to /dashboard/admin', () => {
      useAuth.mockReturnValue([{ user: { name: 'Admin', role: 1 } }, jest.fn()]);
      renderHeader();
      const links = screen.getAllByText(/dashboard/i);
      expect(links[0].closest('a')).toHaveAttribute('href', '/dashboard/admin');
    });
  });

  describe('Dynamic Data (Cart & Categories)', () => {
    test('Cart Badge: Displays correct count', () => {
      useAuth.mockReturnValue([{ user: null }, jest.fn()]);
      useCart.mockReturnValue([ [1, 2, 3] ]);
      
      renderHeader();
      expect(screen.getByTestId('badge')).toHaveTextContent('3');
    });

    test('Categories: Renders list dynamically from hook', () => {
      useAuth.mockReturnValue([{ user: null }, jest.fn()]);
      useCategory.mockReturnValue([
        { _id: '1', name: 'Tech', slug: 'tech' },
        { _id: '2', name: 'Food', slug: 'food' }
      ]);

      renderHeader();
      expect(screen.getByRole('link', { name: /tech/i })).toHaveAttribute('href', '/category/tech');
      expect(screen.getByRole('link', { name: /food/i })).toHaveAttribute('href', '/category/food');
    });
  });

  test('Logout Action: Clears state and localstorage', () => {
    const setAuth = jest.fn();
    useAuth.mockReturnValue([{ user: { name: 'User' } }, setAuth]);
    const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

    renderHeader();
    fireEvent.click(screen.getByText(/logout/i));

    expect(removeItemSpy).toHaveBeenCalledWith('auth');
    expect(setAuth).toHaveBeenCalledWith({ user: null, token: '' });
    expect(toast.success).toHaveBeenCalledWith("Logout Successfully");
  });
});