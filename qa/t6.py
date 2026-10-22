import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1440,"height":900})
        pg=await ctx.new_page()
        errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
        await pg.wait_for_timeout(3500)
        await pg.evaluate("document.querySelector('.cta-band').scrollIntoView({block:'center'})")
        await pg.wait_for_timeout(1600)
        await pg.screenshot(path="/home/user/shots/v3-cta.png")
        # clip check: is any span taller than its mask?
        clip = await pg.evaluate("""() => [...document.querySelectorAll('.line')].map(l => {
            const a = l.getBoundingClientRect().height; const b = l.firstElementChild.getBoundingClientRect().height;
            return {mask: Math.round(a), span: Math.round(b), ok: a >= b - 1};
        }).filter(x => !x.ok)""")
        print("CLIPPED LINES:", clip)
        await pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path="/home/user/shots/v3-footer2.png")
        print("errs:", errs)
        await b.close()
asyncio.run(main())
