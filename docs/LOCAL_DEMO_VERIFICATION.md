# Local demo verification — 28 October 2026

These checks apply to the browser-only learning edition. The advanced Go/MongoDB/Redis stack was retained but was not started or re-certified during these checks.

## Automated checks

- `npm test`: 3 test files, 13 tests passed.
- `npm run build`: TypeScript checking and Vite production build passed.
- `npm audit`: 0 reported vulnerabilities after compatible dependency updates, including Vite 8.3.5 and Vitest 5.0.5.

## Browser checks

The running frontend was checked with headless Chrome at 1440px desktop and 390px mobile widths.

- Sample questions rendered with local-demo and synthetic-data labels.
- Voting increased the total from 36 to 37 and disabled further answers.
- Reload restored the count and repeat-vote restriction.
- A new question started at zero votes and retained its one recorded vote after reload.
- Closing blocked votes; reopening retained the browser's prior choice.
- Duplicate answer labels produced a useful error without clearing the question.
- Downloaded CSV contained three choices and summed to the same one-vote total shown in the custom question.
- Neither viewport had horizontal overflow.
- No JavaScript page errors and no API requests occurred in the checked local flow.

The screenshots referenced by the README are actual captures of this running version:

- `docs/screenshots/demo-desktop.png`
- `docs/screenshots/demo-mobile.png`

To reproduce browser checks, install Python Playwright and a supported Chromium browser, start the frontend, then run from the repository root:

```bash
python scripts/check_local_demo.py --url http://localhost:5173 --channel chrome
```

The script uses isolated browser contexts and invented local test questions. Screenshots show the untouched sample workspace before the test votes are added.
