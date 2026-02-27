import { For, Show, type JSX } from "solid-js";

import XIcon from "~/components/icons/x";
import UserIcon from "~/components/icons/user";
import PhoneIcon from "~/components/icons/phone";
import MailIcon from "~/components/icons/mail";
import Building2Icon from "~/components/icons/building-2";
import CalendarDaysIcon from "~/components/icons/calendar-days";
import UsersIcon from "~/components/icons/users";
import type { CompanyGroup, PersonGroup } from "./grouping";
import { toInitial } from "./display";

import styles from "./contact-detail-drawer.module.css";

interface FieldRowProps {
  label: string;
  value: string | null | undefined;
  icon: JSX.Element;
}

function FieldRow(props: FieldRowProps) {
  return (
    <Show when={props.value?.trim()}>
      {(val) => (
        <div class={styles.fieldRow}>
          <span class={styles.fieldIcon}>{props.icon}</span>
          <span class={styles.fieldLabel}>{props.label}</span>
          <span class={styles.fieldValue}>{val()}</span>
        </div>
      )}
    </Show>
  );
}

// ─── Person drawer ──────────────────────────────────────────────────────────

interface PersonDetailDrawerProps {
  group: PersonGroup;
  onClose: () => void;
}

export function PersonDetailDrawer(props: PersonDetailDrawerProps) {
  const row = () => props.group.rows[0];
  const person = () => row().person;
  const org = () => row().org;
  const role = () => row().role;
  const allPhones = () => props.group.phones;

  return (
    <div class={styles.drawer}>
      <div class={styles.header}>
        <span class={styles.headerAvatar}>{toInitial(props.group.displayName)}</span>
        <div class={styles.headerInfo}>
          <div class={styles.headerName}>{props.group.displayName || "—"}</div>
          <Show when={person().ruc}>
            {(ruc) => <div class={styles.headerSub}>RUC {ruc()}</div>}
          </Show>
        </div>
        <button class={styles.closeBtn} onClick={props.onClose} aria-label="Close">
          <XIcon size={14} />
        </button>
      </div>

      <div class={styles.body}>
        {/* Identity */}
        <div class={styles.section}>
          <div class={styles.sectionTitle}>Identity</div>
          <FieldRow icon={<UserIcon size={16} />} label="DNI" value={person().dni} />
          <FieldRow icon={<UserIcon size={16} />} label="Full name" value={person().name} />
          <Show when={props.group.aliases.length > 1}>
            <div class={styles.fieldRow}>
              <span class={styles.fieldIcon}><UserIcon size={16} /></span>
              <span class={styles.fieldLabel}>Aliases</span>
              <div class={styles.fieldValue}>
                <For each={props.group.aliases.slice(1)}>
                  {(alias) => <div class={styles.aliasRow}>{alias}</div>}
                </For>
              </div>
            </div>
          </Show>
          <FieldRow icon={<CalendarDaysIcon size={16} />} label="Birth date" value={person().birth_date} />
          <FieldRow icon={<CalendarDaysIcon size={16} />} label="Birth place" value={person().birth_place} />
          <FieldRow icon={<UserIcon size={16} />} label="Sex" value={person().sex} />
          <FieldRow icon={<UserIcon size={16} />} label="Civil status" value={person().marital_status} />
          <FieldRow icon={<MailIcon size={16} />} label="Email" value={person().email} />
        </div>

        {/* Location */}
        <Show when={person().location_text || person().ubigeo_code}>
          <div class={styles.section}>
            <div class={styles.sectionTitle}>Location</div>
            <FieldRow icon={<Building2Icon size={16} />} label="Address" value={person().location_text} />
            <FieldRow icon={<Building2Icon size={16} />} label="Ubigeo" value={person().ubigeo_code} />
          </div>
        </Show>

        {/* Family */}
        <Show when={person().mother_name || person().father_name}>
          <div class={styles.section}>
            <div class={styles.sectionTitle}>Family</div>
            <FieldRow icon={<UsersIcon size={16} />} label="Mother" value={person().mother_name} />
            <FieldRow icon={<UsersIcon size={16} />} label="Father" value={person().father_name} />
          </div>
        </Show>

        {/* Phones */}
        <Show when={allPhones().length > 0}>
          <div class={styles.section}>
            <div class={styles.sectionTitle}>Phones</div>
            <div class={styles.fieldRow}>
              <span class={styles.fieldIcon}><PhoneIcon size={16} /></span>
              <span class={styles.fieldLabel}>Numbers</span>
              <div class={styles.fieldValue}>
                <div class={styles.phonePills}>
                  <For each={allPhones()}>
                    {(phone) => <span class={styles.phonePill}>{phone}</span>}
                  </For>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* Company */}
        <Show when={org()}>
          {(o) => (
            <div class={styles.section}>
              <div class={styles.sectionTitle}>Company</div>
              <FieldRow icon={<Building2Icon size={16} />} label="Name" value={o().name} />
              <FieldRow icon={<Building2Icon size={16} />} label="Trade name" value={o().trade_name} />
              <FieldRow icon={<Building2Icon size={16} />} label="RUC" value={o().ruc} />
              <Show when={role()}>
                {(r) => <FieldRow icon={<UserIcon size={16} />} label="Role" value={r().name} />}
              </Show>
              <FieldRow icon={<Building2Icon size={16} />} label="Type" value={o().company_type} />
              <FieldRow icon={<Building2Icon size={16} />} label="Status" value={o().status} />
              <FieldRow icon={<Building2Icon size={16} />} label="Condition" value={o().condition} />
              <FieldRow icon={<Building2Icon size={16} />} label="Address" value={o().fiscal_address} />
              <FieldRow icon={<CalendarDaysIcon size={16} />} label="Registered" value={o().registration_date} />
              <FieldRow icon={<CalendarDaysIcon size={16} />} label="Active since" value={o().activity_start_date} />
              <FieldRow icon={<Building2Icon size={16} />} label="Activity" value={o().economic_activity} />
              <FieldRow icon={<Building2Icon size={16} />} label="Industry" value={o().line_of_business} />
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}

// ─── Company drawer ──────────────────────────────────────────────────────────

interface CompanyDetailDrawerProps {
  group: CompanyGroup;
  onClose: () => void;
}

export function CompanyDetailDrawer(props: CompanyDetailDrawerProps) {
  const row = () => props.group.rows[0];
  const org = () => row().org;
  const allPhones = () => props.group.phones;

  return (
    <div class={styles.drawer}>
      <div class={styles.header}>
        <span class={`${styles.headerAvatar} ${styles.headerAvatarSquare}`}>
          {toInitial(props.group.name ?? "?")}
        </span>
        <div class={styles.headerInfo}>
          <div class={styles.headerName}>{props.group.name ?? "—"}</div>
          <Show when={props.group.ruc}>
            {(ruc) => <div class={styles.headerSub}>RUC {ruc()}</div>}
          </Show>
        </div>
        <button class={styles.closeBtn} onClick={props.onClose} aria-label="Close">
          <XIcon size={14} />
        </button>
      </div>

      <div class={styles.body}>
        {/* Company details */}
        <Show when={org()}>
          {(o) => (
            <div class={styles.section}>
              <div class={styles.sectionTitle}>Details</div>
              <FieldRow icon={<Building2Icon size={16} />} label="Name" value={o().name} />
              <FieldRow icon={<Building2Icon size={16} />} label="Trade name" value={o().trade_name} />
              <FieldRow icon={<Building2Icon size={16} />} label="RUC" value={o().ruc} />
              <FieldRow icon={<Building2Icon size={16} />} label="Type" value={o().company_type} />
              <FieldRow icon={<Building2Icon size={16} />} label="Status" value={o().status} />
              <FieldRow icon={<Building2Icon size={16} />} label="Condition" value={o().condition} />
              <FieldRow icon={<Building2Icon size={16} />} label="Address" value={o().fiscal_address} />
              <FieldRow icon={<CalendarDaysIcon size={16} />} label="Registered" value={o().registration_date} />
              <FieldRow icon={<CalendarDaysIcon size={16} />} label="Active since" value={o().activity_start_date} />
              <FieldRow icon={<Building2Icon size={16} />} label="Activity" value={o().economic_activity} />
              <FieldRow icon={<Building2Icon size={16} />} label="Industry" value={o().line_of_business} />
            </div>
          )}
        </Show>

        {/* Contacts */}
        <Show when={props.group.people.length > 0}>
          <div class={styles.section}>
            <div class={styles.sectionTitle}>Contacts</div>
            <div class={styles.fieldRow}>
              <span class={styles.fieldIcon}><UsersIcon size={16} /></span>
              <span class={styles.fieldLabel}>People</span>
              <div class={styles.fieldValue}>
                <For each={props.group.people}>
                  {(person) => (
                    <div class={styles.aliasRow}>
                      {person.name || person.dni}
                      <Show when={person.name && person.dni}>
                        <span class={styles.fieldValueEmpty}> · {person.dni}</span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>

        {/* Phones */}
        <Show when={allPhones().length > 0}>
          <div class={styles.section}>
            <div class={styles.sectionTitle}>Phones</div>
            <div class={styles.fieldRow}>
              <span class={styles.fieldIcon}><PhoneIcon size={16} /></span>
              <span class={styles.fieldLabel}>Numbers</span>
              <div class={styles.fieldValue}>
                <div class={styles.phonePills}>
                  <For each={allPhones()}>
                    {(phone) => <span class={styles.phonePill}>{phone}</span>}
                  </For>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
