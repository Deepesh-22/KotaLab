import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        ctx=await b.new_context(**p.devices["Pixel 5"])
        pg=await ctx.new_page()
        errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
        await pg.wait_for_timeout(3600)
        btn = await pg.evaluate("""() => [...document.querySelectorAll('.hero__cta .btn')].map(b=>({t:b.textContent.trim(), h:Math.round(b.getBoundingClientRect().height), w:Math.round(b.getBoundingClientRect().width)}))""")
        print("BTNS:", btn)
        await pg.screenshot(path="/home/user/shots/m4-hero.png")
        await pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await pg.wait_for_timeout(2000)
        await pg.screenshot(path="/home/user/shots/m4-footer.png")
        mid = await pg.evaluate("""() => ({overflowX: document.documentElement.scrollWidth-document.documentElement.clientWidth, errors:null})""")
        print("MID:", mid, "errs:", errs)
        await b.close()
asyncio.run(main())
