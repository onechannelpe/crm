import { query } from "@solidjs/router";

import { getTeamDirectory } from "~/actions/team";

export const teamDirectoryQuery = query(getTeamDirectory, "teamDirectory");
