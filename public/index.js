(() => {
    "use strict";
    const e = [
        "a",
        "animate",
        "animateMotion",
        "animateTransform",
        "circle",
        "clipPath",
        "defs",
        "desc",
        "ellipse",
        "feBlend",
        "feColorMatrix",
        "feComponentTransfer",
        "feComposite",
        "feConvolveMatrix",
        "feDiffuseLighting",
        "feDisplacementMap",
        "feDistantLight",
        "feDropShadow",
        "feFlood",
        "feFuncA",
        "feFuncB",
        "feFuncG",
        "feFuncR",
        "feGaussianBlur",
        "feImage",
        "feMerge",
        "feMergeNode",
        "feMorphology",
        "feOffset",
        "fePointLight",
        "feSpecularLighting",
        "feSpotLight",
        "feTile",
        "feTurbulence",
        "filter",
        "foreignObject",
        "g",
        "image",
        "line",
        "linearGradient",
        "marker",
        "mask",
        "metadata",
        "mpath",
        "path",
        "pattern",
        "polygon",
        "polyline",
        "radialGradient",
        "rect",
        "script",
        "set",
        "stop",
        "style",
        "svg",
        "switch",
        "symbol",
        "text",
        "textPath",
        "title",
        "tspan",
        "use",
        "view",
    ];
    let n;
    let t = null;
    (function () {
        return (
            (a = this),
            (i = void 0),
            (r = function* () {
                yield "loading" !== document.readyState
                    ? Promise.resolve()
                    : new Promise((e) =>
                          document.addEventListener("DOMContentLoaded", () =>
                              e()
                          )
                      ),
                    (function (e, ...n) {
                        const a =
                            "string" == typeof e ? e : String.raw(e, ...n);
                        null == t &&
                            ((t = document.createElement("style")),
                            document.head.appendChild(t)),
                            (t.textContent += a + "\n"),
                            document.head.appendChild(t);
                    })(
                        "body {\r\n    margin: 0;\r\n    display: flex;\r\n    justify-content: center;\r\n    align-items: center;\r\n}\r\n\r\n.main-canvas-ab889dcb93091aae3f48772a65c5cdaebc212fcb {\r\n    width: 100vmin;\r\n    height: 100vmin;\r\n    background-color: lightgray;\r\n}\r\n"
                    ),
                    document.body.append(
                        (function (t, a, i) {
                            const o = (n || (n = new Set(e))).has(t)
                                ? document.createElementNS(
                                      "http://www.w3.org/2000/svg",
                                      t
                                  )
                                : document.createElement(t);
                            for (const [e, n] of Object.entries(
                                null != a ? a : {}
                            ))
                                "children" !== e &&
                                    ("style" !== e || "function" != typeof n
                                        ? o.setAttribute(e, String(n))
                                        : n(o.style));
                            const r = null == a ? void 0 : a.children;
                            if (r)
                                if (Array.isArray(r))
                                    for (const e of r) e && o.append(e);
                                else o.append(r);
                            return o;
                        })("canvas", {
                            class: "main-canvas-ab889dcb93091aae3f48772a65c5cdaebc212fcb",
                        })
                    );
            }),
            new ((o = void 0) || (o = Promise))(function (e, n) {
                function t(e) {
                    try {
                        f(r.next(e));
                    } catch (e) {
                        n(e);
                    }
                }
                function c(e) {
                    try {
                        f(r.throw(e));
                    } catch (e) {
                        n(e);
                    }
                }
                function f(n) {
                    var a;
                    n.done
                        ? e(n.value)
                        : ((a = n.value),
                          a instanceof o
                              ? a
                              : new o(function (e) {
                                    e(a);
                                })).then(t, c);
                }
                f((r = r.apply(a, i || [])).next());
            })
        );
        var a, i, o, r;
    })().catch((e) => console.error(e));
})();
