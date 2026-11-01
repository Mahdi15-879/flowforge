import { HttpActionExecutorService } from "./http-action-executor.service";

describe("HttpActionExecutorService security", () => {
  let executor: HttpActionExecutorService;

  beforeEach(() => {
    executor = new HttpActionExecutorService();
  });

  const config = (url: string) => ({
    operation: "HTTP_REQUEST",
    method: "GET",
    url,
  });

  it.each([
    "http://jsonplaceholder.typicode.com/todos/1",
    "https://localhost/",
    "https://127.0.0.1/",
    "https://192.168.1.1/",
    "https://169.254.169.254/",
    "https://example.local/",
    "https://example.internal/",
    "https://example.com/",
    "https://jsonplaceholder.typicode.com:8443/",
    "https://user:password@jsonplaceholder.typicode.com/",
  ])("rejects unsafe or unauthorized destination: %s", async (url) => {
    await expect(executor.execute(config(url))).rejects.toThrow();
  });

  it("rejects an unsupported operation", async () => {
    await expect(
      executor.execute({
        operation: "UNKNOWN",
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/",
      }),
    ).rejects.toThrow();
  });

  it("rejects an invalid HTTP method", async () => {
    await expect(
      executor.execute({
        operation: "HTTP_REQUEST",
        method: "CONNECT",
        url: "https://jsonplaceholder.typicode.com/",
      }),
    ).rejects.toThrow();
  });

  it.each([
    "Host",
    "HOST",
    "Connection",
    "Content-Length",
    "Transfer-Encoding",
    "Upgrade",
    "Proxy-Authorization",
    "Proxy-Authenticate",
    "Proxy-Connection",
    "Forwarded",
    "X-Forwarded-For",
    "X-Forwarded-Host",
    "X-Forwarded-Proto",
  ])("rejects restricted HTTP header: %s", async (headerName) => {
    await expect(
      executor.execute({
        operation: "HTTP_REQUEST",
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/todos/1",
        headers: {
          [headerName]: "test-value",
        },
      }),
    ).rejects.toThrow(`Restricted HTTP header: ${headerName}`);
  });
});
