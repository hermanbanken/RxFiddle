package nl.hermanbanken.rxfiddle.data;

public class Invoke {
  public final Object target;
  public final String className;
  public final String methodName;
  public final Label label;

  public Invoke(Object target, String className, String methodName, Label label) {
    this.target = target;
    this.className = className;
    this.methodName = methodName;
    this.label = label;
  }
}
