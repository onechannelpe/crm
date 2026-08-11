import Building2 from "~/components/icons/building-2";
import Info from "~/components/icons/info";
import Phone from "~/components/icons/phone";
import User from "~/components/icons/user";
import Users from "~/components/icons/users";
import type { AvatarType } from "~/components/ui/display/avatar";

import type { CompanyGroup, PersonGroup } from "./grouping";
import type { SearchViewModel } from "./search-view-model";

type FieldIcon = typeof Info;

/*
  How the preview renders a value. Phones become dial links because the audience
  reads results on a phone; everything multi-valued becomes chips so a long list
  clips at the row edge instead of wrapping the card open.
*/
export type SearchResultFieldKind = "text" | "chips" | "phones";

export interface SearchResultField {
  label: string;
  icon: FieldIcon;
  kind: SearchResultFieldKind;
  values: string[];
}

export type SearchResultSource =
  | { kind: "person"; person: PersonGroup }
  | { kind: "company"; company: CompanyGroup };

export interface SearchResultItem {
  id: string;
  label: string;
  /* Names the kind of record, rendered after the label as "· Persona". */
  objectLabel: string;
  avatarType: AvatarType;
  fields: SearchResultField[];
  source: SearchResultSource;
}

function personItem(person: PersonGroup): SearchResultItem {
  return {
    id: person.key,
    label: person.displayName,
    objectLabel: "Persona",
    avatarType: "rounded",
    fields: [
      {
        label: "Documento",
        icon: Info,
        kind: "text",
        values: [`${person.doc_type} ${person.doc_number}`],
      },
      {
        label: "Teléfonos",
        icon: Phone,
        kind: "phones",
        values: person.phones,
      },
      {
        label: "Empresas",
        icon: Building2,
        kind: "chips",
        values: person.companies
          .map((company) => company.name ?? company.ruc ?? "")
          .filter((name) => name.length > 0),
      },
      {
        label: "Alias",
        icon: Users,
        kind: "chips",
        // The display name already heads the card, so only the others add anything.
        values: person.aliases.filter((alias) => alias !== person.displayName),
      },
    ],
    source: { kind: "person", person },
  };
}

function companyItem(company: CompanyGroup): SearchResultItem {
  return {
    id: company.key,
    label: company.name ?? company.ruc ?? "Empresa sin nombre",
    objectLabel: "Empresa",
    avatarType: "squared",
    fields: [
      {
        label: "RUC",
        icon: Info,
        kind: "text",
        values: company.ruc ? [company.ruc] : [],
      },
      {
        label: "Teléfonos",
        icon: Phone,
        kind: "phones",
        values: company.phones,
      },
      {
        label: "Razón social",
        icon: User,
        kind: "text",
        values: company.name ? [company.name] : [],
      },
    ],
    source: { kind: "company", company },
  };
}

/*
  One flat result list, the way the command menu presents a mixed search: the
  object type rides along on each row instead of splitting the list into
  per-type sections the user has to scan twice.
*/
export function toSearchResultItems(
  model: SearchViewModel,
): SearchResultItem[] {
  return [...model.people.map(personItem), ...model.companies.map(companyItem)];
}
