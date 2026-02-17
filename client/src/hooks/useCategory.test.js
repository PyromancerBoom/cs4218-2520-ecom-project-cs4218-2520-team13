const { renderHook, waitFor } = require("@testing-library/react");
const axios = require("axios");
const useCategory = require("./useCategory").default;

jest.mock("axios");

//LOU,YING-WEN A0338250J
describe("useCategory Custom Hook Unit Test", () => {
    let consoleSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it("should fetch and set categories on mount", async () => {
        const mockData = {
            category: [
                { _id: "1", name: "Electronics" },
                { _id: "2", name: "Books" },
            ],
        };
        axios.get.mockResolvedValue({ data: mockData });

        const { result } = renderHook(() => useCategory());

        expect(result.current).toEqual([]);
        await waitFor(() => {
            expect(result.current).toEqual(mockData.category);
        });
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    it("should handle API error and log to console", async () => {
        const mockError = new Error("Network Error");
        axios.get.mockRejectedValue(mockError);

        const { result } = renderHook(() => useCategory());

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
        });
        expect(result.current).toEqual([]);
    });

    it("should handle empty category list from API", async () => {
        axios.get.mockResolvedValue({ data: { category: [] } });

        const { result } = renderHook(() => useCategory());

        await waitFor(() => {
            expect(result.current).toEqual([]);
        });
    });

    it("should handle null or undefined data response gracefully", async () => {
        axios.get.mockResolvedValue({ data: null });

        const { result } = renderHook(() => useCategory());

        await waitFor(() => {
            expect(result.current).toEqual([]);
        });
        expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("should not update state after component unmounts", async () => {
        let resolveRequest;
        const promise = new Promise((resolve) => {
            resolveRequest = resolve;
        });
        axios.get.mockReturnValue(promise);

        const { unmount } = renderHook(() => useCategory());

        unmount();
        resolveRequest({ data: { category: [{ name: "Post-unmount" }] } });

        // No error should be thrown, and console should remain clean
        expect(consoleSpy).not.toHaveBeenCalled();
    });
});