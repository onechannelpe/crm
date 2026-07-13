import Users from "~/components/icons/users";
import { RecordChipList } from "~/components/ui/record-chip/record-chip";

import { SidePanelPage } from "../../components/page";
import { useSidePanelPageState } from "../../router/page-state";

import styles from "./page.module.css";

export function SearchCompanyPage() {
  const pageState = useSidePanelPageState("search-company-detail");

  return (
    <SidePanelPage>
      <div class={styles.content}>
        <section class={styles.hero}>
          <div class={styles.heroIcon}>
            <Users size={16} />
          </div>
          <div class={styles.heroText}>
            <div class={styles.title}>
              {pageState().company.name ?? "Empresa desconocida"}
            </div>
            <div class={styles.subtitle}>
              RUC {pageState().company.ruc ?? "-"}
            </div>
          </div>
        </section>

        <section class={styles.section}>
          <div class={styles.sectionTitle}>Teléfonos</div>
          <RecordChipList items={pageState().company.phones} shape="square" />
        </section>
      </div>
    </SidePanelPage>
  );
}
