import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1440,"height":900})
        pg=await ctx.new_page()
        await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
        await pg.wait_for_timeout(2500)
        await pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await pg.wait_for_timeout(2200)
        wm = await pg.evaluate("""() => {
            const w=document.querySelector('.footer__wordmark');
            const r=w.getBoundingClientRect();
            return {cls:w.className, rect:{top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height)},
                    vh:innerHeight, clip:getComputedStyle(w).clipPath, op:getComputedStyle(w).opacity,
                    scrollY:Math.round(scrollY), docH:document.body.scrollHeight,
                    supportsIO:'IntersectionObserver' in window};
        }""")
        print("WM:", wm)
        await pg.screenshot(path="/home/user/shots/v4-footer.png")
        await b.close()
asyncio.run(main())
