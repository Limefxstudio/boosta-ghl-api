# Boosta custom form → GHL Contacts API

## What this fixes

The original custom HTML form cannot reliably click GHL's native Submit control from a separate iframe. This package **does not use that control**. The form is standalone, retains the expandable questions and one purple Continue button per stage, and calls a secure Vercel function. The function saves **qualified and unqualified** leads in GHL first, then returns qualification status. The existing **native GHL booking calendar** is still embedded and is shown only for qualified leads.

**GHL Contacts API submissions are stored as Contacts, not necessarily in GHL Forms → Submissions.** Verify in Contacts and the three custom fields.

## Setup

1. In GHL **Settings → Custom Fields**, create **three Contact-type text fields** (not Opportunity fields): `Boosta Monthly Revenue`, `Boosta Investment Budget`, and `Boosta Attendance`. Text fields store the values `0`, `1000`, etc. and `yes` / `no` reliably. Copy each field ID. If you prefer dropdowns, ensure their allowed option values match the submitted values exactly.
2. In the Boosta GHL sub-account, open **Settings → Private Integrations** (or the agency's private integration settings with sub-account access). Create a token with **contacts.write** scope. Keep it private. See https://marketplace.gohighlevel.com/docs/Authorization/PrivateIntegrationsToken/ .
3. Find the GHL **Location ID** for the same sub-account. It is NOT the calendar ID or form ID.
4. Deploy this entire folder as a **Vercel project**. Configure all values from `.env.example` in **Project Settings → Environment Variables**, then redeploy. Do not upload `.env` or secrets into HTML. `api/lead.js` will be served at `/api/lead`.
5. Host the provided `index.html` on that same Vercel domain. It already includes the custom form and the existing GHL calendar `mytZluOzftOWFfYeiNcZ`.
6. Remove the **GHL form iframe** `DSmDLB8OHUOtf7KtnroB` from the website. The supplied `index.html` already does this. You no longer need the native GHL Form Builder Submit button, because the contact is saved via API.
7. Set the real Privacy Policy URL in `index.html` and `boosta-form.html` (search for `id="boosta-policy"`).
8. Test a qualified lead (revenue >= $1K, budget >= $1K, attendance Yes) and an unqualified lead (any condition fails). Verify BOTH appear in **GHL Contacts** with revenue, budget and attendance fields. Qualified must see calendar; unqualified must see rejection.

## If the landing page must remain hosted in GHL

The custom form can still be used in a GHL **website/funnel Custom HTML element** rather than a native GHL Form Builder. Deploy only the `api` folder on Vercel, and set `window.BOOSTA_LEAD_API_URL = 'https://YOUR-VERCEL-DOMAIN.vercel.app/api/lead'` before the form script. Add the exact GHL website origin to `ALLOWED_ORIGIN`. Browser CORS may also depend on any GHL iframe sandbox rules. This is more fragile than same-origin hosting and needs a live test.

## Security and limitations

- The private GHL token stays on the server. Never put it into a public GHL Custom HTML block.
- CORS is not an anti-spam measure. Before paid traffic, add CAPTCHA/Turnstile, rate limiting and a real Privacy Policy; use consent for marketing messaging.
- API-based contact creation is not the same as a GHL Form Submission event. Automations should use contact-created, custom-field, or tag triggers as appropriate.
- Qualification threshold is currently $1,000 monthly revenue, $1,000 budget, and attendance Yes. Change the **server-side** logic if your requirements change.
- Booking completion remains handled by the native GHL calendar iframe, not by this API.
- The package is syntactically checked, but live GHL saving cannot be verified without the credentials and field IDs configured in your account.
