import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import AdminMenu from './AdminMenu';

// Priyansh Bimbisariye, A0265903B
describe('AdminMenu Component', () => {
    // Priyansh Bimbisariye, A0265903B
    // partition - valid render
    it('renders the Admin Panel heading', () => {
        render(
            <MemoryRouter>
                <AdminMenu />
            </MemoryRouter>
        );
        // check for h4 html tag
        expect(screen.getByRole('heading', { level: 4, name: /admin panel/i })).toBeInTheDocument();
    });

    // Priyansh Bimbisariye, A0265903B
    // partition - ordering should be same
    // bva, expected count
    it('renders all 5 navigation links in the correct order', () => {
        render(
            <MemoryRouter>
                <AdminMenu />
            </MemoryRouter>
        );

        const expectedLinks = [
            'Create Category',
            'Create Product',
            'Products',
            'Orders',
            'Users'
        ];

        // act
        const links = screen.getAllByRole('link');

        expect(links).toHaveLength(5);
        links.forEach((link, index) => {
            expect(link).toHaveTextContent(expectedLinks[index]);
        });
    });

    // Priyansh Bimbisariye, A0265903B
    // each link interaction points to correct route
    it('links point to the correct routes', () => {
        render(
            <MemoryRouter>
                <AdminMenu />
            </MemoryRouter>
        );

        const expectedRoutes = {
            'Create Category': '/dashboard/admin/create-category',
            'Create Product': '/dashboard/admin/create-product',
            'Products': '/dashboard/admin/products',
            'Orders': '/dashboard/admin/orders',
            'Users': '/dashboard/admin/users'
        };

        // go through each link
        // check if it points to the correct route
        Object.entries(expectedRoutes).forEach(([text, route]) => {
            const link = screen.getByRole('link', { name: text });
            expect(link).toHaveAttribute('href', route);
        });
    });
});
