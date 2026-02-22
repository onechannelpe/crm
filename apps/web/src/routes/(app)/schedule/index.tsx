import { AppPage } from "~/components/layout/page";

export default function SchedulePage() {
  return (
    <AppPage>
      <div style={{ padding: "var(--font-20)" }}>
        <h1>Schedule</h1>
        <p
          style={{
            color: "var(--muted-foreground)",
            "margin-top": "var(--font-12)",
          }}
        >
          Your upcoming appointments and events will appear here.
        </p>
      </div>
    </AppPage>
  );
}
