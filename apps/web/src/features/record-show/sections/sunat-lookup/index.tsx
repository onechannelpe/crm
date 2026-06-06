import Building2 from "~/components/icons/building-2";
import {
  FieldTable,
  FieldTextValue,
  RecordInlineCell,
} from "~/features/side-panel/components/field-table";
import {
  RecordDetailSection,
  RecordDetailSectionBody,
  RecordDetailSectionHeader,
  RecordDetailSectionTitle,
} from "~/features/side-panel/components/record-detail-section";

// Pre-creation lookup status for the RUC entered in the draft. Submit lives in
// the top bar (RUC + Mod+Enter) and the footer ("Abrir"), so this section only
// reports whether SUNAT returned company data for the RUC.
export function SunatLookupSection(props: { status?: string }) {
  return (
    <RecordDetailSection>
      <RecordDetailSectionHeader>
        <RecordDetailSectionTitle text="Verificación SUNAT" />
      </RecordDetailSectionHeader>
      <RecordDetailSectionBody>
        <FieldTable>
          <RecordInlineCell label="Estado" icon={Building2}>
            <FieldTextValue>{props.status || "Ingresa un RUC"}</FieldTextValue>
          </RecordInlineCell>
        </FieldTable>
      </RecordDetailSectionBody>
    </RecordDetailSection>
  );
}
