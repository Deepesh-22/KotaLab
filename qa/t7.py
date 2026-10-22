import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1440,"height":900})
        pg=await ctx.new_page()
        errs=[]
        pg.on("pageerror", lambda e: errs.append(f"PAGEERR {e}"))
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type=="error" else None)
        await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
        await pg.wait_for_timeout(4200)
        info = await pg.evaluate("""() => ({
            scene: !!window.__kotelabsHero,
            count: window.__kotelabsHero?.count, sparks: window.__kotelabsHero?.sparksCount,
            tris: window.__kotelabsHero?.renderer.info.render.triangles,
            sceneOpacity: getComputedStyle(document.getElementById('scene')).opacity,
            gradeVar: getComputedStyle(document.documentElement).getPropertyValue('--grade'),
            fonts: [...document.fonts].map(f=>f.family+':'+f.status),
            displayFont: getComputedStyle(document.querySelector('.hero h1')).fontFamily
        })""")
        print("INFO:", info)
        await pg.screenshot(path="/home/user/shots/v4-01-hero.png")
        # scroll sequence to see colour grading
        h = await pg.evaluate("document.body.scrollHeight")
        for i,frac in enumerate([0.14,0.28,0.42,0.56,0.70,0.84,0.96], start=2):
            await pg.evaluate(f"window.scrollTo(0,{h}*{frac})")
            await pg.wait_for_timeout(1100)
            st = await pg.evaluate("""() => ({
                grade: getComputedStyle(document.documentElement).getPropertyValue('--grade').trim(),
                hue: getComputedStyle(document.documentElement).getPropertyValue('--grade-hue').trim(),
                sceneOp: getComputedStyle(document.getElementById('scene')).opacity
            })""")
            print(frac, st)
            await pg.screenshot(path=f"/home/user/shots/v4-0{i}-scroll.png")
        # footer wordmark state
        wm = await pg.evaluate("""() => {
            const w = document.querySelector('.footer__wordmark');
            const cs = getComputedStyle(w);
            return {cls:w.className, fontSize:cs.fontSize, clip:cs.clipPath, opacity:cs.opacity,
                    bgImage:cs.backgroundImage.slice(0,60), textFill:cs.webkitTextFillColor};
        }""")
        print("WORDMARK:", wm)
        await pg.screenshot(path="/home/user/shots/v4-footer.png")
        print("ERRORS:", errs[:6])
        await b.close()
asyncio.run(main())
