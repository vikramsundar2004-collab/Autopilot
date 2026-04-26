import { describe, expect, it } from "vitest";

import {
  AUTOPILOT_HOME_LABEL,
  AUTOPILOT_HISTORY_LABEL,
  AUTOPILOT_HISTORY_PAGE_MARKER,
  AUTOPILOT_PDF_LABEL,
  AUTOPILOT_PDF_NOTICE_MARKER,
  createHistoryUrl,
  closeTab,
  createTab,
  getDisplayUrl,
  isHistoryPageUrl,
  isHomeUrl,
  isPdfResponseHeaders,
  isPdfUrl,
  normalizeAddressInput,
  readableTitle
} from "../src/shared/browserModel";

describe("normalizeAddressInput", () => {
  it("keeps explicit urls intact", () => {
    expect(normalizeAddressInput("https://example.com/docs")).toBe("https://example.com/docs");
  });

  it("adds https to hostnames", () => {
    expect(normalizeAddressInput("example.com/path")).toBe("https://example.com/path");
  });

  it("uses http for localhost", () => {
    expect(normalizeAddressInput("localhost:5173")).toBe("http://localhost:5173");
  });

  it("uses http for local development addresses", () => {
    expect(normalizeAddressInput("localhost:3000/dashboard")).toBe("http://localhost:3000/dashboard");
    expect(normalizeAddressInput("127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
    expect(normalizeAddressInput("0.0.0.0:4173")).toBe("http://0.0.0.0:4173");
    expect(normalizeAddressInput("192.168.1.22:5173")).toBe("http://192.168.1.22:5173");
    expect(normalizeAddressInput("host.docker.internal:8080")).toBe("http://host.docker.internal:8080");
    expect(normalizeAddressInput("[::1]:5173")).toBe("http://[::1]:5173");
  });

  it("searches plain text", () => {
    expect(normalizeAddressInput("calm browser themes")).toBe("https://www.google.com/search?q=calm%20browser%20themes");
  });

  it("returns home for the internal home label", () => {
    expect(isHomeUrl(normalizeAddressInput(AUTOPILOT_HOME_LABEL))).toBe(true);
  });

  it("returns history for internal history aliases", () => {
    expect(isHistoryPageUrl(normalizeAddressInput(AUTOPILOT_HISTORY_LABEL))).toBe(true);
    expect(isHistoryPageUrl(normalizeAddressInput("autopilot/history"))).toBe(true);
  });

  it("keeps generated internal history pages intact", () => {
    const historyUrl = createHistoryUrl([{ title: "Example", url: "https://example.com/docs", visitedAt: 1000 }]);

    expect(normalizeAddressInput(historyUrl)).toBe(historyUrl);
  });
});

describe("PDF detection", () => {
  it("recognizes PDF URLs without matching lookalike extensions", () => {
    expect(isPdfUrl("https://example.com/report.pdf")).toBe(true);
    expect(isPdfUrl("https://example.com/report.PDF?download=1")).toBe(true);
    expect(isPdfUrl("https://example.com/viewer?file=semester-plan.pdf&download=1")).toBe(true);
    expect(isPdfUrl("https://example.com/report.pdfx")).toBe(false);
    expect(isPdfUrl("https://example.com/page")).toBe(false);
  });

  it("recognizes PDF responses by content headers", () => {
    expect(isPdfResponseHeaders({ "Content-Type": ["application/pdf; charset=binary"] })).toBe(true);
    expect(isPdfResponseHeaders({ "content-disposition": ["attachment; filename=\"schedule.pdf\""] })).toBe(true);
    expect(isPdfResponseHeaders({ "Content-Type": ["text/html"] })).toBe(false);
  });

  it("displays Autopilot PDF notices as an internal PDF page", () => {
    const noticeUrl = `data:text/html;charset=utf-8,${encodeURIComponent(
      `<!doctype html><body ${AUTOPILOT_PDF_NOTICE_MARKER}>PDF opened externally</body>`
    )}`;

    expect(getDisplayUrl(noticeUrl)).toBe(AUTOPILOT_PDF_LABEL);
    expect(readableTitle("", noticeUrl)).toBe("PDF opened externally");
  });

  it("displays Autopilot history as an internal history page", () => {
    const historyUrl = createHistoryUrl([{ title: "Example", url: "https://example.com/docs", visitedAt: 1000 }]);

    expect(getDisplayUrl(historyUrl)).toBe(AUTOPILOT_HISTORY_LABEL);
    expect(readableTitle("", historyUrl)).toBe("History");
    expect(decodeURIComponent(historyUrl)).toContain(AUTOPILOT_HISTORY_PAGE_MARKER);
    expect(decodeURIComponent(historyUrl)).toContain("Example");
  });
});

describe("closeTab", () => {
  it("activates the next neighbor when a tab closes", () => {
    const first = createTab("https://a.test", "A");
    const second = createTab("https://b.test", "B");
    const third = createTab("https://c.test", "C");

    const result = closeTab([first, second, third], second.id);

    expect(result.tabs.map((tab) => tab.id)).toEqual([first.id, third.id]);
    expect(result.activeId).toBe(third.id);
  });

  it("creates a fallback tab after the last tab closes", () => {
    const only = createTab("https://a.test", "A");
    const fallback = createTab("https://fallback.test", "Fallback");

    const result = closeTab([only], only.id, fallback);

    expect(result.tabs).toEqual([fallback]);
    expect(result.activeId).toBe(fallback.id);
  });
});

describe("readableTitle", () => {
  it("uses the hostname when title is missing", () => {
    expect(readableTitle("", "https://www.example.com/path")).toBe("example.com");
  });

  it("uses New tab for home", () => {
    expect(readableTitle("", AUTOPILOT_HOME_LABEL)).toBe("New tab");
  });
});
