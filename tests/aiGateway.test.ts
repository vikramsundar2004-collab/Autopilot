import { afterEach, describe, expect, it, vi } from "vitest";

import { AiGateway } from "../src/main/aiGateway";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AiGateway", () => {
  it("uses the Supabase-authenticated AI proxy before any local OpenAI key", async () => {
    process.env.AUTOPILOT_AI_PROXY_URL = "https://autopilot.example.com/";
    process.env.AUTOPILOT_OPENAI_API_KEY = "";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, outputText: "Proxy answer", model: "gpt-5.5" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new AiGateway(async () => "session-token").generateText({ prompt: "Summarize this page" });

    expect(result).toEqual(expect.objectContaining({ success: true, outputText: "Proxy answer", provider: "proxy" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://autopilot.example.com/api/ai",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer session-token"
        })
      })
    );
  });

  it("routes routine proxy calls to the cheaper configured model tier", async () => {
    process.env.AUTOPILOT_AI_PROXY_URL = "https://autopilot.example.com/api/ai";
    process.env.AUTOPILOT_OPENAI_MODEL = "gpt-frontier";
    process.env.AUTOPILOT_OPENAI_MODEL_MINI = "gpt-mini";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, outputText: "Short page summary", model: "gpt-mini" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new AiGateway(async () => "session-token").generateText({
      prompt: "Summarize this page",
      task: "browser_summary"
    });
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const requestBody = JSON.parse(String(requestInit.body)) as { model?: string; task?: string };

    expect(result).toEqual(expect.objectContaining({ success: true, model: "gpt-mini" }));
    expect(requestBody).toEqual(expect.objectContaining({ model: "gpt-mini", task: "browser_summary" }));
  });

  it("uses the specialized Supabase artifact endpoint when configured", async () => {
    process.env.AUTOPILOT_AI_ARTIFACT_URL = "https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/ai-artifact";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, artifact: { title: "Q4 deck" }, trace: { attempts: 1 }, model: "gpt-5.5" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new AiGateway(async () => "session-token").generateArtifact({
      kind: "slide_deck",
      prompt: "Make the Q4 update deck"
    });
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const requestBody = JSON.parse(String(requestInit.body)) as { model?: string; task?: string };

    expect(result).toEqual(expect.objectContaining({ success: true, artifact: { title: "Q4 deck" }, provider: "proxy" }));
    expect(requestBody).toEqual(expect.objectContaining({ task: "artifact_generation" }));
    expect(requestBody).not.toHaveProperty("model");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/ai-artifact",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer session-token"
        })
      })
    );
  });

  it("uses the specialized Supabase email action endpoint when configured", async () => {
    process.env.AUTOPILOT_AI_EMAIL_ACTIONS_URL = "https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/ai-email-actions";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, configured: true, actions: [{ title: "Reply to Maya" }], model: "gpt-5.5" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new AiGateway(async () => "session-token").analyzeEmailActions({
      messages: [{ id: "email-1", subject: "Need response" }]
    });
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const requestBody = JSON.parse(String(requestInit.body)) as { model?: string; task?: string };

    expect(result).toEqual(expect.objectContaining({ success: true, actions: [{ title: "Reply to Maya" }], provider: "proxy" }));
    expect(requestBody).toEqual(expect.objectContaining({ task: "email_triage" }));
    expect(requestBody).not.toHaveProperty("model");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/ai-email-actions",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer session-token"
        })
      })
    );
  });

  it("fails honestly when public users are not signed in and no local dev key exists", async () => {
    process.env.AUTOPILOT_AI_PROXY_URL = "https://autopilot.example.com/api/ai";
    process.env.AUTOPILOT_OPENAI_API_KEY = "";
    process.env.OPENAI_API_KEY = "";

    const result = await new AiGateway(async () => null).generateText({ prompt: "Build a draft" });

    expect(result.success).toBe(false);
    expect(result.reason).toContain("Sign into Autopilot");
  });

  it("keeps the local OpenAI key as a development fallback only", async () => {
    process.env.AUTOPILOT_AI_PROXY_URL = "";
    process.env.AUTOPILOT_OPENAI_API_KEY = "sk-local-dev";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: "Local dev answer" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new AiGateway().generateText({ prompt: "Draft something useful" });

    expect(result).toEqual(expect.objectContaining({ success: true, outputText: "Local dev answer", provider: "local" }));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/v1/responses" }),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer sk-local-dev"
        })
      })
    );
  });

  it("omits custom chat temperature for GPT-5-class local fallback models", async () => {
    process.env.AUTOPILOT_AI_PROXY_URL = "";
    process.env.AUTOPILOT_OPENAI_API_KEY = "sk-local-dev";
    process.env.AUTOPILOT_OPENAI_MODEL = "gpt-5.5";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Responses timed out" } }), {
          status: 504,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "Chat fallback answer" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new AiGateway().generateText({ prompt: "Build a Snake game", task: "coding_agent" });
    const chatRequestInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const chatRequestBody = JSON.parse(String(chatRequestInit.body)) as { model?: string; temperature?: number };

    expect(result).toEqual(expect.objectContaining({ success: true, outputText: "Chat fallback answer", provider: "local" }));
    expect(chatRequestBody).toEqual(expect.objectContaining({ model: "gpt-5.5" }));
    expect(chatRequestBody).not.toHaveProperty("temperature");
  });

  it("falls back to chat JSON mode when Responses returns prose for a JSON patch", async () => {
    process.env.AUTOPILOT_AI_PROXY_URL = "";
    process.env.AUTOPILOT_OPENAI_API_KEY = "sk-local-dev";
    process.env.AUTOPILOT_OPENAI_MODEL = "gpt-5.5";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ output_text: "Here is the plan, then the code." }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "{\"explanation\":\"Built Snake\",\"newContent\":\"<main>Snake</main>\"}" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new AiGateway().generateText({
      prompt: "Return a patch",
      task: "coding_agent",
      responseFormat: "json_object"
    });
    const chatRequestInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const chatRequestBody = JSON.parse(String(chatRequestInit.body)) as { response_format?: { type?: string } };

    expect(result).toEqual(expect.objectContaining({ success: true, outputText: "{\"explanation\":\"Built Snake\",\"newContent\":\"<main>Snake</main>\"}" }));
    expect(chatRequestBody.response_format).toEqual({ type: "json_object" });
  });

  it("does not use local OpenAI keys in packaged policy mode unless explicitly allowed", async () => {
    process.env.AUTOPILOT_FORCE_PACKAGED_AI_POLICY = "1";
    process.env.AUTOPILOT_AI_PROXY_URL = "";
    process.env.AUTOPILOT_OPENAI_API_KEY = "sk-should-not-ship";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await new AiGateway().generateText({ prompt: "Draft something useful" });

    expect(result.success).toBe(false);
    expect(result.reason).toContain("AI is not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
