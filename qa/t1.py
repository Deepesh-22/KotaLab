import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1440,"height":900})
        pg=await ctx.new_page()
        logs=[]
        pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
        pg.on("pageerror", lambda e: logs.append(f"PAGEERROR: {e}"))
        pg.on("requestfailed", lambda r: logs.append(f"REQFAIL: {r.url} {r.failure}"))
        await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
        await pg.wait_for_timeout(4500)
        info = await pg.evaluate("""() => ({
          hero3d: !!window.__kotelabsHero,
          count: window.__kotelabsHero ? window.__kotelabsHero.count : 0,
          tris: window.__kotelabsHero ? window.__kotelabsHero.renderer.info.render.triangles : 0,
          loaderGone: !document.getElementById('loader'),
          bodyClass: document.body.className,
          heroLinesIn: document.querySelectorAll('.hero .line.is-in').length,
          words: document.querySelectorAll('[data-manifesto] .w').length,
          manifestoH: document.querySelector('.manifesto').getBoundingClientRect().height
        })""")
        print("INFO:", info)
        await pg.screenshot(path="/home/user/shots/v3-hero.png")
        print("LOGS:", [l for l in logs if not l.startswith('warning')][:8])
        await b.close()
asyncio.run(main())
