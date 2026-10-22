import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1440,"height":900})
        pg=await ctx.new_page()
        await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
        for t in (600, 1200, 1600, 2200, 3000):
            await pg.wait_for_timeout(t if t==600 else 600)
            st = await pg.evaluate("() => ({loader: !!document.getElementById('loader'), cls: document.getElementById('loader')?.className||'', num: document.getElementById('loader-num')?.textContent||'', lines: document.querySelectorAll('.hero .line.is-in').length})")
            print(t, st)
        await pg.screenshot(path="/home/user/shots/v3-fixed-hero.png")
        await b.close()
asyncio.run(main())
