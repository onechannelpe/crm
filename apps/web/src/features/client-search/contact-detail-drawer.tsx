import { A } from "@solidjs/router";
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";

import Building2Icon from "~/components/icons/building-2";
import CalendarDaysIcon from "~/components/icons/calendar-days";
import MailIcon from "~/components/icons/mail";
import PhoneIcon from "~/components/icons/phone";
import UserIcon from "~/components/icons/user";
import UsersIcon from "~/components/icons/users";
import XIcon from "~/components/icons/x";

import { toInitial } from "./display";
import type { CompanyGroup, PersonGroup } from "./grouping";

import styles from "./contact-detail-drawer.module.css";

const PANEL_PAGE_SIZE = 5;

interface FieldRowProps {
  label: string;
  value: string | null | undefined;
  icon: JSX.Element;
}

function FieldRow(props: FieldRowProps) {
  return (
    <Show when={props.value?.trim()}>
      {(value) => (
        <div class={styles.fieldRow}>
          <span class={styles.fieldIcon}>{props.icon}</span>
          <span class={styles.fieldLabel}>{props.label}</span>
          <span class={styles.fieldValue} title={value()}>
            {value()}
          </span>
        </div>
      )}
    </Show>
  );
}

interface DetailSectionProps {
  title: string;
  linkHref?: string;
  linkLabel?: string;
  children: JSX.Element;
}

function DetailSection(props: DetailSectionProps) {
  return (
    <section class={styles.section}>
      <header class={styles.sectionHeader}>
        <div class={styles.sectionTitleWrap}>
          <h3 class={styles.sectionTitle}>{props.title}</h3>
          <Show when={props.linkHref && props.linkLabel}>
            <A href={props.linkHref!} class={styles.sectionLink}>
              {props.linkLabel}
            </A>
          </Show>
        </div>
      </header>
      <div class={styles.sectionBody}>{props.children}</div>
    </section>
  );
}

interface ExpandablePillListProps {
  items: readonly string[];
}

function ExpandablePillList(props: ExpandablePillListProps) {
  const [visibleCount, setVisibleCount] = createSignal(PANEL_PAGE_SIZE);
  const visibleItems = createMemo(() => props.items.slice(0, visibleCount()));
  const hiddenCount = createMemo(() =>
    Math.max(0, props.items.length - visibleItems().length),
  );

  return (
    <div class={styles.pillWrap}>
      <For each={visibleItems()}>
        {(item) => (
          <span class={styles.pill} title={item}>
            <span class={styles.pillText}>{item}</span>
          </span>
        )}
      </For>
      <Show when={hiddenCount() > 0}>
        <button
          type="button"
          class={`${styles.pill} ${styles.pillButton}`}
          onClick={() => setVisibleCount((count) => count + PANEL_PAGE_SIZE)}
        >
          +{hiddenCount()} more
        </button>
      </Show>
    </div>
  );
}

function buildPersonHref(name: string, dni: string | null) {
  const type = dni ? "dni" : "person_name";
  const query = encodeURIComponent(dni ?? name);
  return `/contacts/people?type=${type}&query=${query}&limit=20`;
}

function buildCompanyHref(name: string, ruc: string | null) {
  const type = ruc ? "ruc" : "company_name";
  const query = encodeURIComponent(ruc ?? name);
  return `/contacts/companies?type=${type}&query=${query}&limit=20`;
}

interface DrawerHeaderProps {
  initial: string;
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  squareAvatar?: boolean;
}

function DrawerHeader(props: DrawerHeaderProps) {
  return (
    <header class={styles.header}>
      <span
        class={`${styles.headerAvatar}${props.squareAvatar ? ` ${styles.headerAvatarSquare}` : ""}`}
      >
        {props.initial}
      </span>
      <div class={styles.headerInfo}>
        <div class={styles.headerName} title={props.title}>
          {props.title}
        </div>
        <Show when={props.subtitle?.trim()}>
          {(subtitle) => (
            <div class={styles.headerSubtitle} title={subtitle()}>
              {subtitle()}
            </div>
          )}
        </Show>
      </div>
      <button
        class={styles.closeBtn}
        onClick={props.onClose}
        aria-label="Close"
      >
        <XIcon size={14} />
      </button>
    </header>
  );
}

interface PersonDetailDrawerProps {
  group: PersonGroup;
  onClose: () => void;
}

export function PersonDetailDrawer(props: PersonDetailDrawerProps) {
  const row = () => props.group.rows[0];
  const person = () => row().person;
  const org = () => row().org;
  const role = () => row().role;
  const aliasValues = () =>
    props.group.aliases.filter((alias) => alias !== props.group.displayName);

  return (
    <div class={styles.drawer}>
      <DrawerHeader
        initial={toInitial(props.group.displayName)}
        title={props.group.displayName || "—"}
        subtitle={person().dni ? `DNI ${person().dni}` : null}
        onClose={props.onClose}
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
                  company.name ?? company.ruc ?? "Company";
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
              <span class={styles.fieldLabel}>Numbers</span>
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
                company().name ?? company().ruc ?? "Company",
                company().ruc,
              )}
              linkLabel="Open"
            >
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Name"
                value={company().name}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Trade name"
                value={company().trade_name}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="RUC"
                value={company().ruc}
              />
              <Show when={role()}>
                {(roleInfo) => (
                  <FieldRow
                    icon={<UserIcon size={16} />}
                    label="Role"
                    value={roleInfo().name}
                  />
                )}
              </Show>
            </DetailSection>
          )}
        </Show>
      </div>
    </div>
  );
}

interface CompanyDetailDrawerProps {
  group: CompanyGroup;
  onClose: () => void;
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

  return (
    <div class={styles.drawer}>
      <DrawerHeader
        initial={toInitial(props.group.name ?? "?")}
        title={props.group.name ?? "—"}
        subtitle={props.group.ruc ? `RUC ${props.group.ruc}` : null}
        onClose={props.onClose}
        squareAvatar
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
                label="Registrada"
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
                ? `/contacts/people?type=ruc&query=${encodeURIComponent(props.group.ruc)}&limit=20`
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
      </div>
    </div>
  );
}
