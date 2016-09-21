package nl.hermanbanken.rxfiddle.visualiser;

import nl.hermanbanken.rxfiddle.data.Invoke;
import nl.hermanbanken.rxfiddle.data.InvokeResult;
import nl.hermanbanken.rxfiddle.data.RuntimeEvent;

public interface Visualizer {
  void logRun(Object identifier);

  void logInvoke(Invoke invoke);

  void logResult(InvokeResult result);

  void logRuntime(RuntimeEvent runtimeEvent);
}
