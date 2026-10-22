import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1440,"height":900})
        pg=await ctx.new_page()
        logs=[]
        pg.on("pageerror", lambda e: logs.append(f"PAGEERROR: {e}"))
        pg.on("console", lambda m: logs.append(m.text) if m.type=="error" else None)
        await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
        await pg.wait_for_timeout(4000)
        await pg.screenshot(path="/home/user/shots/v3-01-hero.png")
        # manifesto mid-scroll
        await pg.evaluate("window.scrollTo(0, document.querySelector('.manifesto').offsetTop + window.innerHeight*0.9)")
        await pg.wait_for_timeout(1200)
        lit = await pg.evaluate("() => ({lit: document.querySelectorAll('[data-manifesto] .w.is-lit').length, total: document.querySelectorAll('[data-manifesto] .w').length, count: document.querySelector('[data-manifesto-count]').textContent})")
        print("MANIFESTO:", lit, "errors:", logs)
        await pg.screenshot(path="/home/user/shots/v3-02-manifesto.png")
        # services
        await pg.evaluate("document.getElementById('services').scrollIntoView()")
        await pg.wait_for_timeout(1300)
        await pg.screenshot(path="/home/user/shots/v3-03-services.png")
        # pricing (accordion auto open on desktop?)
        await pg.evaluate("document.getElementById('pricing').scrollIntoView()")
        await pg.wait_for_timeout(1400)
        acc = await pg.evaluate("() => [...document.querySelectorAll('.acc')].map(a => ({open: a.classList.contains('is-open'), exp: a.querySelector('.acc__btn').getAttribute('aria-expanded'), h: a.querySelector('.acc__panel').getBoundingClientRect().height}))")
        print("ACCORDIONS:", acc)
        await pg.screenshot(path="/home/user/shots/v3-04-pricing.png")
        await pg.evaluate("window.scrollBy(0,700)")
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path="/home/user/shots/v3-05-plans.png")
        # footer
        await pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await pg.wait_for_timeout(1400)
        await pg.screenshot(path="/home/user/shots/v3-06-footer.png")
        print("ERRORS:", logs)
        await b.close()
asyncio.run(main())
