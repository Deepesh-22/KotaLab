import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        m=await b.new_context(**p.devices["Pixel 5"])
        pg=await m.new_page()
        await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
        await pg.wait_for_timeout(3500)
        await pg.evaluate("document.getElementById('pricing').scrollIntoView()")
        for wait in (500, 1500, 3000):
            await pg.wait_for_timeout(wait)
            st = await pg.evaluate("""() => {
              const h = document.querySelector('#pricing .h2');
              const lines=[...h.querySelectorAll('.line')].map(l=>({h: Math.round(l.getBoundingClientRect().height), spanH: Math.round(l.firstElementChild.getBoundingClientRect().height), tr: getComputedStyle(l.firstElementChild).transform}));
              return {cls: h.className, lines};
            }""")
            print(wait, st)
        await pg.screenshot(path="/home/user/shots/m3-pricing-settled.png")
        await b.close()
asyncio.run(main())
