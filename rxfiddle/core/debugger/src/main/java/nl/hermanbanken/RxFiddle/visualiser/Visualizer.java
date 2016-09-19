package nl.hermanbanken.RxFiddle.visualiser;

import nl.hermanbanken.RxFiddle.data.Invoke;
import nl.hermanbanken.RxFiddle.data.InvokeResult;

public interface Visualizer {
    void logRun(Object identifier);
    void logInvoke(Invoke invoke);
    void logResult(InvokeResult result);
}
