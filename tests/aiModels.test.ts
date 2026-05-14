import { describe, expect, it } from "vitest";

import { createAiModelRoutingConfig, selectAiModel } from "../src/shared/aiModels";

describe("AI model routing", () => {
  it("routes high-volume tasks to cheaper configured tiers", () => {
    const env: Record<string, string> = {
      AUTOPILOT_OPENAI_MODEL_FRONTIER: "gpt-frontier",
      AUTOPILOT_OPENAI_MODEL_STANDARD: "gpt-standard",
      AUTOPILOT_OPENAI_MODEL_MINI: "gpt-mini",
      AUTOPILOT_OPENAI_MODEL_NANO: "gpt-nano"
    };
    const config = createAiModelRoutingConfig((name) => env[name]);

    expect(selectAiModel("email_triage", config).model).toBe("gpt-standard");
    expect(selectAiModel("email_organization", config).model).toBe("gpt-standard");
    expect(selectAiModel("home_recap", config).model).toBe("gpt-standard");
    expect(selectAiModel("productivity_calendar_chat", config).model).toBe("gpt-mini");
    expect(selectAiModel("chat_action_extract", config).model).toBe("gpt-mini");
    expect(selectAiModel("design_prompt_translate", config).model).toBe("gpt-mini");
    expect(selectAiModel("coding_prompt_translate", config).model).toBe("gpt-mini");
    expect(selectAiModel("artifact_critique", config).model).toBe("gpt-mini");
    expect(selectAiModel("artifact_quality", config).model).toBe("gpt-nano");
    expect(selectAiModel("design_prompt_suggestions", config).model).toBe("gpt-nano");
    expect(selectAiModel("artifact_draft", config).model).toBe("gpt-standard");
    expect(selectAiModel("coding_agent", config).model).toBe("gpt-frontier");
    expect(selectAiModel("design_generation", config).model).toBe("gpt-frontier");
    expect(selectAiModel("coding_browser_feedback", config).model).toBe("gpt-mini");
  });

  it("falls back to the frontier model when cheaper tiers are not configured", () => {
    const env: Record<string, string> = {
      AUTOPILOT_OPENAI_MODEL: "gpt-5.5"
    };
    const config = createAiModelRoutingConfig((name) => env[name]);

    expect(selectAiModel("email_triage", config).model).toBe("gpt-5.5");
    expect(selectAiModel("artifact_revision", config).model).toBe("gpt-5.5");
  });

  it("respects explicit model overrides for one-off calls", () => {
    const config = createAiModelRoutingConfig(() => "gpt-default");

    expect(selectAiModel("email_triage", config, "gpt-explicit").model).toBe("gpt-explicit");
  });
});
