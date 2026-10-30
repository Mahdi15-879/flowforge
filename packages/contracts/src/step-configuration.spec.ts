import { describe, expect, it } from "vitest";
import {
  HttpRequestConfigSchema,
  ScheduleTriggerConfigSchema,
} from "./step-configuration";

describe("HttpRequestConfigSchema", () => {
  const validConfig = {
    operation: "HTTP_REQUEST",
    url: "https://api.example.com/users",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: '{"name":"Mahdi"}',
  };

  it("accepts a valid HTTP request configuration", () => {
    const result = HttpRequestConfigSchema.safeParse(validConfig);

    expect(result.success).toBe(true);
  });

  it("rejects an invalid HTTP method", () => {
    const result = HttpRequestConfigSchema.safeParse({
      ...validConfig,
      method: "INVALID",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a URL without HTTP or HTTPS", () => {
    const result = HttpRequestConfigSchema.safeParse({
      ...validConfig,
      url: "ftp://example.com/file",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a malformed URL", () => {
    const result = HttpRequestConfigSchema.safeParse({
      ...validConfig,
      url: "not-a-valid-url",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = HttpRequestConfigSchema.safeParse({
      operation: "HTTP_REQUEST",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown configuration fields", () => {
    const result = HttpRequestConfigSchema.safeParse({
      ...validConfig,
      unexpectedField: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("ScheduleTriggerConfigSchema", () => {
  const validConfig = {
    operation: "SCHEDULE",
    cron: "0 9 * * *",
    timezone: "Europe/Berlin",
  };

  it("accepts a valid schedule configuration", () => {
    const result = ScheduleTriggerConfigSchema.safeParse(validConfig);

    expect(result.success).toBe(true);
  });

  it("defaults timezone to UTC", () => {
    const result = ScheduleTriggerConfigSchema.parse({
      operation: "SCHEDULE",
      cron: "0 9 * * *",
    });

    expect(result.timezone).toBe("UTC");
  });

  it("rejects a cron expression with fewer than 5 fields", () => {
    const result = ScheduleTriggerConfigSchema.safeParse({
      ...validConfig,
      cron: "0 9 * *",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a cron expression with more than 5 fields", () => {
    const result = ScheduleTriggerConfigSchema.safeParse({
      ...validConfig,
      cron: "0 9 * * * *",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty timezone", () => {
    const result = ScheduleTriggerConfigSchema.safeParse({
      ...validConfig,
      timezone: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown configuration fields", () => {
    const result = ScheduleTriggerConfigSchema.safeParse({
      ...validConfig,
      unexpectedField: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid timezone", () => {
    const result = ScheduleTriggerConfigSchema.safeParse({
      operation: "SCHEDULE",
      cron: "0 9 * * *",
      timezone: "Invalid/Timezone",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a cron expression with an interval", () => {
    const result = ScheduleTriggerConfigSchema.safeParse({
      operation: "SCHEDULE",
      cron: "*/15 * * * *",
      timezone: "UTC",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a cron expression with a weekday range", () => {
    const result = ScheduleTriggerConfigSchema.safeParse({
      operation: "SCHEDULE",
      cron: "0 9 * * 1-5",
      timezone: "Europe/Berlin",
    });

    expect(result.success).toBe(true);
  });

  it("rejects cron expressions with out-of-range minute and hour", () => {
    const result = ScheduleTriggerConfigSchema.safeParse({
      operation: "SCHEDULE",
      cron: "99 99 * * *",
      timezone: "UTC",
    });

    expect(result.success).toBe(false);
  });

  it("rejects cron expressions with an invalid hour", () => {
    const result = ScheduleTriggerConfigSchema.safeParse({
      operation: "SCHEDULE",
      cron: "0 25 * * *",
      timezone: "UTC",
    });

    expect(result.success).toBe(false);
  });

  it("rejects cron expressions with an invalid month", () => {
    const result = ScheduleTriggerConfigSchema.safeParse({
      operation: "SCHEDULE",
      cron: "0 9 * 13 *",
      timezone: "UTC",
    });

    expect(result.success).toBe(false);
  });
});
