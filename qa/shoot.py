import asyncio, os
from playwright.async_api import async_playwright
OUT="/home/user/shots"; os.makedirs(OUT, exist_ok=True)
BASE="http://127.0.0.1:8080"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"])
        # desktop
        ctx = await b.new_context(viewport={"width":1440,"height":900})
        pg = await ctx.new_page()
        await pg.goto(BASE+"/index.html", wait_until="load")
        await pg.wait_for_timeout(4000)
        info = await pg.evaluate("() => ({hero: !!window.__kotelabsHero, kids: window.__kotelabsHero ? window.__kotelabsHero.scene.children.length : 0})")
        print("desktop 3d:", info)
        await pg.screenshot(path=f"{OUT}/01-hero.png")
        # scroll through
        for i,frac in enumerate([0.16,0.30,0.44,0.58,0.72,0.86,0.97], start=2):
            await pg.evaluate(f"window.scrollTo(0, document.body.scrollHeight*{frac})")
            await pg.wait_for_timeout(1200)
            await pg.screenshot(path=f"{OUT}/0{i}-desktop-scroll.png")
        await ctx.close()

        # mobile
        m = await b.new_context(**p.devices["Pixel 5"])
        mp = await m.new_page()
        await mp.goto(BASE+"/index.html", wait_until="load")
        await mp.wait_for_timeout(4000)
        await mp.screenshot(path=f"{OUT}/mobile-01-hero.png")
        for i,frac in enumerate([0.18,0.45,0.7,0.9], start=2):
            await mp.evaluate(f"window.scrollTo(0, document.body.scrollHeight*{frac})")
            await mp.wait_for_timeout(1100)
            await mp.screenshot(path=f"{OUT}/mobile-0{i}.png")
        await m.close()
        await b.close()
asyncio.run(main())
