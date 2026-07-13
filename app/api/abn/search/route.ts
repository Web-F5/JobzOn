import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name || name.trim().length < 3) {
    return NextResponse.json({ results: [] });
  }

  const guid = process.env.ABR_GUID;
  if (!guid) {
    return NextResponse.json({ error: "ABR_GUID not configured" }, { status: 503 });
  }

  const url = `https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodeURIComponent(name)}&guid=${guid}`;
  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ results: [] });

  const text = await res.text();
  // ABR returns JSONP-like: callback({ ... })
  const json = JSON.parse(text.replace(/^\w+\(/, "").replace(/\)$/, ""));

  const results = (json.Names ?? []).slice(0, 8).map((n: { Abn: string; Name: string; State: string; Postcode: string }) => ({
    abn: n.Abn,
    name: n.Name,
    state: n.State,
    postcode: n.Postcode,
  }));

  return NextResponse.json({ results });
}
