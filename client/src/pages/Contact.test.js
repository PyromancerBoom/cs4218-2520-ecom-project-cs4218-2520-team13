import React from "react";
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Contact from './Contact';
import { MemoryRouter } from 'react-router-dom';


jest.mock('../hooks/useCategory', () => jest.fn(() => []));

jest.mock('../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
})); 

jest.mock("react-icons/bi", () => ({
    BiMailSend: () => <span data-testid="mail-icon" />,
    BiPhoneCall: () => <span data-testid="phone-icon" />,
    BiSupport: () => <span data-testid="support-icon" />,
}));


describe('Contact Page Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderSetup = () => {
        render(
            <MemoryRouter>
                <Contact />
            </MemoryRouter>
        );
    };

    it('should display the correct document title via Layout', async () => {
        renderSetup();
        // Verifying if Layout prop 'title' correctly updates document title
        await waitFor(() => {
            expect(document.title).toBe("Contact us");
        });
    });

    it('should render the contact page heading and description', () => {
        // Act
        renderSetup();
        
        // Assert
        expect(screen.getByRole("heading", { name: /CONTACT US/i })).toBeInTheDocument();
        expect(screen.getByText(/For any query or info about product, feel free to call anytime. We are available 24X7./i)).toBeInTheDocument();
    });

    it("should display the contact image with correct attributes", () => {
        // Act
        renderSetup();
        
        // Assert
        const contactImg = screen.getByAltText("contactus");
        expect(contactImg).toBeInTheDocument();
        expect(contactImg).toHaveAttribute("src", "/images/contactus.jpeg");
        expect(contactImg).toHaveStyle({ width: "100%" });
    });

    it("should display email, phone, and support info with their respective icons", () => {
        // Act
        renderSetup();

        // Assert
        expect(screen.getByText(/www.help@ecommerceapp.com/i)).toBeInTheDocument();
        expect(screen.getByText(/012-3456789/i)).toBeInTheDocument();
        expect(screen.getByText(/1800-0000-0000 \(toll free\)/i)).toBeInTheDocument();

        expect(screen.getByTestId("mail-icon")).toBeInTheDocument();
        expect(screen.getByTestId("phone-icon")).toBeInTheDocument();
        expect(screen.getByTestId("support-icon")).toBeInTheDocument();
    });
});