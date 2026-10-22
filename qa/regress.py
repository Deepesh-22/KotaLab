import asyncio, json
from playwright.async_api import async_playwright
BASE="http://127.0.0.1:8080"
async def main():
    out={}
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        # desktop
        ctx=await b.new_context(viewport={"width":1440,"height":900})
        pg=await ctx.new_page()
        errs=[]; reqs=[]; failed=[]
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type=="error" else None)
        pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
        pg.on("request", lambda r: reqs.append(r.url))
        pg.on("requestfailed", lambda r: failed.append(r.url))
        await pg.goto(BASE+"/index.html", wait_until="load"); await pg.wait_for_timeout(4000)
        # scroll whole page to trigger all reveals
        h = await pg.evaluate("document.body.scrollHeight")
        for i in range(1,14):
            await pg.evaluate(f"window.scrollTo(0,{int(h*i/14)})"); await pg.wait_for_timeout(260)
        await pg.wait_for_timeout(800)
        state = await pg.evaluate("""() => ({
            unrevealed: [...document.querySelectorAll('[data-reveal],[data-lines]')].filter(e=>!e.classList.contains('is-in')).length,
            clippedLines: [...document.querySelectorAll('.line')].filter(l=> l.getBoundingClientRect().height < l.firstElementChild.getBoundingClientRect().height-1).length,
            hero3d: !!window.__kotelabsHero,
            tris: window.__kotelabsHero?window.__kotelabsHero.renderer.info.render.triangles:0,
            overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            waLinks: document.querySelectorAll('a[href^="https://wa.me/"]').length,
            telLinks: document.querySelectorAll('a[href^="tel:"]').length,
            manifestoLit: document.querySelectorAll('[data-manifesto] .w.is-lit').length
        })""")
        # form
        await pg.evaluate("() => { window.__opened=null; window.open=(u)=>{window.__opened=u; return null;}; }")
        await pg.evaluate("document.getElementById('contact').scrollIntoView()"); await pg.wait_for_timeout(900)
        await pg.fill("#name","Amit"); await pg.fill("#phone","123"); await pg.fill("#business","Amit Traders")
        await pg.click("#project-form button[type=submit]"); await pg.wait_for_timeout(300)
        invalid = await pg.evaluate("() => window.__opened")
        await pg.fill("#phone","98290 12345")
        await pg.click("#project-form button[type=submit]"); await pg.wait_for_timeout(400)
        valid = await pg.evaluate("() => window.__opened")
        out["desktop"]={**state,"formInvalid":invalid,"formValid":(valid or "")[:60],
                        "consoleErrors":errs,"failed":[f for f in failed],
                        "externalReqs":sorted({u for u in reqs if not u.startswith(BASE)}),"requestCount":len(reqs)}
        await ctx.close()

        # mobile
        m=await b.new_context(**p.devices["Pixel 5"]); mp=await m.new_page()
        merr=[]
        mp.on("pageerror", lambda e: merr.append(str(e)))
        await mp.goto(BASE+"/index.html", wait_until="load"); await mp.wait_for_timeout(3500)
        mm = await mp.evaluate("""() => ({
            overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            wide: [...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect(); return r.width>0 && r.right>document.documentElement.clientWidth+2 && !/marquee|fallback/.test(String(el.className));}).length,
            canvasReady: document.getElementById('hero-canvas')?.classList.contains('is-ready'),
            count3d: window.__kotelabsHero?.count||0
        })""")
        out["mobile"]={**mm,"errors":merr}
        # work + 404
        for page_name in ("work.html","404.html"):
            p2=await m.new_page(); e2=[]
            p2.on("pageerror", lambda e: e2.append(str(e)))
            await p2.goto(BASE+"/"+page_name, wait_until="load"); await p2.wait_for_timeout(1200)
            out[page_name]={"errors":e2,"overflowX":await p2.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")}
            await p2.close()
        await m.close()

        # reduced motion
        rm=await b.new_context(viewport={"width":1280,"height":800}, reduced_motion="reduce")
        rp=await rm.new_page(); rerr=[]
        rp.on("pageerror", lambda e: rerr.append(str(e)))
        await rp.goto(BASE+"/index.html", wait_until="load"); await rp.wait_for_timeout(1500)
        red = await rp.evaluate("""() => ({
            loader: !!document.getElementById('loader'),
            three: !!window.__kotelabsHero,
            hiddenReveals: [...document.querySelectorAll('[data-reveal]')].filter(e=>parseFloat(getComputedStyle(e).opacity)<0.9).length,
            unlitWords: document.querySelectorAll('[data-manifesto] .w:not(.is-lit)').length,
            heroVisible: getComputedStyle(document.querySelector('.hero h1')).opacity
        })""")
        out["reducedMotion"]={**red,"errors":rerr}
        await rp.screenshot(path="/home/user/shots/v3-reduced.png")
        await rm.close()
        await b.close()
    print(json.dumps(out, indent=1))
asyncio.run(main())
