from selenium import webdriver
from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities


def init_driver():
    driver = webdriver.Remote(
        command_executor="http://localhost:4444/wd/hub",
        desired_capabilities=DesiredCapabilities.FIREFOX,
    )
    return driver


def test_spa():
    driver = init_driver()
    driver.get("http://localhost:8000")
    assert "OpenWrt Firmware Selector" in driver.title

    versions = Select(driver.find_element_by_id("versions"))
    selected_version = versions.first_selected_option.get_attribute("value")
    assert "snapshot" not in selected_version.lower()

    model = driver.find_element_by_id("models")
    model.clear()
    model.send_keys("a7 v5")

    models = driver.find_element_by_id("models-autocomplete-list")
    assert "TP-Link Archer A7 v5" in models.text

    message = driver.find_element_by_xpath("/html/body/div/div/p")
    assert "Type the name or model of your device" in message.text

    lang = Select(driver.find_element_by_css_selector("#languages select"))

    lang.select_by_visible_text("Deutsch")
    message = driver.find_element_by_xpath("/html/body/div/div/p")
    assert "benutze die Eingabe um die passende" in message.text

    lang.select_by_value("ca")
    message = driver.find_element_by_xpath("/html/body/div/div/p")
    assert "servir el formulari de sota per seleccionar" in message.text

    lang.select_by_visible_text("Polski")
    message = driver.find_element_by_xpath("/html/body/div/div/p")
    assert "nazwę lub model swojego urządzenia" in message.text
