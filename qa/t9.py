import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
        for w,h in [(1440,900),(1280,800),(1920,1080),(390,844)]:
            ctx=await b.new_context(viewport={"width":w,"height":h})
            pg=await ctx.new_page()
            await pg.goto("http://127.0.0.1:8080/index.html", wait_until="load")
            await pg.wait_for_timeout(3000)
            m=await pg.evaluate("""() => {
              const f=document.querySelector('.hero__foot').getBoundingClientRect();
              const hero=document.querySelector('.hero').getBoundingClientRect();
              return {footBottom:Math.round(f.bottom), heroBottom:Math.round(hero.bottom), vh:innerHeight,
                      fits: f.bottom <= hero.bottom + 1};
            }""")
            print(w,h,m)
            if w in (1440,390):
                await pg.screenshot(path=f"/home/user/shots/v4-fit-{w}.png")
            await ctx.close()
        await b.close()
asyncio.run(main())
