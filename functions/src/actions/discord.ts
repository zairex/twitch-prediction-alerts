import axios from "axios";
import type { OutcomeData, PredictionData } from "../types";
import { render } from "mustache";

export type OutcomeEmoji = [
  outcome1: string,
  outcome2: string,
  outcome3: string,
  outcome4: string,
  outcome5: string,
  outcome6: string,
  outcome7: string,
  outcome8: string,
  outcome9: string,
  outcome10: string,
];

export interface DiscordWebhookAction {
  readonly kind: "discord_webhook";
  readonly id: string;
  readonly token: string;
  readonly role: string;
  readonly emoji: OutcomeEmoji;
}

const MESSAGE_TEMPLATE = `\
Hey <@&{{{action.role}}}>, *{{{prediction.game.name}}}* Prediction! You have {{{prediction.prediction_window_seconds}}} seconds.

**{{{prediction.title}}}**
{{#outcomes}}
{{{emoji}}} {{{title}}}
{{/outcomes}}
`;

export async function executeDiscordWebhookActionOnCreate(action: DiscordWebhookAction, prediction: PredictionData, outcomes: readonly OutcomeData[]): Promise<string | undefined> {
  const content = render(MESSAGE_TEMPLATE, {
    action,
    prediction,
    outcomes: outcomes.map((outcome) => {
      const emojiId = action.emoji[outcome.index - 1];
      return {
        ...outcome,
        emoji: `<:blue${outcome.index}:${emojiId}>`,
      };
    }),
  });
  const params = {
    content,
    allowed_mentions: {
      parse: ["users", "roles"],
      users: [],
    },
  };

  const response = await axios(`https://discord.com/api/webhooks/${action.id}/${action.token}?wait=true`, {
    method: "POST",
    data: params,
  });
  return response.data.id as string;
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
    throw new Error(`Unable to find winning_outcome_id=${prediction.winning_outcome_id} among [${outcomes.map((outcome) => outcome.id).join(", ")}]`);
  }

  const totalPoints = outcomes.reduce((total, outcome) => total + outcome.total_points, 0);
  const winningReturn = totalPoints / (winningOutcome.total_points + 0.01);
  const embed: Embed = {
    title: `<:blue${winningOutcome.index}:${action.emoji[winningOutcome.index - 1]}> ${winningOutcome.title}`,
    description: `${winningOutcome.total_users} users won ${totalPoints} points with a 1:${winningReturn.toFixed(2)} return`,
    color: 3701503,
    timestamp: prediction.ended_at?.toDate().toISOString(),
  };

  await axios(`https://discord.com/api/webhooks/${action.id}/${action.token}/messages/${messageId}`, {
    method: "PATCH",
    data: { embeds: [embed] },
  });
}
