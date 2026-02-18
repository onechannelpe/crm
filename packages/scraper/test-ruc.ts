#!/usr/bin/env bun
import { getRucInfo } from "./ruc.js";

const ruc = "20566158061";
console.log(`Testing RUC lookup for: ${ruc}\n`);

const data = await getRucInfo(ruc);

if (data) {
  console.log(JSON.stringify(data, null, 2));
} else {
  console.error("No data found");
  process.exit(1);
}
