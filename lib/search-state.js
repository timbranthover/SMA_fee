export function clearQueryDerivedFilters(state) {
  for (const key of state.queryFilterKeys) {
    const [type, value] = key.split(":");
    if (type === "flag") state.flags.delete(value);
    if (type === "risk") state.risks.delete(value);
    if (type === "range") delete state.ranges[value];
  }
  state.queryFilterKeys.clear();
  state.excludedQueryFilters.clear();
  state.suppressInferenceFor = null;
}

export function clearAllSearchFilters(state) {
  state.flags.clear();
  state.risks.clear();
  state.statuses.clear();
  state.ranges = {};
  state.queryFilterKeys.clear();
  state.excludedQueryFilters.clear();
  state.suppressInferenceFor = state.q;
}
