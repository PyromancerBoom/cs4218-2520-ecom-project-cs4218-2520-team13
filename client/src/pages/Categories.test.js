const React = require("react");
global.React = React;
const { render, screen } = require("@testing-library/react");
const { BrowserRouter } = require("react-router-dom");
require("@testing-library/jest-dom");

const mockUseCategory = jest.fn();

jest.mock("../hooks/useCategory", () => ({
    __esModule: true,
    default: mockUseCategory
}));

const Categories = require("./Categories").default;

jest.mock("../components/Layout", () => ({ children, title }) => (
    <div data-testid="mock-layout">
        <h1>{title}</h1>
        {children}
    </div>
));

//LOU,YING-WEN A0338250J
describe("Categories Page Unit Test", () => {
    const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
        { _id: "2", name: "Books", slug: "books" },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should render all category links correctly", () => {
        mockUseCategory.mockReturnValue(mockCategories);

        render(
            <BrowserRouter>
                <Categories />
            </BrowserRouter>
        );

        expect(screen.getByText("All Categories")).toBeInTheDocument();
        expect(screen.getByText("Electronics")).toBeInTheDocument();
        expect(screen.getByText("Electronics").closest("a")).toHaveAttribute("href", "/category/electronics");
    });

    it("should render empty state when no categories are returned", () => {
        mockUseCategory.mockReturnValue([]);

        render(
            <BrowserRouter>
                <Categories />
            </BrowserRouter>
        );

        expect(screen.queryAllByRole("link")).toHaveLength(0);
        expect(screen.getByText("All Categories")).toBeInTheDocument();
    });

    it("should handle categories with special characters in name or slug", () => {
        const specialMock = [{ _id: "3", name: "Home & Garden", slug: "home-garden" }];
        mockUseCategory.mockReturnValue(specialMock);

        render(
            <BrowserRouter>
                <Categories />
            </BrowserRouter>
        );

        const link = screen.getByText("Home & Garden");
        expect(link.closest("a")).toHaveAttribute("href", "/category/home-garden");
    });

    it("should verify Layout component receives the correct title prop", () => {
        mockUseCategory.mockReturnValue([]);

        render(
            <BrowserRouter>
                <Categories />
            </BrowserRouter>
        );

        const titleElement = screen.getByRole("heading", { level: 1 });
        expect(titleElement).toHaveTextContent("All Categories");
    });
});