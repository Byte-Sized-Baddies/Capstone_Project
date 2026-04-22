export async function getGoogleCalendarId(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return data.id ?? "primary";
}

export async function getGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return data.email ?? "";
}

export async function getMicrosoftCalendarName(accessToken: string): Promise<string> {
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/calendars?$top=1&$select=name",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  return data.value?.[0]?.name ?? "Calendar";
}
