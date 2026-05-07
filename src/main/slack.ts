import type { ProductivityConnectorStatus } from "../shared/productivity.js";
import type { SlackMessageSummary } from "./productivityTasks.js";

type SlackHistoryResponse = {
  ok?: boolean;
  error?: string;
  messages?: Array<{
    type?: string;
    user?: string;
    username?: string;
    text?: string;
    ts?: string;
    thread_ts?: string;
  }>;
};

type SlackChannelResponse = {
  ok?: boolean;
  error?: string;
  channel?: {
    name?: string;
  };
};

export type SlackSyncResult =
  | {
      success: true;
      messages: SlackMessageSummary[];
      status: ProductivityConnectorStatus;
    }
  | {
      success: false;
      messages: SlackMessageSummary[];
      status: ProductivityConnectorStatus;
      reason: string;
    };

const SLACK_API_BASE = "https://slack.com/api";
const SLACK_REQUEST_TIMEOUT_MS = 15_000;

export class SlackService {
  getStatus(): ProductivityConnectorStatus {
    const token = getSlackToken();
    const channels = getSlackChannelIds();
    if (!token) {
      return {
        id: "slack",
        label: "Slack",
        connected: false,
        configured: false,
        reason: "Set AUTOPILOT_SLACK_BOT_TOKEN to enable Slack sync."
      };
    }

    if (channels.length === 0) {
      return {
        id: "slack",
        label: "Slack",
        connected: false,
        configured: true,
        reason: "Set AUTOPILOT_SLACK_CHANNEL_IDS to choose channels Autopilot can read."
      };
    }

    return {
      id: "slack",
      label: "Slack",
      connected: true,
      configured: true
    };
  }

  async syncMessages(): Promise<SlackSyncResult> {
    const status = this.getStatus();
    if (!status.connected) {
      return {
        success: false,
        messages: [],
        status,
        reason: status.reason ?? "Slack is not connected."
      };
    }

    const token = getSlackToken();
    const messages: SlackMessageSummary[] = [];
    try {
      for (const channelId of getSlackChannelIds()) {
        const channelName = await this.getChannelName(token, channelId);
        const url = new URL(`${SLACK_API_BASE}/conversations.history`);
        url.searchParams.set("channel", channelId);
        url.searchParams.set("limit", "30");
        const response = await slackGetJson<SlackHistoryResponse>(url.toString(), token);
        if (!response.ok) {
          throw new Error(response.error || `Slack returned an error for ${channelId}.`);
        }

        for (const message of response.messages ?? []) {
          if (message.type !== "message" || !message.text || !message.ts) {
            continue;
          }
          messages.push({
            id: `${channelId}:${message.ts}`,
            channelId,
            channelName,
            user: message.user || message.username || "Slack",
            text: message.text,
            url: `slack://channel?team=&id=${encodeURIComponent(channelId)}&message=${encodeURIComponent(message.ts)}`,
            createdAt: Number.parseFloat(message.ts) * 1000
          });
        }
      }
      return {
        success: true,
        messages,
        status: {
          ...status,
          lastSyncedAt: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        messages,
        status,
        reason: error instanceof Error ? error.message : "Slack sync failed."
      };
    }
  }

  private async getChannelName(token: string, channelId: string): Promise<string> {
    const url = new URL(`${SLACK_API_BASE}/conversations.info`);
    url.searchParams.set("channel", channelId);
    const response = await slackGetJson<SlackChannelResponse>(url.toString(), token);
    return response.ok && response.channel?.name ? response.channel.name : channelId;
  }
}

async function slackGetJson<T>(url: string, token: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SLACK_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json"
      },
      signal: controller.signal
    });
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function getSlackToken(): string {
  return (process.env.AUTOPILOT_SLACK_BOT_TOKEN || process.env.SLACK_BOT_TOKEN || "").trim();
}

function getSlackChannelIds(): string[] {
  return (process.env.AUTOPILOT_SLACK_CHANNEL_IDS || "")
    .split(",")
    .map((channelId) => channelId.trim())
    .filter(Boolean)
    .slice(0, 8);
}
