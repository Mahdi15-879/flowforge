import { HttpActionExecutorService } from "./http-action-executor.service";
import { request } from "undici";

jest.mock("undici", () => {
  const actual = jest.requireActual("undici");

  return {
    ...actual,
    request: jest.fn(),
  };
});

describe("HttpActionExecutorService security", () => {
  let executor: HttpActionExecutorService;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it("rejects HTTP responses larger than 1 MB", async () => {
    const oversizedBody = Buffer.alloc(1024 * 1024 + 1, "a");

    const mockedRequest = jest.mocked(request);

    mockedRequest.mockResolvedValueOnce({
      statusCode: 200,
      statusText: "OK",
      headers: {},
      trailers: {},
      opaque: null,
      context: {},
      body: (async function* () {
        yield oversizedBody;
      })(),
    } as unknown as Awaited<ReturnType<typeof request>>);

    await expect(
      executor.execute({
        operation: "HTTP_REQUEST",
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/todos/1",
      }),
    ).rejects.toThrow("HTTP response exceeds 1 MB");
  });

  it("returns status code and body for a successful HTTP response", async () => {
    const mockedRequest = jest.mocked(request);

    mockedRequest.mockResolvedValueOnce({
      statusCode: 200,
      statusText: "OK",
      headers: {},
      trailers: {},
      opaque: null,
      context: {},
      body: (async function* () {
        yield Buffer.from('{"message":"success"}');
      })(),
    } as unknown as Awaited<ReturnType<typeof request>>);

    await expect(
      executor.execute({
        operation: "HTTP_REQUEST",
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/todos/1",
      }),
    ).resolves.toEqual({
      statusCode: 200,
      body: '{"message":"success"}',
    });

    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("propagates HTTP network errors", async () => {
    const mockedRequest = jest.mocked(request);

    mockedRequest.mockRejectedValueOnce(new Error("HTTP connection failed"));

    await expect(
      executor.execute({
        operation: "HTTP_REQUEST",
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/todos/1",
      }),
    ).rejects.toThrow("HTTP connection failed");

    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("propagates HTTP timeout errors", async () => {
    const mockedRequest = jest.mocked(request);

    const timeoutError = new Error("HTTP request timed out");
    timeoutError.name = "TimeoutError";

    mockedRequest.mockRejectedValueOnce(timeoutError);

    await expect(
      executor.execute({
        operation: "HTTP_REQUEST",
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/todos/1",
      }),
    ).rejects.toMatchObject({
      name: "TimeoutError",
      message: "HTTP request timed out",
    });

    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });
});
