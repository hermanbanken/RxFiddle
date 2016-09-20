package nl.hermanbanken.rxfiddle.data;

public class InvokeResult {
  public final Invoke invoke;
  public final Object result;

  public InvokeResult(Invoke invoke, Object result) {
    this.invoke = invoke;
    this.result = result;
  }
}
