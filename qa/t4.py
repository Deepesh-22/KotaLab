import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        m=await b.new_context(**p.devices["Pixel 5"])
        pg=await m.new_page()
        errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m_: errs.append(m_.text) if m_.type=="error" else None)
        await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
        await pg.wait_for_timeout(4000)
        await pg.screenshot(path="/home/user/shots/m3-01-hero.png")
        ov = await pg.evaluate("""() => {
            const de=document.documentElement; const bad=[];
            document.querySelectorAll('body *').forEach(el=>{const r=el.getBoundingClientRect();
              if(r.width>0 && r.right>de.clientWidth+2) bad.push({t:el.tagName,c:String(el.className).slice(0,30)});});
            return {scrollW:de.scrollWidth, clientW:de.clientWidth, bad: bad.filter(x=>!/marquee|fallback/.test(x.c)).slice(0,6),
                    acc:[...document.querySelectorAll('.acc')].map(a=>a.classList.contains('is-open'))};
        }""")
        print("MOBILE:", ov, "errs:", errs)
        for i,sel in enumerate(['.manifesto','#services','#pricing','#founders','#contact'], start=2):
            await pg.evaluate(f"document.querySelector('{sel}').scrollIntoView()")
            await pg.wait_for_timeout(1200)
            await pg.screenshot(path=f"/home/user/shots/m3-0{i}.png")
        # accordion tap
        await pg.evaluate("document.getElementById('pricing').scrollIntoView()")
        await pg.wait_for_timeout(800)
        await pg.click("#pricing .acc__btn")
        await pg.wait_for_timeout(600)
        opened = await pg.evaluate("() => document.querySelector('#pricing .acc').classList.contains('is-open')")
        await pg.screenshot(path="/home/user/shots/m3-acc.png")
        print("accordion after tap:", opened)
        # burger
        await pg.evaluate("window.scrollTo(0,0)")
        await pg.wait_for_timeout(400)
        await pg.click(".burger"); await pg.wait_for_timeout(700)
        await pg.screenshot(path="/home/user/shots/m3-menu.png")
        await pg.click(".burger"); await pg.wait_for_timeout(400)
        # work page
        await pg.goto("http://127.0.0.1:8080/work.html", wait_until="load")
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path="/home/user/shots/m3-work.png")
        print("work errs:", errs)
        await b.close()
asyncio.run(main())
