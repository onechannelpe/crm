import { A } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";

import Building2Icon from "~/components/icons/building-2";
import CalendarDaysIcon from "~/components/icons/calendar-days";
import MailIcon from "~/components/icons/mail";
import PhoneIcon from "~/components/icons/phone";

import { toInitial } from "../display";
import type { CompanyGroup } from "../grouping";
import {
  DetailSection,
  DrawerHeader,
  ExpandablePillList,
  FieldRow,
  styles,
} from "./drawer-primitives";
import { createEnrichmentSlot, type OverlayChangeHandler } from "./enrichment";
import { buildPersonHref } from "./links";

const PANEL_PAGE_SIZE = 5;

interface CompanyDetailDrawerProps {
  group: CompanyGroup;
  onClose: () => void;
  onOverlayChange?: OverlayChangeHandler;
}

export function CompanyDetailDrawer(props: CompanyDetailDrawerProps) {
  const [visiblePeopleCount, setVisiblePeopleCount] =
    createSignal(PANEL_PAGE_SIZE);
  const visiblePeople = createMemo(() =>
    props.group.people.slice(0, visiblePeopleCount()),
  );
  const hiddenPeopleCount = createMemo(() =>
    Math.max(0, props.group.people.length - visiblePeople().length),
  );
  const row = () => props.group.rows[0];
  const org = () => row().org;
  const ruc = () => props.group.ruc?.trim() ?? null;

  const rucSlot = createEnrichmentSlot({
    type: "ruc",
    key: ruc,
    onOverlayChange: props.onOverlayChange,
  });

  const displayName = () =>
    rucSlot.overlay()?.legalName ?? props.group.name ?? null;

  const representatives = createMemo(() => {
    const dedup = new Set<string>();
    const items: Array<{
      name: string;
      roleName: string | null;
      docType: string | null;
      docNumber: string | null;
    }> = [];

    for (const searchRow of props.group.rows) {
      const role = searchRow.role;
      if (!role) continue;
      const fallbackName =
        searchRow.person.name?.trim() || searchRow.person.dni;
      const name = role.rep_name?.trim() || fallbackName;
      const roleName = role.name?.trim() || null;
      const docType = role.rep_doc_type?.trim() || null;
      const docNumber = role.rep_doc_number?.trim() || null;
      const key = `${name}|${roleName ?? ""}|${docType ?? ""}|${docNumber ?? ""}`;
      if (!name || dedup.has(key)) continue;
      dedup.add(key);
      items.push({ name, roleName, docType, docNumber });
    }

    return items;
  });

  return (
    <div class={styles.drawer}>
      <DrawerHeader
        initial={toInitial(displayName() ?? "?")}
        title={displayName() ?? "—"}
        subtitle={ruc() ? `RUC ${ruc()}` : null}
        onClose={props.onClose}
        squareAvatar
        enrichment={
          ruc()
            ? { status: rucSlot.status(), onRequest: rucSlot.request }
            : undefined
        }
      />

      <div class={styles.body}>
        <Show when={org()}>
          {(company) => (
            <DetailSection title="Detalles">
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Nombre"
                value={company().name}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Razón"
                value={company().trade_name}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="RUC"
                value={company().ruc}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Tipo"
                value={company().company_type}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Estado"
                value={company().status}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Condición"
                value={company().condition}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Dirección"
                value={company().fiscal_address}
              />
              <FieldRow
                icon={<CalendarDaysIcon size={16} />}
                label="Fecha de registro"
                value={company().registration_date}
              />
              <FieldRow
                icon={<CalendarDaysIcon size={16} />}
                label="Activa desde"
                value={company().activity_start_date}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Actividad"
                value={company().economic_activity}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Sector"
                value={company().line_of_business}
              />
            </DetailSection>
          )}
        </Show>

        <Show when={props.group.people.length > 0}>
          <DetailSection
            title="Contactos"
            linkHref={
              props.group.ruc
                ? `/search?type=ruc&query=${encodeURIComponent(props.group.ruc)}&limit=20`
                : undefined
            }
            linkLabel={
              props.group.ruc
                ? `Todos (${props.group.people.length})`
                : undefined
            }
          >
            <For each={visiblePeople()}>
              {(person) => {
                const personName = () => person.name || person.dni;
                return (
                  <A
                    class={styles.recordItem}
                    href={buildPersonHref(personName(), person.dni || null)}
                    title={`${personName()}${person.dni ? ` · ${person.dni}` : ""}`}
                  >
                    <span class={styles.recordItemMain}>{personName()}</span>
                    <span class={styles.recordItemMeta}>
                      {person.dni ? `DNI ${person.dni}` : "Abrir búsqueda"}
                    </span>
                  </A>
                );
              }}
            </For>
            <Show when={hiddenPeopleCount() > 0}>
              <button
                type="button"
                class={styles.sectionMoreButton}
                onClick={() =>
                  setVisiblePeopleCount((count) => count + PANEL_PAGE_SIZE)
                }
              >
                +{hiddenPeopleCount()} más
              </button>
            </Show>
          </DetailSection>
        </Show>

        <Show when={representatives().length > 0}>
          <DetailSection title="Representantes">
            <For each={representatives()}>
              {(representative) => (
                <div class={styles.recordItem}>
                  <span class={styles.recordItemMain}>
                    {representative.name}
                  </span>
                  <span class={styles.recordItemMeta}>
                    {[
                      representative.roleName,
                      representative.docType && representative.docNumber
                        ? `${representative.docType} ${representative.docNumber}`
                        : representative.docNumber,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              )}
            </For>
          </DetailSection>
        </Show>

        <Show when={props.group.phones.length > 0}>
          <DetailSection title="Teléfonos">
            <div class={styles.fieldRow}>
              <span class={styles.fieldIcon}>
                <PhoneIcon size={16} />
              </span>
              <span class={styles.fieldLabel}>Números</span>
              <div class={styles.fieldValue}>
                <ExpandablePillList items={props.group.phones} />
              </div>
            </div>
          </DetailSection>
        </Show>

        <Show when={props.group.emails.length > 0}>
          <DetailSection title="Correos">
            <div class={styles.fieldRow}>
              <span class={styles.fieldIcon}>
                <MailIcon size={16} />
              </span>
              <span class={styles.fieldLabel}>Correos</span>
              <div class={styles.fieldValue}>
                <ExpandablePillList items={props.group.emails} />
              </div>
            </div>
          </DetailSection>
        </Show>
      </div>
    </div>
  );
}
