import { createEffect } from "solid-js";

import { useRecordIndexViewState } from "../context/instance-context";
import { useRecordIndexSetup } from "../context/setup-context";
import {
  getRecordIndexFilterOptions,
  reconcileRecordIndexOpenMenu,
  reconcileRecordIndexOptionValue,
  reconcileVisibleRecordIndexColumnKeys,
} from "../model/derive";

export function RecordIndexSetupEffects() {
  const setup = useRecordIndexSetup();
  const viewState = useRecordIndexViewState();

  createEffect(() => {
    const nextVisibleColumnKeys = reconcileVisibleRecordIndexColumnKeys(
      setup,
      viewState.visibleColumnKeys(),
    );

    if (!areSetsEqual(nextVisibleColumnKeys, viewState.visibleColumnKeys())) {
      viewState.setVisibleColumnKeys(nextVisibleColumnKeys);
    }
  });

  createEffect(() => {
    const nextFilterValue = reconcileRecordIndexOptionValue(
      getRecordIndexFilterOptions(setup.filter?.fields),
      viewState.filterValue(),
      setup.filter?.defaultValue,
    );

    if (nextFilterValue !== viewState.filterValue()) {
      viewState.setFilterValue(() => nextFilterValue);
    }
  });

  createEffect(() => {
    const nextSortValue = reconcileRecordIndexOptionValue(
      setup.sort?.options,
      viewState.sortValue(),
      setup.sort?.defaultValue,
    );

    if (nextSortValue !== viewState.sortValue()) {
      viewState.setSortValue(() => nextSortValue);
    }
  });

  createEffect(() => {
    const nextOpenMenu = reconcileRecordIndexOpenMenu(
      viewState.openMenu(),
      setup,
    );

    if (nextOpenMenu !== viewState.openMenu()) {
      viewState.setOpenMenu(nextOpenMenu);
    }
  });

  return null;
}

function areSetsEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}
