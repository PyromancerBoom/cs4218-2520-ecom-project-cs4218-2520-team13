const React = require("react");
global.React = React;
const { render, screen, fireEvent } = require("@testing-library/react");
const { SearchProvider, useSearch } = require("./search");
require("@testing-library/jest-dom");

const TestComponent = () => {
    const [values, setValues] = useSearch();
    return (
        <div>
            <div data-testid="keyword">{values.keyword}</div>
            <div data-testid="results-count">{values.results.length}</div>
            <button onClick={() => setValues({ ...values, keyword: "laptop", results: [1, 2] })}>
                Search
            </button>
            <button onClick={() => setValues({ ...values, keyword: "new-key" })}>
                Update Keyword Only
            </button>
        </div>
    );
};
//LOU,YING-WEN A0338250J
describe("Search Context Unit Test", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should provide default values", () => {
        render(
            <SearchProvider>
                <TestComponent />
            </SearchProvider>
        );

        expect(screen.getByTestId("keyword")).toHaveTextContent("");
        expect(screen.getByTestId("results-count")).toHaveTextContent("0");
    });

    it("should update state when setValues is called", () => {
        render(
            <SearchProvider>
                <TestComponent />
            </SearchProvider>
        );

        fireEvent.click(screen.getByText("Search"));

        expect(screen.getByTestId("keyword")).toHaveTextContent("laptop");
        expect(screen.getByTestId("results-count")).toHaveTextContent("2");
    });

    it("should preserve previous results when only keyword is updated", () => {
        render(
            <SearchProvider>
                <TestComponent />
            </SearchProvider>
        );

        fireEvent.click(screen.getByText("Search"));
        fireEvent.click(screen.getByText("Update Keyword Only"));

        expect(screen.getByTestId("keyword")).toHaveTextContent("new-key");
        expect(screen.getByTestId("results-count")).toHaveTextContent("2");
    });

    it("should share state between multiple components", () => {
        render(
            <SearchProvider>
                <TestComponent />
                <div data-testid="second-comp">
                    <TestComponent />
                </div>
            </SearchProvider>
        );

        const buttons = screen.getAllByText("Search");
        fireEvent.click(buttons[0]);

        const keywords = screen.getAllByTestId("keyword");
        expect(keywords[0]).toHaveTextContent("laptop");
        expect(keywords[1]).toHaveTextContent("laptop");
    });

    it("should handle transition to empty states correctly", () => {
        const ResetComponent = () => {
            const [values, setValues] = useSearch();
            return <button onClick={() => setValues({ keyword: "", results: [] })}>Reset</button>;
        };

        render(
            <SearchProvider>
                <TestComponent />
                <ResetComponent />
            </SearchProvider>
        );

        fireEvent.click(screen.getByText("Search"));
        fireEvent.click(screen.getByText("Reset"));

        expect(screen.getByTestId("keyword")).toHaveTextContent("");
        expect(screen.getByTestId("results-count")).toHaveTextContent("0");
    });
});