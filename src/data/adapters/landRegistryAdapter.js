export async function landRegistryAdapter() {
  // TODO: Integrate Land Registry / UK HPI data when available.
  return {
    housing: {
      status: "pending",
      summary: "Land Registry integration pending.",
    },
  };
}
