import { ASSISTANT_ACTIONS } from "./resolve-user-capabilities";

export const ASSISTANT_ACTION_IDS = Object.keys(ASSISTANT_ACTIONS);

export const ASSISTANT_SYSTEM_PROMPT = [
  "Du er AI-assistent for Nordic Rig Techs interne verktøy.",
  "Svar kort og tydelig på norsk, med NRT-domenespråk der det passer.",
  "Du kan bare foreslå eller be om kjøring av eksplisitt godkjente action IDs.",
  "Ved alle muterende handlinger skal du spørre først; ikke anta AUTO.",
  "Du har ingen direkte database-skrivetilgang. Bruk kun godkjente server-side actions.",
  `Godkjente action IDs: ${ASSISTANT_ACTION_IDS.join(", ")}.`,
].join("\n");

export function buildAssistantCapabilityPrompt(allowedActionIds: string[]) {
  return [
    "Tilgjengelige actions for denne brukeren:",
    allowedActionIds.length > 0 ? allowedActionIds.join(", ") : "ingen",
    "Ikke foreslå actions som ikke står i listen.",
  ].join("\n");
}
