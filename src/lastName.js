// A player's last name as people say it: "Stingley" for Derek Stingley Jr., never "Jr." (Jr, Sr, II,
// III, IV and V are skipped).
export const lastName = (name) => {
  const w = String(name || "").trim().split(/\s+/);
  while (w.length > 1 && /^(jr|sr|ii|iii|iv|v)\.?$/i.test(w[w.length - 1])) w.pop();
  return w[w.length - 1] || "";
};
