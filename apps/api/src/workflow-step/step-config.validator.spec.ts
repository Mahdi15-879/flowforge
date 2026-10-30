import { BadRequestException } from "@nestjs/common";
import { validateStepConfig } from "./step-config.validator";

describe("validateStepConfig", () => {
  const httpConfig = {
    operation: "HTTP_REQUEST",
    url: "https://example.com/api",
    method: "POST",
  };

  const scheduleConfig = {
    operation: "SCHEDULE",
    cron: "0 9 * * *",
    timezone: "Europe/Berlin",
  };

  it("accepts a valid HTTP_REQUEST action", () => {
    expect(validateStepConfig("ACTION", httpConfig)).toEqual(httpConfig);
  });

  it("accepts a valid SCHEDULE trigger", () => {
    expect(validateStepConfig("TRIGGER", scheduleConfig)).toEqual(
      scheduleConfig,
    );
  });

  it("preserves empty configuration for legacy steps", () => {
    expect(validateStepConfig("ACTION", {})).toEqual({});
    expect(validateStepConfig("TRIGGER", {})).toEqual({});
  });

  it("rejects SCHEDULE configuration for an ACTION", () => {
    expect(() => validateStepConfig("ACTION", scheduleConfig)).toThrow(
      BadRequestException,
    );
  });

  it("rejects HTTP_REQUEST configuration for a TRIGGER", () => {
    expect(() => validateStepConfig("TRIGGER", httpConfig)).toThrow(
      BadRequestException,
    );
  });

  it("rejects an invalid HTTP URL", () => {
    expect(() =>
      validateStepConfig("ACTION", {
        ...httpConfig,
        url: "not-a-url",
      }),
    ).toThrow(BadRequestException);
  });

  it("rejects an invalid cron expression", () => {
    expect(() =>
      validateStepConfig("TRIGGER", {
        ...scheduleConfig,
        cron: "99 99 * * *",
      }),
    ).toThrow(BadRequestException);
  });

  it("rejects an unsupported operation", () => {
    expect(() =>
      validateStepConfig("ACTION", {
        operation: "UNKNOWN",
      }),
    ).toThrow(BadRequestException);
  });
});
