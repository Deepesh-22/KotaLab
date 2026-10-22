import asyncio, json, sys
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:8080"
OUT = "/home/user/shots"

async def main():
    import os; os.makedirs(OUT, exist_ok=True)
    report = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=[
            "--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--enable-webgl",
            "--ignore-gpu-blocklist", "--disable-dev-shm-usage", "--no-sandbox",
        ])

        # ---------------- DESKTOP ----------------
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        page = await ctx.new_page()
        errors, failed, requests = [], [], []
        page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("requestfailed", lambda r: failed.append(f"{r.url} :: {r.failure}"))
        page.on("request", lambda r: requests.append(r.url))

        await page.goto(BASE + "/index.html", wait_until="load")
        await page.wait_for_timeout(3200)

        # WebGL / three loaded?
        webgl = await page.evaluate("""() => {
            const c = document.getElementById('hero-canvas');
            if (!c) return {canvas:false};
            const ctx = c.getContext('webgl2') || c.getContext('webgl');
            return {
              canvas:true,
              hasContext: !!ctx,
              readyClass: c.classList.contains('is-ready'),
              w: c.width, h: c.height,
              threeLoaded: !!window.__kotelabsHero,
              rendererType: window.__kotelabsHero ? window.__kotelabsHero.renderer.constructor.name : null,
              childCount: window.__kotelabsHero ? window.__kotelabsHero.scene.children.length : 0
            };
        }""")

        # layout overflow check
        overflow = await page.evaluate("""() => {
            const de = document.documentElement;
            const wide = [];
            document.querySelectorAll('body *').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2)) {
                    wide.push({tag: el.tagName, cls: el.className && el.className.toString().slice(0,40), right: Math.round(r.right), left: Math.round(r.left)});
                }
            });
            return {scrollW: de.scrollWidth, clientW: de.clientWidth, offenders: wide.slice(0,10)};
        }""")

        # link audit
        links = await page.evaluate("""() => {
            const out = {wa:[], tel:[], mail:[], internal:[]};
            document.querySelectorAll('a[href]').forEach(a => {
                const h = a.getAttribute('href');
                if (h.startsWith('https://wa.me/')) out.wa.push(h);
                else if (h.startsWith('tel:')) out.tel.push(h);
                else if (h.startsWith('mailto:')) out.mail.push(h);
                else out.internal.push(h);
            });
            return out;
        }""")

        # fonts actually applied?
        fonts = await page.evaluate("""async () => {
            await document.fonts.ready;
            const h1 = document.querySelector('.hero h1');
            const b = document.body;
            return {
              h1Family: getComputedStyle(h1).fontFamily,
              bodyFamily: getComputedStyle(b).fontFamily,
              loaded: [...document.fonts].map(f => f.family + ':' + f.status)
            };
        }""")

        # reveal / split animation state
        anim = await page.evaluate("""() => ({
            words: document.querySelectorAll('.hero h1 .word > span').length,
            wordsIn: document.querySelectorAll('.hero h1 .word > span.is-in').length,
            revealTotal: document.querySelectorAll('[data-reveal]').length,
            revealIn: document.querySelectorAll('[data-reveal].is-in').length,
            marqueeGroups: document.querySelectorAll('.marquee__group').length
        })""")

        # form -> whatsapp link check (intercept window.open)
        await page.evaluate("""() => { window.__opened = null; window.open = (u) => { window.__opened = u; return null; }; }""")
        await page.fill("#name", "Test User")
        await page.fill("#phone", "9876543210")
        await page.fill("#business", "Test Coaching")
        await page.select_option("#budget", index=2)
        await page.fill("#brief", "Need a site with courses and enquiry form.")
        await page.click("#project-form button[type=submit]")
        await page.wait_for_timeout(400)
        opened = await page.evaluate("() => window.__opened")
        status = await page.inner_text("#form-status")

        await page.screenshot(path=f"{OUT}/desktop-hero.png")
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight * 0.28)")
        await page.wait_for_timeout(900)
        await page.screenshot(path=f"{OUT}/desktop-services.png")
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight * 0.62)")
        await page.wait_for_timeout(900)
        await page.screenshot(path=f"{OUT}/desktop-pricing.png")
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(900)
        await page.screenshot(path=f"{OUT}/desktop-footer.png")

        report["desktop"] = dict(webgl=webgl, overflow=overflow, links=links, fonts=fonts, anim=anim,
                                 form={"opened": opened, "status": status},
                                 console=errors[:15], failedRequests=failed[:10],
                                 requestCount=len(requests),
                                 externalRequests=[u for u in requests if not u.startswith(BASE)])

        # ---------------- WORK PAGE ----------------
        page2 = await ctx.new_page()
        errs2 = []
        page2.on("console", lambda m: errs2.append(f"{m.type}: {m.text}") if m.type == "error" else None)
        page2.on("pageerror", lambda e: errs2.append(f"pageerror: {e}"))
        await page2.goto(BASE + "/work.html", wait_until="load")
        await page2.wait_for_timeout(1200)
        await page2.screenshot(path=f"{OUT}/work.png", full_page=False)
        await page2.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page2.wait_for_timeout(700)
        await page2.screenshot(path=f"{OUT}/work-bottom.png")
        overflow2 = await page2.evaluate("() => ({scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth})")
        report["work"] = {"console": errs2[:10], "overflow": overflow2}
        await ctx.close()

        # ---------------- MOBILE ----------------
        m = await browser.new_context(**p.devices["Pixel 5"])
        mp = await m.new_page()
        merr = []
        mp.on("pageerror", lambda e: merr.append(str(e)))
        await mp.goto(BASE + "/index.html", wait_until="load")
        await mp.wait_for_timeout(3000)
        await mp.screenshot(path=f"{OUT}/mobile-hero.png")
        mov = await mp.evaluate("""() => {
            const de = document.documentElement;
            const wide = [];
            document.querySelectorAll('body *').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && (r.right > de.clientWidth + 2)) wide.push({tag: el.tagName, cls: String(el.className).slice(0,40), right: Math.round(r.right)});
            });
            const c = document.getElementById('hero-canvas');
            return {scrollW: de.scrollWidth, clientW: de.clientWidth, offenders: wide.slice(0,8),
                    canvasReady: c ? c.classList.contains('is-ready') : null,
                    navHidden: getComputedStyle(document.querySelector('.nav')).display,
                    burgerVisible: getComputedStyle(document.querySelector('.burger')).display,
                    fabOpacity: getComputedStyle(document.querySelector('.wa-fab')).opacity};
        }""")
        # burger menu
        await mp.click(".burger")
        await mp.wait_for_timeout(600)
        menu = await mp.evaluate("""() => ({
            open: document.querySelector('.mobile-menu').classList.contains('is-open'),
            bodyLocked: document.body.classList.contains('is-locked'),
            expanded: document.querySelector('.burger').getAttribute('aria-expanded')
        })""")
        await mp.screenshot(path=f"{OUT}/mobile-menu.png")
        await mp.click(".burger")
        await mp.wait_for_timeout(400)
        # scroll to pricing on mobile
        await mp.evaluate("document.getElementById('pricing').scrollIntoView()")
        await mp.wait_for_timeout(1000)
        await mp.screenshot(path=f"{OUT}/mobile-pricing.png")
        await mp.evaluate("document.getElementById('contact').scrollIntoView()")
        await mp.wait_for_timeout(1000)
        await mp.screenshot(path=f"{OUT}/mobile-contact.png")

        report["mobile"] = {"pageerrors": merr[:5], **mov, "menu": menu}
        await m.close()

        # ---------------- REDUCED MOTION ----------------
        rm = await browser.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
        rp = await rm.new_page()
        rerr = []
        rp.on("pageerror", lambda e: rerr.append(str(e)))
        await rp.goto(BASE + "/index.html", wait_until="load")
        await rp.wait_for_timeout(1500)
        rmstate = await rp.evaluate("""() => ({
            revealsVisible: [...document.querySelectorAll('[data-reveal]')].slice(0,6).map(e => getComputedStyle(e).opacity),
            wordsVisible: [...document.querySelectorAll('.hero h1 .word > span')].slice(0,3).map(e => getComputedStyle(e).transform),
            threeLoaded: !!window.__kotelabsHero
        })""")
        await rp.screenshot(path=f"{OUT}/reduced-motion.png")
        report["reducedMotion"] = {"errors": rerr, **rmstate}
        await rm.close()

        await browser.close()

    print(json.dumps(report, indent=2, default=str))

asyncio.run(main())
