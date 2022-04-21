import axios from "axios";
import type { PredictionData } from "../types";
import { render } from "mustache";

export interface DiscordWebhookAction {
  readonly kind: "discord_webhook";
  readonly id: string;
  readonly token: string;
  readonly role: string;
  readonly blue_emoji: {
    readonly name: string;
    readonly id: string;
  };
  readonly pink_emoji: {
    readonly name: string;
    readonly id: string;
  };
}

const MESSAGE_TEMPLATE = `\
Hey <@&{{action.role}}>, *{{data.game.name}}* Prediction! You have {{data.prediction_window_seconds}} seconds.

**{{data.title}}**
<:{{action.blue_emoji.name}}:{{action.blue_emoji.id}}> {{data.outcomes.BLUE.title}}
<:{{action.pink_emoji.name}}:{{action.pink_emoji.id}}> {{data.outcomes.PINK.title}}
`;

export async function executeDiscordWebhookActionOnCreate(action: DiscordWebhookAction, data: PredictionData): Promise<string | undefined> {
  const content = render(MESSAGE_TEMPLATE, { action, data });
  const params = {
    content,
    allowed_mentions: {
      parse: ["users", "roles"],
      users: [],
    },
  };

  try {
    const response = await axios(`https://discord.com/api/webhooks/${action.id}/${action.token}?wait=true`, {
      method: "POST",
      data: params,
    });
    return response.data.id as string;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(error.message);
      if (error.response) {
        console.error(error.response?.status, error.response?.statusText);
        console.error(error.response?.headers);
        console.error(error.response?.data);
      }
    } else {
      console.error("Request failed", error);
    }
    return;
  }
}

interface Embed {
  readonly title: string;
  readonly description?: string;
  readonly color: number;
  readonly timestamp?: string;
}

export async function executeDiscordWebhookActionOnUpdate(action: DiscordWebhookAction, data: PredictionData, messageId: string): Promise<void> {
  const embeds: Embed[] = [];
  const totalPoints = data.outcomes.BLUE.total_points + data.outcomes.PINK.total_points;
  if (data.winning_outcome === "BLUE") {
    const blueReturn = totalPoints / (data.outcomes.BLUE.total_points + 0.01);
    embeds.push({
      title: `<:${action.blue_emoji.name}:${action.blue_emoji.id}> ${data.outcomes.BLUE.title}`,
      description: `${data.outcomes.BLUE.total_users} users won ${totalPoints} points with a 1:${blueReturn.toFixed(2)} return`,
      color: 3701503,
      timestamp: data.ended_at?.toDate().toISOString(),
    });
  } else if (data.winning_outcome === "PINK") {
    const pinkReturn = totalPoints / (data.outcomes.PINK.total_points + 0.01);
    embeds.push({
      title: `<:${action.pink_emoji.name}:${action.pink_emoji.id}> ${data.outcomes.PINK.title}`,
      description: `${data.outcomes.PINK.total_users} users won ${totalPoints} points with a 1:${pinkReturn.toFixed(2)} return`,
      color: 16056475,
      timestamp: data.ended_at?.toDate().toISOString(),
    });
  }

  try {
    await axios(`https://discord.com/api/webhooks/${action.id}/${action.token}/messages/${messageId}`, {
      method: "PATCH",
      data: { embeds },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(error.message);
      if (error.response) {
        console.error(error.response?.status, error.response?.statusText);
        console.error(error.response?.headers);
        console.error(error.response?.data);
      }
    } else {
      console.error("Request failed", error);
    }
  }
}
