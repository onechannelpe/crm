import { redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { getCookie, getEvent } from "vinxi/http";

export async function requireSession() {
  const event = getRequestEvent();
  const session = event?.locals.session || getCookie(getEvent(), "session");

  if (!session) {
    throw redirect("/login");
  }

  return session;
}
