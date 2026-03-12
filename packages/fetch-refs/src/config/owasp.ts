import type { SourceConfig } from "../core/types.ts";

const INCLUDED_CHEATSHEETS = new Set([
  "Authentication_Cheat_Sheet.md",
  "Authorization_Cheat_Sheet.md",
  "Browser_Extension_Vulnerabilities_Cheat_Sheet.md",
  "Clickjacking_Defense_Cheat_Sheet.md",
  "Content_Security_Policy_Cheat_Sheet.md",
  "Cookie_Theft_Mitigation_Cheat_Sheet.md",
  "Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.md",
  "Cross_Site_Scripting_Prevention_Cheat_Sheet.md",
  "File_Upload_Cheat_Sheet.md",
  "Forgot_Password_Cheat_Sheet.md",
  "Input_Validation_Cheat_Sheet.md",
  "Logging_Cheat_Sheet.md",
  "OAuth2_Cheat_Sheet.md",
  "Password_Storage_Cheat_Sheet.md",
  "Secrets_Management_Cheat_Sheet.md",
  "Server_Side_Request_Forgery_Prevention_Cheat_Sheet.md",
  "Session_Management_Cheat_Sheet.md",
  "Transport_Layer_Security_Cheat_Sheet.md",
]);

export const owaspConfig: SourceConfig = {
  name: "OWASP",
  repo: "https://github.com/OWASP/CheatSheetSeries.git",
  branch: "master",
  mounts: [{ repoPath: "cheatsheets", localPath: ".refs/owasp-cheatsheets" }],
  index: {
    markerStart: "<!-- OWASP-DOCS-START -->",
    markerEnd: "<!-- OWASP-DOCS-END -->",
    filter: (files) =>
      files.filter((file) => INCLUDED_CHEATSHEETS.has(`${file.name}.md`)),
  },
};
