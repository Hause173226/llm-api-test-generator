import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RequestLine from "./RequestLine";
import { ManualTestingProvider } from "../../contexts/ManualTestingContext";

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "manualTesting.httpMethod": "HTTP Method",
        "manualTesting.url": "Request URL",
        "manualTesting.urlPlaceholder": "https://api.example.com/{{endpoint}}",
        "manualTesting.send": "Send",
        "manualTesting.sending": "Sending...",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Loader2: ({ className }: { className?: string }) => (
    <div data-testid="loader-icon" className={className}>
      Loading
    </div>
  ),
}));

describe("RequestLine", () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRequestLine = (isLoading = false) => {
    return render(
      <ManualTestingProvider>
        <RequestLine onSend={mockOnSend} isLoading={isLoading} />
      </ManualTestingProvider>,
    );
  };

  describe("HTTP Method Dropdown", () => {
    it("should render HTTP method dropdown with all methods", () => {
      renderRequestLine();

      const dropdown = screen.getByLabelText("HTTP Method");
      expect(dropdown).toBeInTheDocument();

      const options = screen.getAllByRole("option");
      const methodNames = options.map((opt) => opt.textContent);

      expect(methodNames).toEqual([
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "OPTIONS",
        "HEAD",
      ]);
    });

    it("should have GET as default method", () => {
      renderRequestLine();

      const dropdown = screen.getByLabelText(
        "HTTP Method",
      ) as HTMLSelectElement;
      expect(dropdown.value).toBe("GET");
    });

    it("should update method when dropdown changes", () => {
      renderRequestLine();

      const dropdown = screen.getByLabelText(
        "HTTP Method",
      ) as HTMLSelectElement;
      fireEvent.change(dropdown, { target: { value: "POST" } });

      expect(dropdown.value).toBe("POST");
    });

    it("should disable dropdown when loading", () => {
      renderRequestLine(true);

      const dropdown = screen.getByLabelText("HTTP Method");
      expect(dropdown).toBeDisabled();
    });
  });

  describe("URL Input Field", () => {
    it("should render URL input field", () => {
      renderRequestLine();

      const input = screen.getByLabelText("Request URL");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "text");
    });

    it("should display placeholder text", () => {
      renderRequestLine();

      const input = screen.getByPlaceholderText(
        "https://api.example.com/{{endpoint}}",
      );
      expect(input).toBeInTheDocument();
    });

    it("should update URL when input changes", () => {
      renderRequestLine();

      const input = screen.getByLabelText("Request URL") as HTMLInputElement;
      fireEvent.change(input, {
        target: { value: "https://api.example.com/users" },
      });

      expect(input.value).toBe("https://api.example.com/users");
    });

    it("should support variable syntax in URL", () => {
      renderRequestLine();

      const input = screen.getByLabelText("Request URL") as HTMLInputElement;
      fireEvent.change(input, {
        target: { value: "https://{{baseUrl}}/api/{{endpoint}}" },
      });

      expect(input.value).toBe("https://{{baseUrl}}/api/{{endpoint}}");
    });

    it("should disable input when loading", () => {
      renderRequestLine(true);

      const input = screen.getByLabelText("Request URL");
      expect(input).toBeDisabled();
    });
  });

  describe("Send Button", () => {
    it("should render Send button", () => {
      renderRequestLine();

      const button = screen.getByRole("button", { name: "Send" });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Send");
    });

    it("should call onSend when clicked", () => {
      renderRequestLine();

      // First set a URL
      const input = screen.getByLabelText("Request URL");
      fireEvent.change(input, {
        target: { value: "https://api.example.com/test" },
      });

      const button = screen.getByRole("button", { name: "Send" });
      fireEvent.click(button);

      expect(mockOnSend).toHaveBeenCalledTimes(1);
    });

    it("should show loading state when isLoading is true", () => {
      renderRequestLine(true);

      const button = screen.getByRole("button", { name: "Send" });
      expect(button).toHaveTextContent("Sending...");
      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    });

    it("should be disabled when loading", () => {
      renderRequestLine(true);

      const button = screen.getByRole("button", { name: "Send" });
      expect(button).toBeDisabled();
    });

    it("should be disabled when URL is empty", () => {
      renderRequestLine();

      const button = screen.getByRole("button", { name: "Send" });
      expect(button).toBeDisabled();
    });

    it("should be enabled when URL is provided", () => {
      renderRequestLine();

      const input = screen.getByLabelText("Request URL");
      fireEvent.change(input, {
        target: { value: "https://api.example.com/test" },
      });

      const button = screen.getByRole("button", { name: "Send" });
      expect(button).not.toBeDisabled();
    });

    it("should not call onSend when disabled", () => {
      renderRequestLine();

      const button = screen.getByRole("button", { name: "Send" });
      fireEvent.click(button);

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should send request on Ctrl+Enter", () => {
      renderRequestLine();

      const input = screen.getByLabelText("Request URL");
      fireEvent.change(input, {
        target: { value: "https://api.example.com/test" },
      });

      fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

      expect(mockOnSend).toHaveBeenCalledTimes(1);
    });

    it("should send request on Cmd+Enter (Mac)", () => {
      renderRequestLine();

      const input = screen.getByLabelText("Request URL");
      fireEvent.change(input, {
        target: { value: "https://api.example.com/test" },
      });

      fireEvent.keyDown(input, { key: "Enter", metaKey: true });

      expect(mockOnSend).toHaveBeenCalledTimes(1);
    });

    it("should not send on Enter without modifier key", () => {
      renderRequestLine();

      const input = screen.getByLabelText("Request URL");
      fireEvent.change(input, {
        target: { value: "https://api.example.com/test" },
      });

      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it("should not send on Ctrl+Enter when loading", () => {
      renderRequestLine(true);

      const input = screen.getByLabelText("Request URL");
      fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe("Integration with ManualTestingContext", () => {
    it("should update context when method changes", () => {
      renderRequestLine();

      const dropdown = screen.getByLabelText("HTTP Method");
      fireEvent.change(dropdown, { target: { value: "POST" } });

      // Verify the dropdown reflects the change
      expect((dropdown as HTMLSelectElement).value).toBe("POST");
    });

    it("should update context when URL changes", () => {
      renderRequestLine();

      const input = screen.getByLabelText("Request URL");
      const testUrl = "https://api.example.com/users";
      fireEvent.change(input, { target: { value: testUrl } });

      // Verify the input reflects the change
      expect((input as HTMLInputElement).value).toBe(testUrl);
    });
  });
});
