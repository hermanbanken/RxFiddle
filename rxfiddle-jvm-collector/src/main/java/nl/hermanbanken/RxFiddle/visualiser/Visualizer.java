package nl.hermanbanken.rxfiddle.visualiser;

import nl.hermanbanken.rxfiddle.data.Invoke;
import nl.hermanbanken.rxfiddle.data.InvokeResult;

public interface Visualizer {
    void logRun(Object identifier);
    void logInvoke(Invoke invoke);
    void logResult(InvokeResult result);
}
