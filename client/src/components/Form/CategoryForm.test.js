import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import CategoryForm from "./CategoryForm";

// Priyansh Bimbisariye, A0265903B
describe("CategoryForm Component Validation", () => {
    let handleSubmitMock;
    let setValueMock;
    let initialValue;

    beforeEach(() => {
        handleSubmitMock = jest.fn();
        setValueMock = jest.fn();
        initialValue = "Test Category";
        jest.clearAllMocks();
    });

    describe("UI Rendering and Presentation", () => {
        // Priyansh Bimbisariye, A0265903B
        it("should render the CategoryForm inputs correctly", () => {
            // arrange
            render(
                <CategoryForm
                    handleSubmit={handleSubmitMock}
                    value={initialValue}
                    setValue={setValueMock}
                />
            );

            // act
            const inputElement = screen.getByPlaceholderText("Enter new category");
            const buttonElement = screen.getByRole("button", { name: /submit/i });

            // assert
            expect(inputElement).toBeInTheDocument();
            expect(inputElement.value).toBe(initialValue);
            expect(buttonElement).toBeInTheDocument();
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe("Behavioral Events and Callbacks", () => {
        it("should call setValue on user input changes", () => {
            // testing contract
            // arrange
            render(
                <CategoryForm
                    handleSubmit={handleSubmitMock}
                    value={initialValue}
                    setValue={setValueMock}
                />
            );
            const inputElement = screen.getByPlaceholderText("Enter new category");

            // act
            fireEvent.change(inputElement, { target: { value: "New Valid Category" } });

            // assert
            expect(setValueMock).toHaveBeenCalledTimes(1);
            expect(setValueMock).toHaveBeenCalledWith("New Valid Category");
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe("Resilience and Edge Cases", () => {

        it("should prevent default page reload behavior on form submission", () => {
            // using Behavioral Testing and Resilience Testing
            // arrange
            render(
                <CategoryForm
                    handleSubmit={handleSubmitMock}
                    value={initialValue}
                    setValue={setValueMock}
                />
            );
            const formElement = screen.getByRole("button", { name: /submit/i }).closest("form");
            const mockEvent = { preventDefault: jest.fn() };

            // act
            fireEvent.submit(formElement, mockEvent);

            // assert
            expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
            expect(handleSubmitMock).toHaveBeenCalledTimes(1);
        });

        // Priyansh Bimbisariye, A0265903B
        it("should have proper accessibility labels for screen readers", () => {
            // arrange
            render(
                <CategoryForm
                    handleSubmit={handleSubmitMock}
                    value={initialValue}
                    setValue={setValueMock}
                />
            );

            // act and assert
            const inputElement = screen.getByRole("textbox", { name: /category/i });
            expect(inputElement).toBeInTheDocument();
        });
    });
});
