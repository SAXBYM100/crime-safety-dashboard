export async function onsAdapter() {
  // TODO: Integrate Office for National Statistics data when available.
  return {
    demographics: {
      status: "pending",
      summary: "ONS demographics integration pending.",
    },
  };
}
