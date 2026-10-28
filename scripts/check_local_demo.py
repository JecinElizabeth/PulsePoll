"""Browser verification and reproducible screenshots for the local demo.

Requires Python Playwright and a Chromium browser. Start the frontend first.
Example: python scripts/check_local_demo.py --url http://localhost:5173 --channel chrome
"""
import argparse
import csv
import io
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://localhost:5173')
    parser.add_argument('--channel', default='')
    args = parser.parse_args()
    screenshots = Path(__file__).resolve().parents[1] / 'docs' / 'screenshots'
    errors = []
    api_requests = []

    with sync_playwright() as playwright:
        launch = {'headless': True}
        if args.channel:
            launch['channel'] = args.channel
        browser = playwright.chromium.launch(**launch)
        desktop = browser.new_context(viewport={'width': 1440, 'height': 1050}, accept_downloads=True)
        page = desktop.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: api_requests.append(request.url) if '/api/' in request.url else None)
        page.goto(args.url)
        page.wait_for_load_state('networkidle')
        expect(page.get_by_role('heading', name='What would make onboarding easier?')).to_be_visible()
        expect(page.get_by_text('Local demo', exact=True)).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        print('Desktop buttons:', page.get_by_role('button').all_text_contents())
        page.screenshot(path=str(screenshots / 'demo-desktop.png'), full_page=True)

        page.get_by_role('button', name='A clear first-week checklist', exact=True).click()
        expect(page.locator('.response-summary > strong')).to_have_text('37')
        expect(page.get_by_role('button', name='A short product walkthrough', exact=True)).to_be_disabled()
        page.reload()
        page.wait_for_load_state('networkidle')
        expect(page.get_by_role('button', name='A clear first-week checklist, your vote', exact=True)).to_be_disabled()
        expect(page.locator('.response-summary > strong')).to_have_text('37')

        page.get_by_role('button', name='+ Create a question', exact=True).click()
        page.get_by_label('Question', exact=True).fill('Which session would help the team most?')
        page.get_by_label('Context (optional)', exact=True).fill('A local browser test question.')
        page.get_by_label('Answer choices', exact=True).fill('More practice\nShorter introduction\nMore questions')
        page.get_by_role('button', name='Create question', exact=True).click()
        expect(page.get_by_role('heading', name='Which session would help the team most?', exact=True)).to_be_visible()
        page.get_by_role('button', name='More practice', exact=True).click()
        expect(page.locator('.response-summary > strong')).to_have_text('1')
        page.get_by_role('button', name='Close question', exact=True).click()
        expect(page.get_by_role('button', name='Shorter introduction', exact=True)).to_be_disabled()
        page.get_by_role('button', name='Reopen question', exact=True).click()
        expect(page.get_by_role('button', name='Shorter introduction', exact=True)).to_be_disabled()

        with page.expect_download() as download_event:
            page.get_by_role('button', name='Export results', exact=True).click()
        download = download_event.value
        with open(download.path(), encoding='utf-8-sig', newline='') as exported:
            rows = list(csv.DictReader(io.StringIO(exported.read())))
        assert len(rows) == 3
        assert sum(int(row['Votes']) for row in rows) == 1
        assert rows[0]['Percentage'] == '100.0'
        assert all(row['Data source'] == 'Local browser votes' for row in rows)

        page.reload()
        page.wait_for_load_state('networkidle')
        page.locator('.question-slip').filter(has_text='Which session would help the team most?').click()
        expect(page.get_by_role('button', name='More practice, your vote', exact=True)).to_be_disabled()
        expect(page.locator('.response-summary > strong')).to_have_text('1')

        page.get_by_role('button', name='+ Create a question', exact=True).click()
        page.get_by_label('Question', exact=True).fill('Which topic should we choose?')
        page.get_by_label('Answer choices', exact=True).fill('Practice\n practice ')
        page.get_by_role('button', name='Create question', exact=True).click()
        expect(page.get_by_role('alert')).to_contain_text('different label')

        mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, device_scale_factor=1)
        mobile_page = mobile.new_page()
        mobile_page.on('pageerror', lambda error: errors.append(str(error)))
        mobile_page.goto(args.url)
        mobile_page.wait_for_load_state('networkidle')
        expect(mobile_page.get_by_role('heading', name='What would make onboarding easier?')).to_be_visible()
        assert mobile_page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        mobile_page.screenshot(path=str(screenshots / 'demo-mobile.png'), full_page=True)
        mobile_page.get_by_role('button', name='A short product walkthrough', exact=True).click()
        expect(mobile_page.locator('.response-summary > strong')).to_have_text('37')
        expect(mobile_page.get_by_role('button', name='A clear first-week checklist', exact=True)).to_be_disabled()
        assert not errors, errors
        assert not api_requests, api_requests
        print('PASS: desktop/mobile voting, reload, creation, validation, close/reopen, CSV totals, no horizontal overflow, no page errors, no API requests.')
        mobile.close()
        desktop.close()
        browser.close()


if __name__ == '__main__':
    main()
