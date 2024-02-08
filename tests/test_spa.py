from playwright.sync_api import sync_playwright

def test_spa(simplehttpserver):
    with sync_playwright() as p:
        browser = p.firefox.launch()
        page = browser.new_page()
        page.goto("http://localhost:8000")
        assert "OpenWrt Firmware Selector" in page.title()

        assert page.locator("#versions").select_option("19.07.10")[0] == "19.07.10"

        page.fill("#models", "a7 v5")
        models = page.inner_text("#models-autocomplete-list")
        assert "TP-Link Archer A7 v5" in models

        message = page.locator("xpath=/html/body/div/div/p").inner_text()
        assert "Type the name or model of your device" in message

        page.select_option("#languages", "Deutsch (German)")
        message = page.locator("xpath=/html/body/div/div/p").inner_text()
        assert "benutze die Eingabe um die passende" in message

        page.select_option("#languages", "ca")
        message = page.locator("xpath=/html/body/div/div/p").inner_text()
        assert "el nom o el model del vostre dispositiu" in message

        page.select_option("#languages", "Polski (Polish)")
        message = page.locator("xpath=/html/body/div/div/p").inner_text()
        assert "nazwę lub model swojego urządzenia" in message

        browser.close()
