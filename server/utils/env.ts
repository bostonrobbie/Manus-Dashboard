import { loadManusConfig } from "@server/config/manus";

export const env = loadManusConfig();
export type Env = typeof env;
