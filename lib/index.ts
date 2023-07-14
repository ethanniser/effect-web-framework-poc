import {
  Brand,
  Context,
  Effect,
  pipe,
  MutableHashMap as HM,
  MutableHashSet as HS,
  Option,
} from "effect";

export type Component = Effect.Effect<ReactiveRuntime | never, never, El>;

export class Signal<T> {
  constructor(private context: ReactiveRuntime, private id: SignalId) {}

  get(): T {
    // add subscription
    const runningEffectId = this.context.runningEffectId;
    if (runningEffectId) {
      if (!HM.has(this.context.signalSubscriptions, this.id)) {
        HM.set(this.context.signalSubscriptions, this.id, HS.empty());
      }
      pipe(
        this.context.signalSubscriptions,
        HM.get(this.id),
        Option.getOrThrow,
        (subscribers) => HS.add(subscribers, runningEffectId)
      );
    }

    // return value
    return pipe(
      HM.get(this.context.signalValues, this.id),
      Option.getOrThrow
    ) as T;
  }
  set(value: T): void {
    // set value
    HM.set(this.context.signalValues, this.id, value);

    // notify subscribers
    const subscribers = pipe(
      HM.get(this.context.signalSubscriptions, this.id),
      Option.getOrThrow
    );
    if (subscribers) {
      for (const subscriber of subscribers) {
        this.context.runEffect(subscriber);
      }
    }
  }
}

type SignalId = number & Brand.Brand<"SignalId">;
const SignalId = Brand.nominal<SignalId>();

type EffectId = number & Brand.Brand<"EffectId">;
const EffectId = Brand.nominal<EffectId>();

type ReactiveRuntime = {
  signalValues: HM.MutableHashMap<SignalId, unknown>;
  runningEffectId: EffectId | null;
  signalSubscriptions: HM.MutableHashMap<SignalId, HS.MutableHashSet<EffectId>>;
  effects: HM.MutableHashMap<EffectId, () => void>;

  createSignal: <T>(initialValue: T) => Signal<T>;
  createEffect: (effect: () => void) => void;
  runEffect: (id: EffectId) => void;
};
export const ReactiveRuntime = Context.Tag<ReactiveRuntime>();

export class ReactiveRuntimeImpl implements ReactiveRuntime {
  signalValues = HM.empty<SignalId, unknown>();
  runningEffectId: EffectId | null = null;
  signalSubscriptions = HM.empty<SignalId, HS.MutableHashSet<EffectId>>();
  effects = HM.empty<EffectId, () => void>();

  private lastSignalId = 1;
  private lastEffectId = 1;

  createSignal<T>(initialValue: T): Signal<T> {
    const id = SignalId(this.lastSignalId++);
    HM.set(this.signalValues, id, initialValue);
    return new Signal(this, id);
  }

  createEffect(effect: () => void): void {
    const id = EffectId(this.lastEffectId++);
    HM.set(this.effects, id, effect);
    this.runEffect(id);
  }

  runEffect(id: EffectId): void {
    const previouslyRunningEffectId = this.runningEffectId;
    this.runningEffectId = id;

    // const effect = this.effects.get(id)!;
    const effect = pipe(HM.get(this.effects, id), Option.getOrThrow);
    effect();

    this.runningEffectId = previouslyRunningEffectId;
  }
}

export function render(component: Component, mount: HTMLElement): void {
  let element = Effect.runSync(
    pipe(
      component,
      Effect.provideService(ReactiveRuntime, new ReactiveRuntimeImpl())
    )
  ).build();
  mount.appendChild(element);
}

export class El {
  private element: HTMLElement;
  private reactiveRuntime: ReactiveRuntime;

  constructor(reactiveRuntime: ReactiveRuntime, tagName: string) {
    this.element = document.createElement(tagName);
    this.reactiveRuntime = reactiveRuntime;
  }

  static new(reactiveRuntime: ReactiveRuntime, tagName: string): El {
    return new El(reactiveRuntime, tagName);
  }

  style(styles: Record<string, string>): El {
    for (const [key, value] of Object.entries(styles)) {
      this.element.style.setProperty(key, value);
    }
    return this;
  }

  attr(name: string, value: string): El {
    this.element.setAttribute(name, value);
    return this;
  }

  on(eventName: string, handler: (e: Event) => void): El {
    this.element.addEventListener(eventName, handler);
    return this;
  }

  text(text: string): El {
    this.element.appendChild(document.createTextNode(text));
    return this;
  }

  reactiveText(f: (...args: any[]) => string): El {
    const textNode = document.createTextNode(f());
    this.element.appendChild(textNode);

    this.reactiveRuntime.createEffect(() => {
      textNode.textContent = f();
    });

    return this;
  }

  child(child: El | El[]): El {
    if (Array.isArray(child)) {
      for (const c of child) {
        this.element.appendChild(c.build());
      }
    } else {
      this.element.appendChild(child.build());
    }

    return this;
  }

  build(): HTMLElement {
    return this.element;
  }
}
