import { BranchId, TeamId, UserId } from "~/domain/ids";

import { stableSeedId } from "../shared/stable-id";

const userId = (key: string) => UserId.trust(stableSeedId(`user:${key}`));

export const DEMO_BRANCH_1 = BranchId.trust(stableSeedId("branch:lima-centro"));
export const DEMO_BRANCH_2 = BranchId.trust(stableSeedId("branch:lima-norte"));
export const DEMO_BRANCH_3 = BranchId.trust(stableSeedId("branch:chiclayo"));

export const DEMO_TEAM_ALPHA = TeamId.trust(stableSeedId("team:alpha"));
export const DEMO_TEAM_BRAVO = TeamId.trust(stableSeedId("team:bravo"));
export const DEMO_TEAM_NORTE = TeamId.trust(stableSeedId("team:norte"));
export const DEMO_TEAM_NORTE_B = TeamId.trust(stableSeedId("team:norte-b"));

export const VALERIA = userId("valeria");
export const DIEGO = userId("diego");
export const CAMILA = userId("camila");
export const JOSEFINA = userId("josefina");
export const MATIAS = userId("matias");
export const LUCIA = userId("lucia");
export const ANDRES = userId("andres");
export const NICOLAS = userId("nicolas");
export const SOFIA = userId("sofia");
export const GABRIEL = userId("gabriel");
export const ELENA = userId("elena");
export const ROBERTO = userId("roberto");
export const ISABELLA = userId("isabella");
export const MANUEL = userId("manuel");
export const FERNANDA = userId("fernanda");
export const CLAUDIA = userId("claudia");
export const PABLO = userId("pablo");
export const MARINA = userId("marina");
export const MARIANA = userId("mariana");
export const JOSE = userId("jose");
