import { randomUUIDv7 } from "bun";

import { UserId } from "~/server/shared/ids";

const newUserId = () => UserId.trust(randomUUIDv7());

export const DEMO_BRANCH_1 = randomUUIDv7();
export const DEMO_BRANCH_2 = randomUUIDv7();
export const DEMO_BRANCH_3 = randomUUIDv7();

export const DEMO_TEAM_ALPHA = randomUUIDv7();
export const DEMO_TEAM_BRAVO = randomUUIDv7();
export const DEMO_TEAM_NORTE = randomUUIDv7();
export const DEMO_TEAM_NORTE_B = randomUUIDv7();

export const VALERIA = newUserId();
export const DIEGO = newUserId();
export const CAMILA = newUserId();
export const JOSEFINA = newUserId();
export const MATIAS = newUserId();
export const LUCIA = newUserId();
export const ANDRES = newUserId();
export const NICOLAS = newUserId();
export const SOFIA = newUserId();
export const GABRIEL = newUserId();
export const ELENA = newUserId();
export const ROBERTO = newUserId();
export const ISABELLA = newUserId();
export const MANUEL = newUserId();
export const FERNANDA = newUserId();
export const CLAUDIA = newUserId();
export const PABLO = newUserId();
export const MARINA = newUserId();
export const MARIANA = newUserId();
export const JOSE = newUserId();
