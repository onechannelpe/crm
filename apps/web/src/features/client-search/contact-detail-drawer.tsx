import { A } from "@solidjs/router";
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";

import Building2Icon from "~/components/icons/building-2";
import CalendarDaysIcon from "~/components/icons/calendar-days";
import PhoneIcon from "~/components/icons/phone";
import UserIcon from "~/components/icons/user";
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
        <DetailSection title="Identity">
          <FieldRow
            icon={<UserIcon size={16} />}
            label="Full name"
            value={person().name ?? person().dni}
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
              <span class={styles.fieldLabel}>Aliases</span>
              <div class={styles.fieldValue}>
                <ExpandablePillList items={aliasValues()} />
              </div>
            </div>
          </Show>
        </DetailSection>

        <Show when={props.group.companies.length > 0}>
          <DetailSection title="Companies">
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
                      {company.ruc ? `RUC ${company.ruc}` : "Open search"}
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

        <Show when={org()}>
          {(company) => (
            <DetailSection
              title="Primary company"
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
                label="RUC"
                value={company().ruc}
              />
              <Show when={role()}>
                {(roleInfo) => (
                  <>
                    <FieldRow
                      icon={<UserIcon size={16} />}
                      label="Role"
                      value={roleInfo().name}
                    />
                    <FieldRow
                      icon={<CalendarDaysIcon size={16} />}
                      label="Role start"
                      value={roleInfo().start_date}
                    />
                    <FieldRow
                      icon={<UserIcon size={16} />}
                      label="Representative"
                      value={roleInfo().rep_name}
                    />
                    <FieldRow
                      icon={<UserIcon size={16} />}
                      label="Rep document type"
                      value={roleInfo().rep_doc_type}
                    />
                    <FieldRow
                      icon={<UserIcon size={16} />}
                      label="Rep document number"
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
        initial={toInitial(props.group.name ?? "?")}
        title={props.group.name ?? "—"}
        subtitle={props.group.ruc ? `RUC ${props.group.ruc}` : null}
        onClose={props.onClose}
        squareAvatar
      />

      <div class={styles.body}>
        <Show when={org()}>
          {(company) => (
            <DetailSection title="Details">
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="Name"
                value={company().name}
              />
              <FieldRow
                icon={<Building2Icon size={16} />}
                label="RUC"
                value={company().ruc}
              />
            </DetailSection>
          )}
        </Show>

        <Show when={props.group.people.length > 0}>
          <DetailSection
            title="Contacts"
            linkHref={
              props.group.ruc
                ? `/contacts/people?type=ruc&query=${encodeURIComponent(props.group.ruc)}&limit=20`
                : undefined
            }
            linkLabel={
              props.group.ruc ? `All (${props.group.people.length})` : undefined
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
                      {person.dni ? `DNI ${person.dni}` : "Open search"}
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
                +{hiddenPeopleCount()} more
              </button>
            </Show>
          </DetailSection>
        </Show>

        <Show when={representatives().length > 0}>
          <DetailSection title="Representatives">
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
      </div>
    </div>
  );
}
