import React from "react";
import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Policy from './Policy';

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

describe('Policy Page Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderSetup = () => {
        render(
            <MemoryRouter>
                <Policy />
            </MemoryRouter>
        );
    };

    it("should set the document title via Layout component", async () => {
        // Act
        renderSetup();

        // Assert - Verifying if the Helmet title is set correctly
        await waitFor(() => {
            expect(document.title).toBe("Privacy Policy");
        });
    });

    it("should render the policy image", () => {
        // Act
        renderSetup();

        // Assert
        const image = screen.getByAltText("contactus");
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute("src", "/images/contactus.jpeg");
        expect(image).toHaveStyle({ width: "100%" });
    });

    it("should render privacy policy text multiple times", () => {
        // Act
        renderSetup();

        // Assert
        // Technical Flow: We use getAllByText because there are 7 identical <p> tags.
        // getByText would FAIL here because it expects a unique match.
        const policies = screen.getAllByText(/add privacy policy/i);
        expect(policies).toHaveLength(7); 
        expect(policies[0]).toBeInTheDocument();
    });
});