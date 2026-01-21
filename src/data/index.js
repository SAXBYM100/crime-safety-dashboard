import { buildEmptyProfile, mergeProfile, getSourcesSummary } from "./helpers";
import { DEFAULT_SOURCES } from "./sources";
import { ukPoliceAdapter } from "./adapters/ukPoliceAdapter";
import { landRegistryAdapter } from "./adapters/landRegistryAdapter";
import { onsAdapter } from "./adapters/onsAdapter";
import { schoolsAdapter } from "./adapters/schoolsAdapter";
import { deprivationAdapter } from "./adapters/deprivationAdapter";

function normalizeQuery(input) {
  if (!input) {
    return { kind: "place", value: "" };
  }
  if (typeof input === "string") {
    return { kind: "place", value: input };
  }
  return { kind: input.kind || "place", value: input.value || "" };
}

export async function getAreaProfile(queryInput, options = {}) {
  const query = normalizeQuery(queryInput);
  const baseProfile = buildEmptyProfile(query);

  const ukPartial = await ukPoliceAdapter(baseProfile, options);
  let profile = mergeProfile(baseProfile, ukPartial);

  const adapters = [landRegistryAdapter, onsAdapter, schoolsAdapter, deprivationAdapter];
  const results = await Promise.allSettled(adapters.map((adapter) => adapter(profile, options)));

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      profile = mergeProfile(profile, result.value);
    }
  });

  return profile;
}

export { getSourcesSummary };
export { DEFAULT_SOURCES };
