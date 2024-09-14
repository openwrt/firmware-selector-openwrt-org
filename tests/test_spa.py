from playwright.sync_api import sync_playwright, expect

def test_spa(simplehttpserver):
    with sync_playwright() as p:
        browser = p.firefox.launch()
        page = browser.new_page()
        page.goto("http://localhost:8000/www/")
        assert "OpenWrt Firmware Selector" in page.title()

        assert page.locator("#versions").select_option("19.07.10")[0] == "19.07.10"

        page.fill("#models", "a7 v5")
        models = page.inner_text("#models-autocomplete-list")
        assert "TP-Link Archer A7 v5" in models

        locator = page.locator("xpath=/html/body/div/div/p")
        expect(locator).to_contain_text('Type the name or model of your device')

        page.select_option("#languages", "Deutsch (German)")
        expect(locator).to_contain_text('benutze die Eingabe um die passende')

        page.select_option("#languages", "ca")
        expect(locator).to_contain_text('el nom o el model del vostre dispositiu')

        page.select_option("#languages", "Polski (Polish)")
        expect(locator).to_contain_text('nazwę lub model swojego urządzenia')

        browser.close()
