package nl.hermanbanken.rxfiddle.data;

import java.util.Objects;

public class Label implements RxFiddleEvent {
  public final String className;
  public final String methodName;
  public final int lineNumber;

  public Label(String className, String methodName, int lineNumber) {
    this.className = className;
    this.methodName = methodName;
    this.lineNumber = lineNumber;
  }

  @Override
  public boolean equals(Object obj) {
    return obj instanceof Label && Objects.deepEquals(this, obj);
  }
}
