import { describe, expect, it } from "vitest";

import { parseEmailSender } from "../src/shared/email";

describe("parseEmailSender", () => {
  it("parses display name and address", () => {
    expect(parseEmailSender("Vikram Sundar <vikram@example.com>")).toEqual({
      name: "Vikram Sundar",
      email: "vikram@example.com"
    });
  });

  it("handles bare sender strings", () => {
    expect(parseEmailSender("updates@example.com")).toEqual({
      name: "updates@example.com",
      email: ""
    });
  });
});

