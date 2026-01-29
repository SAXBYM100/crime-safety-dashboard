const safeBool = (value) => Boolean(value && String(value).trim());

module.exports = (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Only GET is supported." } });
  }
  return res.status(200).json({ ok: true, hasGeminiKey: safeBool(process.env.GEMINI_API_KEY) });
};
