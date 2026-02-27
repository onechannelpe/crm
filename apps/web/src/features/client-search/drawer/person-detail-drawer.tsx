import { A } from "@solidjs/router";
import { For, Show } from "solid-js";

import Building2Icon from "~/components/icons/building-2";
import CalendarDaysIcon from "~/components/icons/calendar-days";
import MailIcon from "~/components/icons/mail";
import PhoneIcon from "~/components/icons/phone";
import UserIcon from "~/components/icons/user";
import UsersIcon from "~/components/icons/users";

import { toInitial } from "../display";
import type { PersonGroup } from "../grouping";
import {
  DetailSection,
  DrawerHeader,
  ExpandablePillList,
  FieldRow,
  styles,
} from "./drawer-primitives";
import { createEnrichmentSlot, type OverlayChangeHandler } from "./enrichment";
import { buildCompanyHref } from "./links";

interface PersonDetailDrawerProps {
  group: PersonGroup;
  onClose: () => void;
  onOverlayChange?: OverlayChangeHandler;
}

export function PersonDetailDrawer(props: PersonDetailDrawerProps) {
  const row = () => props.group.rows[0];
  const person = () => row().person;
  const org = () => row().org;
  const role = () => row().role;
  const orgRuc = () => org()?.ruc?.trim() ?? null;

  const dniSlot = createEnrichmentSlot({
    type: "dni",
    key: () => person().dni,
    onOverlayChange: props.onOverlayChange,
  });
  const rucSlot = createEnrichmentSlot({
    type: "ruc",
    key: orgRuc,
    onOverlayChange: props.onOverlayChange,
  });
  // Access rucSlot to keep its effects alive
  void rucSlot;

  const displayName = () =>
    dniSlot.overlay()?.fullName ?? props.group.displayName ?? null;

  const aliasValues = () =>
    props.group.aliases.filter((alias) => alias !== props.group.displayName);

  return (
    <div class={styles.drawer}>
      <DrawerHeader
        initial={toInitial(displayName() ?? "?")}
        title={displayName() ?? "—"}
        subtitle={person().dni ? `DNI ${person().dni}` : null}
        onClose={props.onClose}
        enrichment={
          person().dni
            ? {
                status: dniSlot.status(),
                onRequest: dniSlot.request,
              }
            : undefined
        }
      />

      <div class={styles.body}>
        <DetailSection title="Identidad">
          <FieldRow
            icon={<UserIcon size={16} />}
            label="Nombre completo"
            value={person().name}
          />
          <FieldRow
            icon={<UserIcon size={16} />}
            label="DNI"
            value={person().dni}
          />
          <Show when={aliasValues().length > 0}>
            <div class={styles.fieldRow}>
              <span class={styles.fieldIcon}>
                <UserIcon size={16} />
              </span>
              <span class={styles.fieldLabel}>Alias</span>
              <div class={styles.fieldValue}>
                <ExpandablePillList items={aliasValues()} />
              </div>
            </div>
          </Show>
          <FieldRow
            icon={<CalendarDaysIcon size={16} />}
            label="Fecha de nacimiento"
            value={person().birth_date}
          />
          <FieldRow
            icon={<CalendarDaysIcon size={16} />}
            label="Lugar de nacimiento"
            value={person().birth_place}
          />
          <FieldRow
            icon={<UserIcon size={16} />}
            label="Sexo"
            value={person().sex}
          />
          <FieldRow
            icon={<UserIcon size={16} />}
            label="Estado civil"
            value={person().marital_status}
          />
          <FieldRow
            icon={<MailIcon size={16} />}
            label="Correo electrónico"
            value={person().email}
          />
        </DetailSection>

        <Show when={props.group.companies.length > 0}>
          <DetailSection title="Empresas">
            <For each={props.group.companies}>
              {(company) => {
                const companyName = () =>
                  company.name ?? company.ruc ?? "Empresa";
                return (
                  <A
                    class={styles.recordItem}
                    href={buildCompanyHref(companyName(), company.ruc)}
                    title={companyName()}
                  >
                    <span class={styles.recordItemMain}>{companyName()}</span>
                    <span class={styles.recordItemMeta}>
                      {company.ruc ? `RUC ${company.ruc}` : "Abrir búsqueda"}
                    </span>
                  </A>
                );
              }}
            </For>
          </DetailSection>
        </Show>

        <Show when={props.group.phones.length > 0}>
          <DetailSection title="Phones">
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

        <Show when={person().location_text || person().ubigeo_code}>
          <DetailSection title="Ubicación">
            <FieldRow
              icon={<Building2Icon size={16} />}
              label="Dirección"
              value={person().location_text}
            />
            <FieldRow
              icon={<Building2Icon size={16} />}
              label="Ubigeo"
              value={person().ubigeo_code}
            />
          </DetailSection>
        </Show>

        <Show when={person().mother_name || person().father_name}>
          <DetailSection title="Familia">
            <FieldRow
              icon={<UsersIcon size={16} />}
              label="Madre"
              value={person().mother_name}
            />
            <FieldRow
              icon={<UsersIcon size={16} />}
              label="Padre"
              value={person().father_name}
            />
          </DetailSection>
        </Show>

        <Show when={org()}>
          {(company) => (
            <DetailSection
              title="Empresa principal"
              linkHref={buildCompanyHref(
                company().name ?? company().ruc ?? "Empresa",
                company().ruc,
              )}
              linkLabel="Abrir"
            >
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Nombre"
                value={company().name}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Razón social"
                value={company().trade_name}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="RUC"
                value={company().ruc}
              />
              <Show when={role()}>
                {(roleInfo) => (
                  <>
                    <FieldRow
                      icon={<UserIcon size={16} />}
                      label="Cargo"
                      value={roleInfo().name}
                    />
                    <FieldRow
                      icon={<CalendarDaysIcon size={16} />}
                      label="Fecha de inicio"
                      value={roleInfo().start_date}
                    />
                    <FieldRow
                      icon={<UserIcon size={16} />}
                      label="Nombre del representante"
                      value={roleInfo().rep_name}
                    />
                    <FieldRow
                      icon={<UserIcon size={16} />}
                      label="Tipo de documento"
                      value={roleInfo().rep_doc_type}
                    />
                    <FieldRow
                      icon={<UserIcon size={16} />}
                      label="Número de documento"
                      value={roleInfo().rep_doc_number}
                    />
                  </>
                )}
              </Show>
            </DetailSection>
          )}
        </Show>
      </div>
    </div>
  );
}
