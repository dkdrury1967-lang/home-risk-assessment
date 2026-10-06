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

1. **Settings (first time):** check the staff list, and set the **next risk
   number** to follow on from the last risk in the register.
2. **Start new assessment**, then work through the 16 areas. Everything saves as
   you type. You can close the app and carry on later from Home.
3. **Summary** shows ratings, actions and the heat map. **Export to Excel** makes the file.
4. The file is built as soon as the Export screen opens. Tap **Share / Save to Files** and save it to OneDrive. (If you cancel the Share sheet nothing is lost and no risk number is used up.)
5. In Excel, copy the data rows (not the header), click the first empty cell in
   column A of the Risk Register, then **Paste Special > Values** with **Skip
   blanks** ticked. Columns J, O and W are left blank on purpose so the register's
   formulas keep working.
6. Delete the assessment from the phone (Settings > Delete all exported assessments).

Never enter key-safe codes, door codes or passwords. The app warns about this.

## Data protection

- The data is special-category (health) information. The assessor is responsible
  for the security of the phone. Keep the phone's own passcode on.
- The provider should complete a **DPIA** before real client data is used.
- iOS can clear a website's stored data if it is not used for a while. **Export
  promptly.** Home shows "Finished, not exported yet" until you do.
- There is no backup of assessments on the phone. **The export file is the backup.**

## Changing things

| To change | Edit | Notes |
|---|---|---|
| Staff list (day to day) | In the app: **Settings** | Names must match the **Staff Names** list in the workbook, because the Risk Register only accepts those names. |
| Starting staff list for a new install | `src/data/risk-areas.json` > `defaults.staff` | Only used the first time the app is opened on a phone. |
| Questions, guidance, warnings, priorities | `src/data/risk-areas.json` | Keep each area's `id` unchanged once assessments exist. |
| Rating table and colours | `src/config/rating-matrix.json` | Also change the table in the workbook (Lists tab) so they agree. Run the tests: they check the table against the original. |
| Review interval, ref prefix and number | In the app: **Settings** | |

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
