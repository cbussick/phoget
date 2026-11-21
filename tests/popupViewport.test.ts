import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";

// Exercise the production positioning hook. Desktop engines cannot open an iOS
// keyboard, so model its visual-viewport resize/pan without resizing the layout.
test("anchored suggestions stay clear of the field in a keyboard-sized viewport", async (t) => {
  const server = await createServer({
    server: { host: "127.0.0.1", port: 0, hmr: false },
    plugins: [
      {
        name: "popup-viewport-fixture",
        resolveId(id) {
          if (id === "/popup-fixture.js") {
            return id;
          }
        },
        load(id) {
          if (id !== "/popup-fixture.js") {
            return;
          }
          return `import React, {useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {useAnchoredPopup} from '/src/shared/ui/OptionList/useAnchoredPopup.ts';
function Fixture() {
  const anchor = useRef(null), popup = useRef(null);
  useAnchoredPopup(true, anchor, popup);
  return React.createElement(React.Fragment, null,
    React.createElement('input', {ref: anchor, value: 'Typing', readOnly: true, style: {position:'absolute',top:170,left:20,width:220,height:48,boxSizing:'border-box'}}),
    React.createElement('div', {ref:popup, popover:'manual', id:'popup', style:{position:'fixed',inset:'auto',margin:0,padding:4,maxHeight:280,boxSizing:'border-box',overflow:'auto'}},
      Array.from({length:8}, (_,i) => React.createElement('div', {key:i,style:{height:48}}, 'Suggestion '+i))));
}
createRoot(document.getElementById('root')).render(React.createElement(Fixture));`;
        },
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (req.url !== "/popup-fixture") {
              return next();
            }
            res.setHeader("Content-Type", "text/html");
            res.end(
              '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/popup-fixture.js"></script></body></html>',
            );
          });
        },
      },
    ],
  });
  await server.listen();
  const address = server.httpServer!.address();
  assert.ok(address && typeof address !== "string");
  try {
    for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
      await t.test(name, async () => {
        const browser = await engine.launch();
        try {
          const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
          await page.goto(`http://127.0.0.1:${address.port}/popup-fixture`);
          await page.locator("#popup").waitFor({ timeout: 10_000 });
          await page.evaluate(() => {
            const viewport = window.visualViewport!;
            Object.defineProperties(viewport, {
              height: { configurable: true, value: 300 },
              offsetTop: { configurable: true, value: 70 },
            });
            viewport.dispatchEvent(new Event("resize"));
          });
          const check = async () =>
            page.evaluate(() => {
              const field = document.querySelector("input")!.getBoundingClientRect();
              const popup = document.getElementById("popup")!.getBoundingClientRect();
              const viewport = window.visualViewport!;
              return (
                popup.top >= viewport.offsetTop &&
                popup.bottom <= viewport.offsetTop + viewport.height &&
                (popup.bottom <= field.top || popup.top >= field.bottom)
              );
            });
          // Wait for resize/ResizeObserver work to settle, not a screenshot delay.
          await page.evaluate(
            () =>
              new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => resolve());
                });
              }),
          );
          assert.equal(
            await check(),
            true,
            "suggestions must stay in the visible viewport without covering the input",
          );
          await page.evaluate(() => {
            Object.defineProperty(window.visualViewport!, "offsetTop", {
              configurable: true,
              value: 0,
            });
            window.visualViewport!.dispatchEvent(new Event("scroll"));
          });
          await page.evaluate(
            () =>
              new Promise<void>((resolve) => {
                requestAnimationFrame(() => resolve());
              }),
          );
          assert.equal(await check(), true, "viewport panning must reposition suggestions");
          await page.evaluate(() => {
            Object.defineProperty(window.visualViewport!, "height", {
              configurable: true,
              value: 812,
            });
            window.visualViewport!.dispatchEvent(new Event("resize"));
          });
          await page.evaluate(
            () =>
              new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => resolve());
                });
              }),
          );
          assert.equal(await check(), true, "closing the keyboard must restore popup placement");
          assert.equal(Math.round((await page.locator("#popup").boundingBox())!.height), 280);
        } finally {
          await browser.close();
        }
      });
    }
  } finally {
    await server.close();
  }
});
