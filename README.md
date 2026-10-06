# Home Risk Assessment (Daisy Homecare)

An offline phone app for home risk assessments at client onboarding. It walks the
assessor through 16 risk areas, rates each risk, captures actions, and exports an
Excel file in the exact layout of the **Risk Register** tab of the Governance
Master Dashboard.

- Works with **no signal**. Installed from Safari with Share > Add to Home Screen.
- **All data stays on the phone.** There is no server, no account, no tracking and
  no outside services. The web address only serves the app's own files.
- Live at: https://dkdrury1967-lang.github.io/home-risk-assessment/

## Using it

1. **Settings (first time):** check the staff list, set your own **risk ref prefix**
   (see "Several assessors" below) and the **Registered Manager's email**.
2. **Start new assessment**, then work through the 16 areas. Everything saves as
   you type. You can close the app and carry on later from Home.
3. **Summary** shows ratings, actions and the heat map (switch between residual and
   inherent). **Export / Email to RM** opens the export screen.
4. The file is built as soon as the export screen opens. Tap **Email to RM**, choose
   **Mail** in the Share sheet (use your **work** email account), and send it to the
   Registered Manager. The address is shown on the screen with a **Copy address**
   button. (If you cancel the Share sheet nothing is lost and no risk number is used up.)
5. **The Registered Manager** adds the rows to the Risk Register: open the file in
   **Excel on a computer**, copy the data rows (not the header), click the first empty
   cell in column A of the Risk Register, then **Paste Special > Values** with **Skip
   blanks** ticked. Columns J, O and W are left blank on purpose so the register's
   formulas keep working. **The browser version of Excel has no Skip blanks option**,
   so do not paste from there.
6. Once the Registered Manager confirms the rows are in the register, delete the
   assessment from the phone (Settings > Delete all exported assessments) **and delete
   the sent email** from your Sent and Deleted items.

Never enter key-safe codes, door codes or passwords. The app warns about this.

## Several assessors (risk reference numbers)

Each phone keeps its own counter, so two people could otherwise both create the
same ref and the Risk Register would hold two different risks with one reference.
The register also needs every ref to have a value: its Helper sheet (used by Record
Lookup) skips any row where the Risk Ref is blank, so the ref **cannot** be left
blank for Excel to fill in later.

Only the Registered Manager updates the Master Dashboard, so there is a single
person pasting, but the refs are still made on each assessor's phone, so the rule
below still applies.

**Rule: every assessor uses their own prefix.** In the app: **Settings > Risk reference numbers**.

- Set a prefix that is unique to you (letters or numbers, up to 6), and set **Next number** to 1 for a new prefix.
- Refs then look like `DD001`, `SC001`, `JP001` and can never clash between people.
- Never share a prefix. The app cannot check for clashes, so the list below is the record.
- Refs already in the register (RR001 to RR007) stay as they are.

| Assessor | Prefix | Set up on their phone? |
|---|---|---|
| David Drury | | |
| Sarah Collins | | |
| John Peters | | |

*(Suggested: DD, SC, JP. Fill in the table once agreed.)*

Each person also sets up their own phone: the staff list must match the **Staff
Names** list in the workbook, and each person sets their own review interval.

## App passcode (optional)

In **Settings > App passcode** you can set a 6-digit passcode.

- The app is locked when opened, and locks again after being away for the time chosen
  in Settings (immediately, 1, 5 or 15 minutes; the default is 5). **Lock the app now**
  is on the Home screen and in Settings.
- While the app is away from the screen its contents are hidden. (iOS decides when it
  takes the app-switcher picture, so this helps but cannot be guaranteed.)
- After 5 wrong tries in a row there is a wait of 30 seconds, doubling each time (up to 15
  minutes). The wait survives closing the app.
- Easy passcodes (111111, 123456) are refused.
- **This is a screen lock, not encryption.** The stored assessments are not encrypted, and
  it is **not a substitute for the phone's own passcode**, which must stay on.
- **A forgotten passcode cannot be recovered.** Nothing is stored anywhere else. On the lock
  screen, **Forgot the passcode?** erases all assessments and settings on that phone, and
  the app starts fresh. Exported and emailed files are not affected.
- The passcode itself is never stored, only a salted hash. It is separate on each phone.
- The length is set by `PIN_LENGTH` in `src/passcode-logic.js`.

## Emailing the export

The app has no server, so it cannot send email itself. **Email to RM** hands the file
to the iPhone Share sheet, where Mail is chosen and the address is entered (copy it
from the export screen, or save the Registered Manager as an iPhone contact).

- iPhone Mail fills in the **message** and attaches the file but leaves the **Subject blank** (iOS ignores it when sharing a file). Type a subject such as "Risk assessment", or send without one. The message does not contain the client's name. The attached file's
  name and contents do, so treat the email as client data.
- Use **work email accounts**, not personal ones.
- Emailed copies stay in Sent, Deleted and on the mail server. Deleting the assessment
  from the phone does **not** remove them. Delete the sent email too.
- The provider's DPIA should cover sending these files by email.
- The Registered Manager's address is stored only on each phone (Settings). It is not
  in the code, because the repository is public.

## Data protection

- The data is special-category (health) information. The assessor is responsible
  for the security of the phone. Keep the phone's own passcode on.
- The provider should complete a **DPIA** before real client data is used.
- iOS can clear a website's stored data if it is not used for a while. **Export
  promptly.** Home shows "Finished, not exported yet" until you do.
- There is no backup of assessments on the phone. **The export file is the backup.**
- Once the Registered Manager has confirmed the rows are in the register, delete the
  assessment from the phone and the sent email from the mailbox.

## Changing things

| To change | Edit | Notes |
|---|---|---|
| Staff list (day to day) | In the app: **Settings** | Names must match the **Staff Names** list in the workbook, because the Risk Register only accepts those names. |
| Starting staff list for a new install | `src/data/risk-areas.json` > `defaults.staff` | Only used the first time the app is opened on a phone. |
| Questions, guidance, warnings, priorities | `src/data/risk-areas.json` | Keep each area's `id` unchanged once assessments exist. |
| Rating table and colours | `src/config/rating-matrix.json` | Also change the table in the workbook (Lists tab) so they agree. Run the tests: they check the table against the original. |
| Review interval, ref prefix and number, Registered Manager email, passcode | In the app: **Settings** | |

## Updating the app

After any change to the app's files:

1. Open `sw.js` and **change `CACHE_VERSION`** (for example `"v11"` to `"v12"`). If
   you add a new file to the app, also add it to the `FILES` list in the same
   file. This is what tells phones to fetch the new version.
2. Run the checks: `npm test`
3. Send it online:
   ```
   git add -A
   git commit -m "Describe the change"
   git push
   ```
4. Wait about a minute. Open the app **with signal on**. It refreshes itself once.
   The version number shows at the bottom of the Home screen. Assessments saved on
   the phone are kept.

## Trying it on a computer

```
npm start
```

Then open http://localhost:8080 . `npm test` runs the automated checks (rating
table, export layout, dates, settings rules).

## How it is built

Plain HTML, CSS and JavaScript with no build step.

- `index.html`, `styles.css`, `manifest.webmanifest`, `sw.js` (offline support), `icons/`
- `src/app.js` starts the app and chooses the screen
- `src/screens/` one file per screen (home, settings, start, area, overview, summary, export)
- `src/*-logic.js`, `src/rating.js` plain rules, covered by the tests in `test/`
- `src/db.js` storage on the phone (IndexedDB), `src/autosave.js`
- `src/vendor/xlsx.mini.min.js` SheetJS 0.20.3, used only to write the .xlsx file (Apache-2.0 licence included)
- `tools/make-icons.mjs` rebuilds the icons from `tools/daisy-logo.svg` (needs Google Chrome)

## Hosting

GitHub Pages serves the files from the `main` branch of
`dkdrury1967-lang/home-risk-assessment` (Settings > Pages). The repository is public, so
**never commit client data, real spreadsheets or the workbook.** `.gitignore`
already excludes spreadsheets and the project brief.
