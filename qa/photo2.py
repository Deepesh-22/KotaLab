import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        for w,h,name in [(1440,900,"photo-founders2"),(390,844,"photo-mobile2")]:
            ctx=await b.new_context(viewport={"width":w,"height":h})
            pg=await ctx.new_page()
            errs=[]
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
            await pg.wait_for_timeout(2600)
            await pg.evaluate("document.querySelector('.founders').scrollIntoView({block:'center'})")
            await pg.wait_for_timeout(1500)
            sizes = await pg.evaluate("""() => [...document.querySelectorAll('.founder')].map(f => {
                const el = f.querySelector('.founder__photo, .avatar');
                const r = el.getBoundingClientRect();
                return {name: f.querySelector('.founder__name').textContent.trim(),
                        w: Math.round(r.width), h: Math.round(r.height),
                        type: f.querySelector('.founder__photo') ? 'photo' : 'initials'};
            })""")
            print(w, sizes, "errs:", errs)
            await pg.screenshot(path=f"/home/user/shots/{name}.png")
            await ctx.close()
        await b.close()
asyncio.run(main())
