import axios from "axios";
import type { OutcomeData, PredictionData } from "../types";
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
Hey <@&{{{action.role}}}>, *{{{prediction.game.name}}}* Prediction! You have {{{prediction.prediction_window_seconds}}} seconds.

**{{{prediction.title}}}**
{{#outcomes}}
<:{{{action.blue_emoji.name}}}:{{{action.blue_emoji.id}}}> ({{index}}) {{{title}}}
{{/outcomes}}
`;

export async function executeDiscordWebhookActionOnCreate(action: DiscordWebhookAction, prediction: PredictionData, outcomes: readonly OutcomeData[]): Promise<string | undefined> {
  const content = render(MESSAGE_TEMPLATE, { action, prediction, outcomes });
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

export async function executeDiscordWebhookActionOnUpdate(action: DiscordWebhookAction, prediction: PredictionData, outcomes: readonly OutcomeData[], messageId: string): Promise<void> {
  const winningOutcome = outcomes.find((outcome) => outcome.id === prediction.winning_outcome_id);
  if (!winningOutcome) {
    console.error(`Unable to find winning_outcome_id=${prediction.winning_outcome_id}`);
    return;
  }
  const totalPoints = outcomes.reduce((total, outcome) => total + outcome.total_points, 0);
  const winningReturn = totalPoints / (winningOutcome.total_points + 0.01);
  const embed: Embed = {
    title: `<:${action.blue_emoji.name}:${action.blue_emoji.id}> ${winningOutcome.title}`,
    description: `${winningOutcome.total_users} users won ${totalPoints} points with a 1:${winningReturn.toFixed(2)} return`,
    color: 3701503,
    timestamp: prediction.ended_at?.toDate().toISOString(),
  };

  try {
    await axios(`https://discord.com/api/webhooks/${action.id}/${action.token}/messages/${messageId}`, {
      method: "PATCH",
      data: { embeds: [embed] },
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
