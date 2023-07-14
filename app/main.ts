import "./reset.css";
import { El, ReactiveRuntime, render } from "@/lib";
import { Effect } from "effect";

const App = Effect.gen(function* (_) {
  const cx = yield* _(ReactiveRuntime);
  const count = cx.createSignal(0);

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
    })
    .child([
      El.new(cx, "button")
        .on("click", () => count.set(count.get() - 1))
        .text("-"),
      El.new(cx, "h1").reactiveText(() => count.get().toString()),
      El.new(cx, "button")
        .on("click", () => count.set(count.get() + 1))
        .text("+"),
    ]);
});

render(App, document.getElementById("app")!);
