//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and recommended testing methods like equivalence partitioning and boundary value analysis, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments like adjusting mocks and assertions, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from './cart';

describe('Cart Context - Logic & Persistence', () => {
  let store;

  beforeEach(() => {
    store = {};
    
    Storage.prototype.getItem = jest.fn((key) => store[key] || null);
    Storage.prototype.setItem = jest.fn((key, value) => {
      store[key] = value.toString();
    });
    Storage.prototype.removeItem = jest.fn((key) => {
      delete store[key];
    });
    Storage.prototype.clear = jest.fn(() => {
      store = {};
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    store = {};
  });

  describe('Initialization Logic', () => {
    
    test('Init 1: Should initialize with empty array if localStorage is null', () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      expect(result.current[0]).toEqual([]);
    });

    test('Init 2: Should initialize with data from localStorage', () => {
      store['cart'] = JSON.stringify([{ id: 1, name: 'Product' }]);
      
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      expect(result.current[0]).toHaveLength(1);
      expect(result.current[0][0].name).toBe('Product');
    });

    test('Init 3: Should handle corrupt JSON gracefully (No Crash)', () => {
      store['cart'] = 'INVALID_JSON_{{';
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      
      expect(result.current[0]).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Persistence Logic', () => {
    
    test('Persist 1: Updates should auto-save to localStorage', async () => {
      store['cart'] = JSON.stringify([]);
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

      act(() => {
        const [, setCart] = result.current;
        setCart([{ id: 1, name: 'New Item' }]);
      });

      await waitFor(() => {
        expect(store['cart']).toBe(JSON.stringify([{ id: 1, name: 'New Item' }]));
      });
    });

    test('Persist 2: Clearing cart should auto-save empty array', async () => {
      store['cart'] = JSON.stringify([{ id: 1 }]);
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

      act(() => {
        const [, setCart] = result.current;
        setCart([]);
      });

      await waitFor(() => {
        expect(store['cart']).toBe(JSON.stringify([]));
      });
    });
  });

  describe('Hook Behavior', () => {
    
    test('Hook 1: Should throw error if used outside Provider', () => {
      const originalError = console.error;
      console.error = jest.fn();

      try {
        const { result } = renderHook(() => useCart());
        expect(result.current).toBeUndefined();
      } catch (e) {
        expect(e).toBeDefined();
      }

      console.error = originalError;
    });
  });
});