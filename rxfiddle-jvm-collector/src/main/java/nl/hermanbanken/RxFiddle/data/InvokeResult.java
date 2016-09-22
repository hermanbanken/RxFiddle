package nl.hermanbanken.rxfiddle.data;

public class InvokeResult implements RxFiddleEvent {
  public final Invoke invoke;
  public final Object result;

  public InvokeResult(Invoke invoke, Object result) {
    this.invoke = invoke;
    this.result = result;
  }
}
