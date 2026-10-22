import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1440,"height":900})
        pg=await ctx.new_page()
        errs=[]; failed=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
        pg.on("requestfailed", lambda r: failed.append(r.url))
        await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
        await pg.wait_for_timeout(3000)
        await pg.evaluate("document.getElementById('founders').scrollIntoView({block:'center'})")
        await pg.wait_for_timeout(1600)
        info = await pg.evaluate("""() => {
            const img = document.querySelector('.founder__photo img');
            const chip = document.querySelector('.avatar-stack img');
            const r = img.getBoundingClientRect();
            return {founderImg: {w:Math.round(r.width), h:Math.round(r.height), natural:[img.naturalWidth,img.naturalHeight], complete:img.complete, alt:img.alt},
                    chip: {w:Math.round(chip.getBoundingClientRect().width), natural:[chip.naturalWidth,chip.naturalHeight], complete:chip.complete}};
        }""")
        print("IMG:", info)
        await pg.screenshot(path="/home/user/shots/photo-founders.png")
        await pg.evaluate("window.scrollTo(0,0)")
        await pg.wait_for_timeout(1400)
        await pg.screenshot(path="/home/user/shots/photo-hero.png")
        print("errors:", errs, "failed:", failed)
        # other founder untouched?
        d = await pg.evaluate("""() => [...document.querySelectorAll('.founder')].map(f => ({
            name: f.querySelector('.founder__name').textContent.trim(),
            hasPhoto: !!f.querySelector('.founder__photo img'),
            initials: f.querySelector('.avatar')?.textContent.trim() || null
        }))""")
        print("FOUNDERS:", d)
        await ctx.close()
        m=await b.new_context(**p.devices["Pixel 5"]); mp=await m.new_page()
        await mp.goto("http://127.0.0.1:8080/index.html", wait_until="load"); await mp.wait_for_timeout(3000)
        await mp.evaluate("document.getElementById('founders').scrollIntoView()"); await mp.wait_for_timeout(1400)
        await mp.screenshot(path="/home/user/shots/photo-mobile.png")
        print("mobile overflowX:", await mp.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"))
        await b.close()
asyncio.run(main())
