import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import AdminDashboard from './AdminDashboard';
import { useAuth } from '../../context/auth';

// Priyansh Bimbisariye, A0265903B
jest.mock('../../components/Layout', () => {
    const Layout = ({ children }) => <div data-testid="layout">{children}</div>;
    Layout.displayName = 'MockLayout';
    return { __esModule: true, default: Layout };
});
jest.mock('../../components/AdminMenu', () => {
    const AdminMenu = () => <div data-testid="admin-menu">AdminMenu</div>;
    AdminMenu.displayName = 'MockAdminMenu';
    return { __esModule: true, default: AdminMenu };
});
jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(),
}));

jest.mock('../../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock('../../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]),
}));

jest.mock('../../hooks/useCategory', () => jest.fn(() => []));

// Priyansh Bimbisariye, A0265903B
describe('AdminDashboard Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Priyansh Bimbisariye, A0265903B
    // EP - valid partition - valid auth data
    describe('with valid auth data', () => {
        const mockAuth = {
            user: {
                name: 'Jane Snow',
                email: 'jane@admin.com',
                phone: '91234567',
            },
            token: 'mock-jwt-token',
        };

        beforeEach(() => {
            useAuth.mockReturnValue([mockAuth]);
        });

        // sub-partition - full user object supplied
        // verify the component should crrectly read name email phoen from
        // the auth context and renders them in the dom
        it('displays admin name, email, and phone', () => {
            // act
            render(<AdminDashboard />);

            // assert
            expect(screen.getByText(/Jane Snow/)).toBeInTheDocument();
            expect(screen.getByText(/jane@admin.com/)).toBeInTheDocument();
            expect(screen.getByText(/91234567/)).toBeInTheDocument();
        });

        // sub-parition - ui text contract
        // The labels "Admin Name :", "Admin Email :", "Admin Contact :" 
        it('displays the correct label prefixes', () => {
            // act
            render(<AdminDashboard />);

            // assert - each h3 should contain the label prefix
            expect(screen.getByText(/Admin Name :/)).toBeInTheDocument();
            expect(screen.getByText(/Admin Email :/)).toBeInTheDocument();
            expect(screen.getByText(/Admin Contact :/)).toBeInTheDocument();
        });
    });

    // Priyansh Bimbisariye, A0265903B
    // EP - null partition or bva
    describe('resilience - missing auth data', () => {

        // should never crash ungracefully
        // verify h3 labels still render (not blank screen)
        it('renders without crashing when auth is null', () => {
            // arrange
            useAuth.mockReturnValue([null]);

            // act
            render(<AdminDashboard />);

            // assert - structure still present (graceful degradation, not blank)
            expect(screen.getByText(/Admin Name :/)).toBeInTheDocument();
            expect(screen.getByText(/Admin Email :/)).toBeInTheDocument();
            expect(screen.getByText(/Admin Contact :/)).toBeInTheDocument();
            expect(screen.queryByText('null')).not.toBeInTheDocument();
            expect(screen.queryByText('undefined')).not.toBeInTheDocument();
        });

        // auth object is present (has token) but the user
        // property is null - partially hydrated context
        it('renders without crashing when auth.user is null', () => {
            // arrange
            useAuth.mockReturnValue([{ user: null, token: 'some-token' }]);

            // act
            render(<AdminDashboard />);

            // assert - structure still present (graceful degradation, not blank)
            expect(screen.getByText(/Admin Name :/)).toBeInTheDocument();
            expect(screen.getByText(/Admin Email :/)).toBeInTheDocument();
            expect(screen.getByText(/Admin Contact :/)).toBeInTheDocument();
            expect(screen.queryByText('null')).not.toBeInTheDocument();
            expect(screen.queryByText('undefined')).not.toBeInTheDocument();
        });
    });


    // Priyansh Bimbisariye, A0265903B
    // composition verification
    // admin dashbaord must include the admin menu sidebar
    describe('component composition', () => {
        beforeEach(() => {
            useAuth.mockReturnValue([{ user: { name: 'A', email: 'B', phone: 'C' }, token: 't' }]);
        });

        it('renders the AdminMenu component', () => {
            // act
            render(<AdminDashboard />);

            // assert
            expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
        });

        it('renders within the Layout wrapper', () => {
            // act
            render(<AdminDashboard />);

            // assert
            expect(screen.getByTestId('layout')).toBeInTheDocument();
        });
    });
});
