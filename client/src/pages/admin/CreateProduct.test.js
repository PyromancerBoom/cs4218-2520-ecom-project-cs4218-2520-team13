import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import CreateProduct from './CreateProduct';

// Mock dependencies
jest.mock('axios');
jest.mock('react-hot-toast');
jest.mock('./../../components/Layout', () => ({ children, title }) => (
    <div data-testid="layout">
        {title}
        {children}
    </div>
));
jest.mock('./../../components/AdminMenu', () => () => <div data-testid="admin-menu" />);

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

jest.mock('antd', () => {
    const React = require('react');
    const Select = ({ children, onChange, placeholder, value }) => (
        <select
            data-testid="ant-select"
            onChange={(e) => onChange(e.target.value)}
            value={value || ''}
            aria-label={placeholder}
        >
            <option value="">{placeholder}</option>
            {children}
        </select>
    );
    Select.Option = ({ value, children }) => <option value={value}>{children}</option>;
    return { Select };
});

// Priyansh Bimbisariye, A0265903B
describe('CreateProduct Component', () => {
    let mockAppend;

    beforeEach(() => {
        jest.clearAllMocks();

        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');

        mockAppend = jest.fn();
        jest.spyOn(global.FormData.prototype, 'append').mockImplementation(mockAppend);

        axios.get.mockResolvedValue({ data: { success: true, category: [] } });
        axios.post.mockResolvedValue({ data: { success: false } });
    });

    const renderComponentAndWait = async () => {
        render(
            <MemoryRouter>
                <CreateProduct />
            </MemoryRouter>
        );
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
        });
    };

    // Priyansh Bimbisariye, A0265903B
    describe('Initial State and Category Loading', () => {

        // Priyansh Bimbisariye, A0265903B
        it('should load categories on mount and populate dropdown', async () => {
            // arrange
            axios.get.mockResolvedValueOnce({
                data: { success: true, category: [{ _id: '1', name: 'Electronics' }] }
            });

            // act
            await renderComponentAndWait();

            // assert
            expect(await screen.findByText('Electronics')).toBeInTheDocument();
            const selects = screen.getAllByTestId('ant-select');
            expect(selects[0]).toBeInTheDocument();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle empty categories array', async () => {
            // arrange
            axios.get.mockResolvedValueOnce({
                data: { success: true, category: [] }
            });

            // act
            await renderComponentAndWait();

            // assert
            const selects = screen.getAllByTestId('ant-select');
            expect(selects[0]).toBeInTheDocument();
            expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
            expect(screen.getByText('Select a category')).toBeInTheDocument();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle category loading error', async () => {
            // arrange
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            axios.get.mockRejectedValueOnce(new Error('Network error'));

            // act
            await renderComponentAndWait();

            // assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting category");
            });
            consoleSpy.mockRestore();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should render empty form with all required fields', async () => {
            // act
            await renderComponentAndWait();

            // assert
            expect(screen.getByPlaceholderText('Write a name')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Write a description')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Write a price')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Write a quantity')).toBeInTheDocument();
            const selects = screen.getAllByTestId('ant-select');
            expect(selects).toHaveLength(2);
            expect(screen.getByText('Upload Photo')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /create product/i })).toBeInTheDocument();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should show error toast if category fetch is unsuccessful', async () => {
            // arrange
            axios.get.mockResolvedValueOnce({
                data: { success: false, message: "Error fetching categories" }
            });

            // act
            await renderComponentAndWait();

            // assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Error fetching categories");
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('Form Input Handling', () => {

        // Priyansh Bimbisariye, A0265903B
        it('should update name and description fields when user types', async () => {
            // arrange
            await renderComponentAndWait();
            const nameInput = screen.getByPlaceholderText('Write a name');
            const descInput = screen.getByPlaceholderText('Write a description');

            // act
            fireEvent.change(nameInput, { target: { value: 'Test Product' } });
            fireEvent.change(descInput, { target: { value: 'Test Description' } });

            // assert
            expect(nameInput.value).toBe('Test Product');
            expect(descInput.value).toBe('Test Description');
        });

        // Priyansh Bimbisariye, A0265903B
        it('should only accept positive numbers for price and quantity', async () => {
            // arrange
            await renderComponentAndWait();
            const priceInput = screen.getByPlaceholderText('Write a price');
            const qtyInput = screen.getByPlaceholderText('Write a quantity');

            // act, assert
            fireEvent.change(priceInput, { target: { value: '-1' } });
            fireEvent.change(qtyInput, { target: { value: '-1' } });

            expect(priceInput.value).toBe('');
            expect(qtyInput.value).toBe('');

            // act, assert
            fireEvent.change(priceInput, { target: { value: '0' } });
            fireEvent.change(qtyInput, { target: { value: '0' } });

            expect(priceInput.value).toBe('0');
            expect(qtyInput.value).toBe('');

            // act, assert
            fireEvent.change(priceInput, { target: { value: '100' } });
            fireEvent.change(qtyInput, { target: { value: '5' } });

            expect(priceInput.value).toBe('100');
            expect(qtyInput.value).toBe('5');
        });


        // Priyansh Bimbisariye, A0265903B
        it('should accept zero and large numbers in price field', async () => {
            // arrange
            await renderComponentAndWait();
            const priceInput = screen.getByPlaceholderText('Write a price');

            // act
            fireEvent.change(priceInput, { target: { value: '0' } });

            // assert
            expect(priceInput.value).toBe('0');

            // act
            fireEvent.change(priceInput, { target: { value: '999999999' } });

            // assert
            expect(priceInput.value).toBe('999999999');
        });

        // Priyansh Bimbisariye, A0265903B
        it('should append shipping to FormData when a product is created', async () => {
            // arrange
            axios.get.mockResolvedValueOnce({
                data: { success: true, category: [{ _id: '1', name: 'Electronics' }] }
            });
            axios.post.mockResolvedValue({ data: { success: true, message: "Created" } });
            await renderComponentAndWait();

            fireEvent.change(screen.getByPlaceholderText('Write a name'), { target: { value: 'Test Product' } });
            fireEvent.change(screen.getByPlaceholderText('Write a description'), { target: { value: 'Test Description' } });
            fireEvent.change(screen.getByPlaceholderText('Write a price'), { target: { value: '100' } });
            fireEvent.change(screen.getByPlaceholderText('Write a quantity'), { target: { value: '10' } });

            const fileInput = document.querySelector('input[name="photo"]');
            const file = new File(['dummy'], 'product.jpg', { type: 'image/jpeg' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const selects = screen.getAllByTestId('ant-select');
            fireEvent.change(selects[0], { target: { value: '1' } });

            // act
            fireEvent.change(selects[1], { target: { value: '1' } });

            const createBtn = screen.getByRole('button', { name: /create product/i });
            fireEvent.click(createBtn);

            // assert
            await waitFor(() => {
                expect(mockAppend).toHaveBeenCalledWith('shipping', '1');
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should block form submission when shipping option is omitted', async () => {
            // arrange
            axios.get.mockResolvedValueOnce({
                data: { success: true, category: [{ _id: '1', name: 'Electronics' }] }
            });
            await renderComponentAndWait();

            fireEvent.change(screen.getByPlaceholderText('Write a name'), { target: { value: 'Test Product' } });
            fireEvent.change(screen.getByPlaceholderText('Write a description'), { target: { value: 'Test Description' } });
            fireEvent.change(screen.getByPlaceholderText('Write a price'), { target: { value: '100' } });
            fireEvent.change(screen.getByPlaceholderText('Write a quantity'), { target: { value: '10' } });

            const fileInput = document.querySelector('input[name="photo"]');
            const file = new File(['dummy'], 'product.jpg', { type: 'image/jpeg' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const selects = screen.getAllByTestId('ant-select');
            fireEvent.change(selects[0], { target: { value: '1' } });

            // act
            const createBtn = screen.getByRole('button', { name: /create product/i });
            fireEvent.click(createBtn);

            // assert
            await waitFor(() => {
                expect(axios.post).not.toHaveBeenCalled();
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('Photo Upload and Preview', () => {

        // Priyansh Bimbisariye, A0265903B
        it('should display filename after photo selected', async () => {
            // arrange
            await renderComponentAndWait();
            const fileInputEl = document.querySelector('input[name="photo"]');
            const file = new File(['dummy content'], 'product.jpg', { type: 'image/jpeg' });

            // act
            fireEvent.change(fileInputEl, { target: { files: [file] } });

            // assert
            await waitFor(() => {
                expect(screen.getByText('product.jpg')).toBeInTheDocument();
                expect(screen.queryByText('Upload Photo')).not.toBeInTheDocument();
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should display photo preview using URL.createObjectURL', async () => {
            // arrange
            await renderComponentAndWait();
            const fileInputEl = document.querySelector('input[name="photo"]');
            const file = new File(['dummy content'], 'product.jpg', { type: 'image/jpeg' });

            // act
            fireEvent.change(fileInputEl, { target: { files: [file] } });

            // assert
            await waitFor(() => {
                expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
                const img = screen.getByAltText('product_photo');
                expect(img).toBeInTheDocument();
                expect(img).toHaveAttribute('src', 'blob:mock-url');
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should update preview when photo changed', async () => {
            // arrange
            await renderComponentAndWait();
            const fileInputEl = document.querySelector('input[name="photo"]');
            const file1 = new File(['1'], 'product1.jpg', { type: 'image/jpeg' });

            // act
            fireEvent.change(fileInputEl, { target: { files: [file1] } });

            // arrange
            global.URL.createObjectURL.mockReturnValueOnce('blob:mock-url-2');
            const file2 = new File(['2'], 'product2.jpg', { type: 'image/jpeg' });

            // act
            fireEvent.change(fileInputEl, { target: { files: [file2] } });

            // assert
            await waitFor(() => {
                expect(screen.getByText('product2.jpg')).toBeInTheDocument();
                const img = screen.getByAltText('product_photo');
                expect(img).toHaveAttribute('src', 'blob:mock-url-2');
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should not display preview when no photo selected', async () => {
            // no arrange

            // act
            await renderComponentAndWait();

            // assert
            expect(screen.queryByAltText('product_photo')).not.toBeInTheDocument();

        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe('Product Creation Logic', () => {
        // Priyansh Bimbisariye, A0265903B
        it('should show success toast and navigate when API returns success response', async () => {
            // arrange
            axios.get.mockResolvedValueOnce({
                data: { success: true, category: [{ _id: '1', name: 'Electronics' }] }
            });
            axios.post.mockResolvedValue({ data: { success: true, message: "Created" } });
            await renderComponentAndWait();

            fireEvent.change(screen.getByPlaceholderText('Write a name'), { target: { value: 'Test Product' } });
            fireEvent.change(screen.getByPlaceholderText('Write a description'), { target: { value: 'Test Description' } });
            fireEvent.change(screen.getByPlaceholderText('Write a price'), { target: { value: '100' } });
            fireEvent.change(screen.getByPlaceholderText('Write a quantity'), { target: { value: '10' } });
            const shippingSelect = screen.getAllByTestId('ant-select');
            fireEvent.change(shippingSelect[1], { target: { value: '1' } });

            const fileInput = document.querySelector('input[name="photo"]');
            const file = new File(['dummy'], 'product.jpg', { type: 'image/jpeg' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const selects = screen.getAllByTestId('ant-select');
            fireEvent.change(selects[0], { target: { value: '1' } });

            const createBtn = screen.getByRole('button', { name: /create product/i });

            // act
            fireEvent.click(createBtn);

            // assert
            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith('Product Created Successfully');
                expect(toast.error).not.toHaveBeenCalled();
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products');
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should show error toast when API returns failure response', async () => {
            // arrange
            axios.get.mockResolvedValueOnce({
                data: { success: true, category: [{ _id: '1', name: 'Electronics' }] }
            });
            axios.post.mockResolvedValue({ data: { success: false, message: "Creation failed" } });
            await renderComponentAndWait();

            fireEvent.change(screen.getByPlaceholderText('Write a name'), { target: { value: 'Test Product' } });
            fireEvent.change(screen.getByPlaceholderText('Write a description'), { target: { value: 'Test Description' } });
            fireEvent.change(screen.getByPlaceholderText('Write a price'), { target: { value: '100' } });
            fireEvent.change(screen.getByPlaceholderText('Write a quantity'), { target: { value: '10' } });
            const shippingSelect = screen.getAllByTestId('ant-select');
            fireEvent.change(shippingSelect[1], { target: { value: '1' } });

            const fileInput = document.querySelector('input[name="photo"]');
            const file = new File(['dummy'], 'product.jpg', { type: 'image/jpeg' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const selects = screen.getAllByTestId('ant-select');
            fireEvent.change(selects[0], { target: { value: '1' } });

            const createBtn = screen.getByRole('button', { name: /create product/i });

            // act
            fireEvent.click(createBtn);

            // assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Creation failed');
                expect(toast.success).not.toHaveBeenCalled();
                expect(mockNavigate).not.toHaveBeenCalled();
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it('should handle network error during creation', async () => {
            // arrange
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            axios.get.mockResolvedValueOnce({
                data: { success: true, category: [{ _id: '1', name: 'Electronics' }] }
            });
            axios.post.mockImplementationOnce(() => {
                throw new Error('Network error');
            });
            await renderComponentAndWait();

            fireEvent.change(screen.getByPlaceholderText('Write a name'), { target: { value: 'Test Product' } });
            fireEvent.change(screen.getByPlaceholderText('Write a description'), { target: { value: 'Test Description' } });
            fireEvent.change(screen.getByPlaceholderText('Write a price'), { target: { value: '100' } });
            fireEvent.change(screen.getByPlaceholderText('Write a quantity'), { target: { value: '10' } });
            const shippingSelect = screen.getAllByTestId('ant-select');
            fireEvent.change(shippingSelect[1], { target: { value: '1' } });

            const fileInput = document.querySelector('input[name="photo"]');
            const file = new File(['dummy'], 'product.jpg', { type: 'image/jpeg' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const selects = screen.getAllByTestId('ant-select');
            fireEvent.change(selects[0], { target: { value: '1' } });

            const createBtn = screen.getByRole('button', { name: /create product/i });

            // act
            fireEvent.click(createBtn);

            // assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Something went wrong');
                expect(mockNavigate).not.toHaveBeenCalled();
            });
            consoleSpy.mockRestore();
        });

        // Priyansh Bimbisariye, A0265903B
        it('should not allow submit with empty required fields', async () => {
            // arrange
            await renderComponentAndWait();
            const createBtn = screen.getByRole('button', { name: /create product/i });

            // act
            fireEvent.click(createBtn);

            // assert
            await waitFor(() => {
                expect(axios.post).not.toHaveBeenCalled();
            });
        });
    });
});
