import type { AccessLevel } from "@/lib/access/get-current-access";

export const ASSISTANT_ACTIONS = {
  "assistant.plan": {
    label: "Planlegg",
    minimumAccess: "USER",
    mutating: false,
  },
  "assistant.ask": {
    label: "Svar på spørsmål",
    minimumAccess: "USER",
    mutating: false,
  },
  "settings.aiModel.update": {
    label: "Endre AI-modell",
    minimumAccess: "ADMIN",
    mutating: true,
  },
  "syncConflict.resolve": {
    label: "Løs synkkonflikt",
    minimumAccess: "ADMIN",
    mutating: true,
  },
  "syncConflict.ignore": {
    label: "Ignorer synkkonflikt",
    minimumAccess: "ADMIN",
    mutating: true,
  },
} as const satisfies Record<
  string,
  { label: string; minimumAccess: Exclude<AccessLevel, "MINIMUM">; mutating: boolean }
>;

export type AssistantActionId = keyof typeof ASSISTANT_ACTIONS;

export type UserAssistantCapabilities = {
  canUseAssistant: boolean;
  allowedActionIds: AssistantActionId[];
};

const ACCESS_RANK: Record<AccessLevel, number> = {
  MINIMUM: 0,
  USER: 1,
  ADMIN: 2,
};

export function isAssistantActionId(
  actionId: string
): actionId is AssistantActionId {
  return Object.prototype.hasOwnProperty.call(ASSISTANT_ACTIONS, actionId);
}

export function resolveUserCapabilities(
  access: AccessLevel
): UserAssistantCapabilities {
  const allowedActionIds = Object.entries(ASSISTANT_ACTIONS)
    .filter(([, action]) => ACCESS_RANK[access] >= ACCESS_RANK[action.minimumAccess])
    .map(([actionId]) => actionId as AssistantActionId);

  return {
    canUseAssistant: allowedActionIds.length > 0,
    allowedActionIds,
  };
}
