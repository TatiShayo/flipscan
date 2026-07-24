import asyncio
import os
from playwright.async_api import async_playwright

async def capture():
    dirs = [
        r"c:\Users\TATI\Desktop\DEV\flipscan\.vision\round-1",
        r"c:\Users\TATI\Desktop\DEV\flipscan\vision-review"
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # Desktop
        page_desktop = await browser.new_page(viewport={"width": 1280, "height": 800})
        await page_desktop.goto("http://localhost:3005/", wait_until="networkidle")
        for d in dirs:
            await page_desktop.screenshot(path=os.path.join(d, "landing-desktop.png"))
            
        await page_desktop.goto("http://localhost:3005/privacy", wait_until="networkidle")
        for d in dirs:
            await page_desktop.screenshot(path=os.path.join(d, "landing-privacy-desktop.png"))

        # Mobile viewport
        page_mobile = await browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15")
        await page_mobile.goto("http://localhost:3005/", wait_until="networkidle")
        for d in dirs:
            await page_mobile.screenshot(path=os.path.join(d, "landing-mobile.png"))

        await page_mobile.goto("http://localhost:3005/privacy", wait_until="networkidle")
        for d in dirs:
            await page_mobile.screenshot(path=os.path.join(d, "landing-privacy-mobile.png"))

        await browser.close()
        print("Screenshots captured successfully!")

if __name__ == "__main__":
    asyncio.run(capture())
