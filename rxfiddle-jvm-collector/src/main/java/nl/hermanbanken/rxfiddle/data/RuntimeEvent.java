package nl.hermanbanken.rxfiddle.data;

public class RuntimeEvent implements RxFiddleEvent {
  public final Object target;
  public final String className;
  public final String methodName;

  public RuntimeEvent(Object target, String className, String methodName) {
    this.target = target;
    this.className = className;
    this.methodName = methodName;
  }
}
