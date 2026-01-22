export async function deprivationAdapter() {
  // TODO: Integrate deprivation index data when available.
  return {
    demographics: {
      status: "pending",
      summary: "Deprivation index integration pending.",
    },
  };
}
