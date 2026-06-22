import { useAction } from "@solidjs/router";
import { For, Match, Show, Switch, createSignal } from "solid-js";
import type { JSX } from "solid-js";

import { requestFulfillmentDownloadToken } from "~/actions/workflow/commands/fulfillment";
import { Button } from "~/components/ui/input/button";
import { FileInput } from "~/components/ui/input/file-input";
import { Select } from "~/components/ui/input/select";
import { TextInput } from "~/components/ui/input/text-input";
import {
  describeDocKind,
  describeFulfillmentAction,
  describeFulfillmentStep,
  describeProductKind,
} from "~/contracts/workflow/fulfillment-labels";
import type {
  LeadDetailFulfillmentUnitView,
  LeadDetailFulfillmentView,
  LeadDetailView,
} from "~/contracts/workflow/views";
import {
  PRODUCT_KINDS,
  type FulfillmentAction,
  type ProductKind,
  isFulfillmentAction,
  isProductKind,
} from "~/contracts/workflow/vocabulary";
import {
  RecordDetailSection,
  RecordDetailSectionBody,
  RecordDetailSectionHeader,
  RecordDetailSectionTitle,
} from "~/features/side-panel/components/record-detail-section";
import { actionErrorMessage } from "~/lib/wire-error";

import {
  chooseFulfillmentProductMutation,
  recordFulfillmentSerialMutation,
  registerFulfillmentPaymentLinkMutation,
  registerFulfillmentSaleMutation,
  uploadFulfillmentDocumentMutation,
  uploadFulfillmentPaymentProofMutation,
  validateFulfillmentPaymentMutation,
} from "../../../data/command-mutations";
import { revalidateWorkflowLead } from "../../../data/revalidate-workflow";

import styles from "./fulfillment.module.css";

const OWNER_LABELS: Record<string, string> = {
  executive: "el ejecutivo",
  back_office: "back office",
  supervisor: "el supervisor",
};

const DOCUMENT_ACTIONS = new Set<FulfillmentAction>([
  "upload_transactions_report",
  "generate_addendum",
  "submit_signed_addendum",
  "compile_signed_pdf",
]);

function pendingAction(data: LeadDetailView): FulfillmentAction | null {
  const found = data.availableActions.find((action) =>
    action.startsWith("fulfillment:"),
  );
  if (!found) return null;

  const action = found.slice("fulfillment:".length);
  return isFulfillmentAction(action) ? action : null;
}

async function downloadDocument(leadId: string, artifactId: string) {
  const token = await requestFulfillmentDownloadToken({ leadId, artifactId });
  window.location.href = `/api/files/download/${token.token}`;
}

function productKindLabel(productKind: string | null): string {
  if (!productKind || !isProductKind(productKind)) {
    return "Producto sin definir";
  }
  return describeProductKind(productKind);
}

export function FulfillmentPanel(props: { data: LeadDetailView }) {
  const fulfillment = (): LeadDetailFulfillmentView | null =>
    props.data.fulfillment;

  return (
    <Show
      when={fulfillment()}
      fallback={<p class={styles.waiting}>Entrega no iniciada.</p>}
    >
      {(view) => (
        <div class={styles.panel}>
          <div class={styles.statusLine}>
            <span class={styles.stepName}>
              {describeFulfillmentStep(view().currentStep)}
            </span>
            <span class={styles.waiting}>
              {productKindLabel(view().productKind)}
            </span>
          </div>

          <Switch
            fallback={
              <Show when={view().pendingOwner}>
                {(owner) => (
                  <p class={styles.waiting}>
                    Esperando a {OWNER_LABELS[owner()] ?? owner()}.
                  </p>
                )}
              </Show>
            }
          >
            <Match when={pendingAction(props.data)}>
              {(action) => (
                <FulfillmentControl
                  leadId={props.data.lead.id}
                  action={action()}
                  view={view()}
                />
              )}
            </Match>
          </Switch>

          <Show when={view().units.length > 0}>
            <UnitsSummary units={view().units} />
          </Show>

          <Show when={view().documents.length > 0}>
            <RecordDetailSection>
              <RecordDetailSectionHeader>
                <RecordDetailSectionTitle text="Documentos" />
              </RecordDetailSectionHeader>
              <RecordDetailSectionBody>
                <ul class={styles.docList}>
                  <For each={view().documents}>
                    {(doc) => (
                      <li class={styles.docItem}>
                        <span>
                          {describeDocKind(doc.docKind)} · {doc.filename}
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            void downloadDocument(
                              props.data.lead.id,
                              doc.artifactId,
                            );
                          }}
                        >
                          Descargar
                        </Button>
                      </li>
                    )}
                  </For>
                </ul>
              </RecordDetailSectionBody>
            </RecordDetailSection>
          </Show>
        </div>
      )}
    </Show>
  );
}

function FulfillmentControl(props: {
  leadId: string;
  action: FulfillmentAction;
  view: LeadDetailFulfillmentView;
}) {
  return (
    <Switch>
      <Match when={props.action === "choose_product"}>
        <ProductChooser leadId={props.leadId} />
      </Match>
      <Match when={DOCUMENT_ACTIONS.has(props.action)}>
        <DocumentUpload leadId={props.leadId} action={props.action} />
      </Match>
      <Match when={props.action === "record_serials"}>
        <SerialEntry leadId={props.leadId} units={props.view.units} />
      </Match>
      <Match when={props.action === "register_payment_link"}>
        <PaymentLinkEntry leadId={props.leadId} units={props.view.units} />
      </Match>
      <Match when={props.action === "upload_payment_proof"}>
        <PaymentProofUpload leadId={props.leadId} units={props.view.units} />
      </Match>
      <Match when={props.action === "validate_payment"}>
        <ValidatePayment leadId={props.leadId} />
      </Match>
      <Match when={props.action === "register_sale"}>
        <SaleEntry leadId={props.leadId} units={props.view.units} />
      </Match>
    </Switch>
  );
}

function useSubmitState() {
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  return { submitting, setSubmitting, error, setError };
}

function ProductChooser(props: { leadId: string }) {
  const choose = useAction(chooseFulfillmentProductMutation);
  const [productKind, setProductKind] = createSignal<ProductKind>("pos_new");
  const state = useSubmitState();

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (
    event,
  ) => {
    event.preventDefault();
    void submitProduct();
  };

  async function submitProduct() {
    state.setSubmitting(true);
    state.setError(null);
    try {
      await choose({ leadId: props.leadId, productKind: productKind() });
      await revalidateWorkflowLead(props.leadId);
    } catch (caught) {
      state.setError(actionErrorMessage(caught));
    } finally {
      state.setSubmitting(false);
    }
  }

  const handleProductKindChange: JSX.EventHandler<HTMLSelectElement, Event> = (
    event,
  ) => {
    const next = event.currentTarget.value;
    if (isProductKind(next)) setProductKind(next);
  };

  return (
    <form class={styles.control} onSubmit={handleSubmit}>
      <Select
        label="Producto"
        value={productKind()}
        onChange={handleProductKindChange}
      >
        <For each={PRODUCT_KINDS}>
          {(kind) => <option value={kind}>{describeProductKind(kind)}</option>}
        </For>
      </Select>
      <Show when={state.error()}>
        <p class={styles.errorText}>{state.error()}</p>
      </Show>
      <Button type="submit" size="sm" disabled={state.submitting()}>
        {describeFulfillmentAction("choose_product")}
      </Button>
    </form>
  );
}

function DocumentUpload(props: { leadId: string; action: FulfillmentAction }) {
  const upload = useAction(uploadFulfillmentDocumentMutation);
  const [file, setFile] = createSignal<File | null>(null);
  const state = useSubmitState();

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (
    event,
  ) => {
    event.preventDefault();
    void uploadDocument();
  };

  async function uploadDocument() {
    const selected = file();
    if (!selected) {
      state.setError("Selecciona un archivo.");
      return;
    }
    state.setSubmitting(true);
    state.setError(null);
    try {
      const formData = new FormData();
      formData.set("file", selected);
      await upload({ leadId: props.leadId, action: props.action, formData });
      await revalidateWorkflowLead(props.leadId);
    } catch (caught) {
      state.setError(actionErrorMessage(caught));
    } finally {
      state.setSubmitting(false);
    }
  }

  return (
    <form class={styles.control} onSubmit={handleSubmit}>
      <FileInput
        onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
      />
      <Show when={state.error()}>
        <p class={styles.errorText}>{state.error()}</p>
      </Show>
      <Button type="submit" size="sm" disabled={state.submitting()}>
        {describeFulfillmentAction(props.action)}
      </Button>
    </form>
  );
}

function missingUnits(
  units: LeadDetailFulfillmentUnitView[],
  field: keyof LeadDetailFulfillmentUnitView,
): LeadDetailFulfillmentUnitView[] {
  return units.filter((unit) => unit[field] === null);
}

function SerialEntry(props: {
  leadId: string;
  units: LeadDetailFulfillmentUnitView[];
}) {
  const record = useAction(recordFulfillmentSerialMutation);

  return (
    <div class={styles.control}>
      <For each={missingUnits(props.units, "serial")}>
        {(unit) => (
          <UnitTextControl
            label={unit.label}
            placeholder="Serial"
            verb={describeFulfillmentAction("record_serials")}
            onSubmit={async (value) => {
              await record({
                leadId: props.leadId,
                unitId: unit.id,
                serial: value,
              });
              await revalidateWorkflowLead(props.leadId);
            }}
          />
        )}
      </For>
    </div>
  );
}

function PaymentLinkEntry(props: {
  leadId: string;
  units: LeadDetailFulfillmentUnitView[];
}) {
  const register = useAction(registerFulfillmentPaymentLinkMutation);

  return (
    <div class={styles.control}>
      <For each={missingUnits(props.units, "paymentUrl")}>
        {(unit) => (
          <UnitTextControl
            label={unit.label}
            placeholder="https://pago..."
            verb={describeFulfillmentAction("register_payment_link")}
            onSubmit={async (value) => {
              await register({
                leadId: props.leadId,
                unitId: unit.id,
                paymentUrl: value,
              });
              await revalidateWorkflowLead(props.leadId);
            }}
          />
        )}
      </For>
    </div>
  );
}

function SaleEntry(props: {
  leadId: string;
  units: LeadDetailFulfillmentUnitView[];
}) {
  const register = useAction(registerFulfillmentSaleMutation);

  return (
    <div class={styles.control}>
      <For each={missingUnits(props.units, "serviceRef")}>
        {(unit) => (
          <UnitTextControl
            label={unit.label}
            placeholder="Referencia de venta"
            verb={describeFulfillmentAction("register_sale")}
            onSubmit={async (value) => {
              await register({
                leadId: props.leadId,
                unitId: unit.id,
                serviceRef: value,
              });
              await revalidateWorkflowLead(props.leadId);
            }}
          />
        )}
      </For>
    </div>
  );
}

function PaymentProofUpload(props: {
  leadId: string;
  units: LeadDetailFulfillmentUnitView[];
}) {
  const upload = useAction(uploadFulfillmentPaymentProofMutation);

  return (
    <div class={styles.control}>
      <For each={missingUnits(props.units, "paymentProofArtifactId")}>
        {(unit) => (
          <UnitFileControl
            label={unit.label}
            verb={describeFulfillmentAction("upload_payment_proof")}
            onSubmit={async (selected) => {
              const formData = new FormData();
              formData.set("file", selected);
              await upload({ leadId: props.leadId, unitId: unit.id, formData });
              await revalidateWorkflowLead(props.leadId);
            }}
          />
        )}
      </For>
    </div>
  );
}

function ValidatePayment(props: { leadId: string }) {
  const validate = useAction(validateFulfillmentPaymentMutation);
  const state = useSubmitState();

  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = () => {
    void validatePayment();
  };

  async function validatePayment() {
    state.setSubmitting(true);
    state.setError(null);
    try {
      await validate({ leadId: props.leadId });
      await revalidateWorkflowLead(props.leadId);
    } catch (caught) {
      state.setError(actionErrorMessage(caught));
    } finally {
      state.setSubmitting(false);
    }
  }

  return (
    <div class={styles.control}>
      <Show when={state.error()}>
        <p class={styles.errorText}>{state.error()}</p>
      </Show>
      <Button
        type="button"
        size="sm"
        disabled={state.submitting()}
        onClick={handleClick}
      >
        {describeFulfillmentAction("validate_payment")}
      </Button>
    </div>
  );
}

function UnitTextControl(props: {
  label: string;
  placeholder: string;
  verb: string;
  onSubmit: (value: string) => Promise<void>;
}) {
  const [value, setValue] = createSignal("");
  const state = useSubmitState();

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (
    event,
  ) => {
    event.preventDefault();
    void submitValue();
  };

  async function submitValue() {
    if (!value().trim()) return;
    state.setSubmitting(true);
    state.setError(null);
    try {
      await props.onSubmit(value().trim());
    } catch (caught) {
      state.setError(actionErrorMessage(caught));
    } finally {
      state.setSubmitting(false);
    }
  }

  return (
    <form class={styles.unitRow} onSubmit={handleSubmit}>
      <div class={styles.unitGrow}>
        <span class={styles.unitLabel}>{props.label}</span>
        <TextInput
          sizeVariant="sm"
          value={value()}
          placeholder={props.placeholder}
          onChange={setValue}
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={state.submitting()}>
        {props.verb}
      </Button>
      <Show when={state.error()}>
        <p class={styles.errorText}>{state.error()}</p>
      </Show>
    </form>
  );
}

function UnitFileControl(props: {
  label: string;
  verb: string;
  onSubmit: (file: File) => Promise<void>;
}) {
  const [file, setFile] = createSignal<File | null>(null);
  const state = useSubmitState();

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (
    event,
  ) => {
    event.preventDefault();
    void submitFile();
  };

  async function submitFile() {
    const selected = file();
    if (!selected) return;
    state.setSubmitting(true);
    state.setError(null);
    try {
      await props.onSubmit(selected);
    } catch (caught) {
      state.setError(actionErrorMessage(caught));
    } finally {
      state.setSubmitting(false);
    }
  }

  return (
    <form class={styles.unitRow} onSubmit={handleSubmit}>
      <div class={styles.unitGrow}>
        <FileInput
          label={props.label}
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
        />
      </div>
      <Button type="submit" size="sm" disabled={state.submitting()}>
        {props.verb}
      </Button>
      <Show when={state.error()}>
        <p class={styles.errorText}>{state.error()}</p>
      </Show>
    </form>
  );
}

function UnitsSummary(props: { units: LeadDetailFulfillmentUnitView[] }) {
  return (
    <ul class={styles.steps}>
      <For each={props.units}>
        {(unit) => (
          <li
            class={styles.stepItem}
            data-state={unit.serviceRef ? "done" : "current"}
          >
            <span class={styles.unitLabel}>{unit.label}</span>
            <span class={styles.waiting}>
              {unit.serviceRef
                ? "Venta registrada"
                : unit.serial
                  ? `Serial ${unit.serial}`
                  : "Pendiente"}
            </span>
          </li>
        )}
      </For>
    </ul>
  );
}
