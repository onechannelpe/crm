import { getCookie } from "vinxi/http";
import { redirect } from "@solidjs/router";
import { getEvent } from "vinxi/http";

export async function requireSession() {
    const event = getEvent();
    const session = getCookie(event, "session");

    if (!session) {
        throw redirect("/login");
    }

    return session;
}
