import { describe, expect, it } from "vitest";

import { readEconomicActivities } from "~/server/client-search/enrichment/sunat/consulta-ruc/activities";
import { readSnapshot } from "~/server/client-search/enrichment/sunat/consulta-ruc/index";

describe("readEconomicActivities", () => {
  it("parses one activity per line", () => {
    const activities = readEconomicActivities(
      [
        "Principal - 62010 - Desarrollo de software",
        "Secundaria 1 - 63112 - Portales web",
      ].join("\n"),
    );

    expect(activities).toEqual([
      {
        role: "principal",
        order: null,
        label: "Principal",
        code: "62010",
        description: "Desarrollo de software",
      },
      {
        role: "secondary",
        order: 1,
        label: "Secundaria 1",
        code: "63112",
        description: "Portales web",
      },
    ]);
  });

  it("does not split a description that mentions another activity pattern", () => {
    const activities = readEconomicActivities(
      [
        "Principal - 62010 - Consultoria y referencia interna: Secundaria 2 - 12345 - no es una entrada nueva",
        "Secundaria 1 - 63112 - Portales web",
      ].join("\n"),
    );

    expect(activities).toEqual([
      {
        role: "principal",
        order: null,
        label: "Principal",
        code: "62010",
        description:
          "Consultoria y referencia interna: Secundaria 2 - 12345 - no es una entrada nueva",
      },
      {
        role: "secondary",
        order: 1,
        label: "Secundaria 1",
        code: "63112",
        description: "Portales web",
      },
    ]);
  });
});

describe("readSnapshot", () => {
  it("parses status, condition, and activities from consulta-ruc rows", () => {
    const html = `
      <div class="row">
        <div>
          <div class="list-group-item">
            <div class="row">
              <div class="col-sm-5">
                <h4 class="list-group-item-heading">Estado del Contribuyente:</h4>
              </div>
              <div class="col-sm-7">
                <p class="list-group-item-text">ACTIVO</p>
              </div>
            </div>
          </div>
          <div class="list-group-item">
            <div class="row">
              <div class="col-sm-5">
                <h4 class="list-group-item-heading">Condici&oacute;n del Contribuyente:</h4>
              </div>
              <div class="col-sm-7">
                <p class="list-group-item-text">HABIDO</p>
              </div>
            </div>
          </div>
          <div class="list-group-item">
            <div class="row">
              <div class="col-sm-5">
                <h4 class="list-group-item-heading">Actividad(es) Econ&oacute;mica(s):</h4>
              </div>
              <div class="col-sm-7">
                <table class="table tblResultado">
                  <tbody>
                    <tr><td>Principal    - 4711 - VENTA AL POR MENOR</td></tr>
                    <tr><td>Secundaria 1 - 4719  - OTRAS ACTIVIDADES</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const snapshot = readSnapshot(html);

    expect(snapshot.contributorStatus).toBe("ACTIVO");
    expect(snapshot.contributorCondition).toBe("HABIDO");
    expect(snapshot.economicActivities).toEqual([
      {
        role: "principal",
        order: null,
        label: "Principal",
        code: "4711",
        description: "VENTA AL POR MENOR",
      },
      {
        role: "secondary",
        order: 1,
        label: "Secundaria 1",
        code: "4719",
        description: "OTRAS ACTIVIDADES",
      },
    ]);
  });
});
