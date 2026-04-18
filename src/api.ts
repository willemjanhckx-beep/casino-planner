const gasURL = "https://script.google.com/macros/s/JOUW_DEPLOYMENT_ID/exec";

export async function loadSheet(sheetName: string) {
  const r = await fetch(`${gasURL}?action=load&sheet=${sheetName}&t=${Date.now()}`);
  const json = await r.json();
  return json;
}

export async function saveSheet(tab: string, data: any[][], expectedLastWrite?: string) {
  const r = await fetch(gasURL, {
    method: "POST",
    body: JSON.stringify({ tab, data, expectedLastWrite }),
  });
  const json = await r.json();
  return json;
}
