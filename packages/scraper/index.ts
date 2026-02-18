import { select, input } from "@inquirer/prompts";

import { getDniInfo, type DniData } from "./dni.js";
import { getRucInfo, type RucData } from "./ruc.js";

type QueryResult = RucData | DniData | null;

async function main() {
  const docType = await select({
    message: "Select document type",
    choices: [
      { name: "RUC (11 digits)", value: "ruc" },
      { name: "DNI (8 digits)", value: "dni" },
    ],
  });

  let data: QueryResult;

  if (docType === "ruc") {
    const ruc = await input({
      message: "Enter RUC (11 digits)",
      validate: (v) =>
        v.length === 11 && /^\d+$/.test(v) ? true : "Invalid RUC",
    });
    data = await getRucInfo(ruc);
  } else {
    const dni = await input({
      message: "Enter DNI (8 digits)",
      validate: (v) =>
        v.length === 8 && /^\d+$/.test(v) ? true : "Invalid DNI",
    });
    data = await getDniInfo(dni);
  }

  if (!data || Object.keys(data).length === 0) {
    console.error("No data found");
    process.exit(1);
  }

  console.log("\n");
  console.log(JSON.stringify(data, null, 2));
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
