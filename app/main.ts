import "./reset.css";
import { El, ReactiveRuntime, render } from "@/lib";
import { Effect } from "effect";

const App = Effect.gen(function* (_) {
  const cx = yield* _(ReactiveRuntime);
  const count = cx.createSignal(0);

  const doubleCount = () => count.get() * 2;

  cx.createEffect(() => {
    console.log("count:", count.get());
  });

  return El.new(cx, "div")
    .style({
      "background-color": "red",
      width: "100%",
      height: "100vh",
      display: "flex",
      "justify-content": "center",
      "align-items": "center",
      "flex-direction": "column",
    })
    .child([
      El.new(cx, "div")
        .style({
          display: "flex",
          "justify-content": "center",
        })
        .child([
          El.new(cx, "button")
            .on("click", () => count.set(count.get() - 1))
            .text("-"),
          El.new(cx, "h1").reactiveText(() => `count: ${count.get()}`),
          El.new(cx, "button")
            .on("click", () => count.set(count.get() + 1))
            .text("+"),
        ]),
      El.new(cx, "h2").reactiveText(() => `double count: ${doubleCount()}`),
    ]);
});

render(App, document.getElementById("app")!);
