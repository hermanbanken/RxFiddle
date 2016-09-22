package nl.hermanbanken.rxfiddle;

import nl.hermanbanken.rxfiddle.data.*;
import nl.hermanbanken.rxfiddle.visualiser.Visualizer;

import java.util.LinkedList;

public class CaptureVisualizer implements Visualizer {
  LinkedList<RxFiddleEvent> events = new LinkedList<>();

  @Override
  public void logRun(Object identifier) {
    events.clear();
  }

  @Override
  public void logInvoke(Invoke invoke) {
    events.add(invoke);
  }

  @Override
  public void logResult(InvokeResult result) {
    events.add(result);
  }

  @Override
  public void logRuntime(RuntimeEvent runtimeEvent) {
    events.add(runtimeEvent);
  }

  @Override
  public void logFollow(Follow follow) {
    events.add(follow);
  }
}
