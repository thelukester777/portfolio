# Résumé live sync (Google Apps Script)

This lets the "Résumé" section on thelukester.net pull directly from your
editable Google Doc, so editing the Doc updates the site without touching
any code. The site already shows the résumé as real HTML with today's
content baked in — this script is what makes it *live*.

## How it works

`Code.gs` is a tiny Google Apps Script Web App. When the portfolio page
loads, `js/main.js` calls the script's URL, the script reads your Doc live
(via `DocumentApp`, not the "published" snapshot) and returns it as JSON,
and the page re-renders the résumé from that JSON. If the script is
unreachable for any reason, the page just keeps showing the static résumé
that's already baked into `index.html` — nothing breaks.

## One-time setup

1. Go to [script.google.com](https://script.google.com) and click **New project**.
2. Select **all** the placeholder code (including the default `function myFunction() {}` stub — delete that too, not just its contents) and replace it with the contents of `Code.gs` from this folder.
3. Rename the project (top left) to something like "Portfolio Résumé API".
4. `DOC_ID` is already set to your résumé Doc's ID. If you ever move the résumé to a different Doc, grab the new ID from its edit URL (`docs.google.com/document/d/THIS_PART/edit`) and update the constant.
5. **Verify the parsing first.** In the toolbar, select the `debugDump` function from the dropdown (next to "Run"), then click **Run**. The first time, Google will ask you to authorize the script — approve it (you'll see an "unverified app" warning since this is your own personal script; click **Advanced > Go to Portfolio Résumé API (unsafe)** to proceed, this is normal for scripts you write yourself).
6. Open **View > Logs** (or **Executions**) and check the output. It prints each paragraph's heading style next to its text, followed by the JSON the script would return. Confirm the Experience/Education entries, dates, and Skills lines look right.
   - If something looks off (e.g. a job title merged into a description, or a section missed), send me that log output and I'll adjust the parsing rules in `Code.gs` to match your Doc's actual structure.
7. Once the JSON output looks correct: click **Deploy > New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - Description: anything, e.g. "v1".
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Click **Deploy**, then authorize again if prompted.
8. Copy the **Web app URL** (ends in `/exec`).
9. Test it: paste that URL into a new browser tab. You should see raw JSON matching your résumé.

### Already deployed once and just updated `Code.gs`?

Don't create a brand-new deployment (that would give you a different URL).
Instead: **Deploy > Manage deployments**, click the pencil/edit icon on your
existing deployment, change **Version** to **New version**, and click
**Deploy**. Same `/exec` URL as before, now running the updated code.

## Wiring it into the site

Open `js/main.js`, find this line near the "Live résumé sync" section:

```js
const RESUME_API_URL = ''; // e.g. 'https://script.google.com/macros/s/AKfycb.../exec'
```

Paste your `/exec` URL between the quotes, save, commit, and push. Reload
the site — the résumé should now be coming live from the Doc. Open the
browser console (right-click > Inspect > Console) if you want to confirm;
a failed fetch logs a warning there but the page still shows the static
fallback either way.

## Updating your résumé going forward

Just edit the Google Doc and save. No "publish" step needed — the script
reads the Doc directly. Reload the portfolio page and the changes appear
(each page load calls the script fresh; there's no caching in front of it).

## If the live fetch doesn't work

Google Apps Script Web Apps deployed with "Anyone" access are normally
fetchable cross-origin from any site without extra configuration. If you
open the browser console on thelukester.net and see a CORS or network
error under "Live résumé sync unavailable," send me that error message —
it usually means the deployment's access setting needs adjusting, or the
parsing needs a tweak for your Doc's exact structure. Either way, visitors
never see a broken page in the meantime; they just get the static résumé.
