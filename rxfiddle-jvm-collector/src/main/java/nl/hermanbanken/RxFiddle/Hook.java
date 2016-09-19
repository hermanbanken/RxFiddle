package nl.hermanbanken.rxfiddle;

import jdk.internal.org.objectweb.asm.Type;
import nl.hermanbanken.rxfiddle.data.Invoke;
import nl.hermanbanken.rxfiddle.data.InvokeResult;
import nl.hermanbanken.rxfiddle.data.Label;
import nl.hermanbanken.rxfiddle.visualiser.StdOutVisualizer;
import nl.hermanbanken.rxfiddle.visualiser.Visualizer;

import java.util.*;

/**
 * Hook for instrumented classes
 *
 * @see <a href="https://www.youtube.com/watch?v=y4Ex6bsTv3k">ScalaDays 2015 Amsterdam presentation by Tal Weiss</a>
 * @see <a href="http://www.slideshare.net/Takipi/advanced-production-debugging#33">Relevant slide from presentation</a>
 *
 */
@SuppressWarnings({"WeakerAccess", "unused"})
public class Hook {

    public static Visualizer visualizer = new StdOutVisualizer();
    public static final Stack<Label> labels = new Stack<>();
    public static final Queue<Label> labelsForGrab = new PriorityQueue<>();
    public static final Stack<Invoke> invokes = new Stack<>();

    public static volatile Label currentLabel = null;
    public static volatile Invoke currentInvoke = null;

    public static HashMap<Label,ArrayList<Invoke>> results = new HashMap<>();

    static {
        visualizer.logRun(System.nanoTime());
    }

    public static class Constants {
        public static final String CLASS_NAME = Type.getInternalName(Hook.class);

        public static final String HOOK_METHOD_NAME = "libraryHook";
        public static final String HOOK_METHOD_DESC = "(Ljava/lang/Object;Ljava/lang/String;Ljava/lang/String;)V";

        public static final String LEAVE_METHOD_NAME = "leave";
        public static final String LEAVE_METHOD_DESC = "(Ljava/lang/Object;)V";

        public static final String ENTER_METHOD_NAME = "enter";
        public static final String ENTER_METHOD_DESC = "(Ljava/lang/String;Ljava/lang/String;I)V";
    }

    /** Usage of Rx **/
    public static void libraryHook(Object subject, String className, String methodName) {
        if(className.startsWith("rx/plugins")) return;

        if(labelsForGrab.isEmpty()) return;
        Invoke invoke = new Invoke(subject, className, methodName, labelsForGrab.poll());
        invokes.push(invoke);
        visualizer.logInvoke(invoke);
    }

    /** Tracing **/
    public static void enter(String className, String methodName, int lineNumber) {
        Label label = new Label(className, methodName, lineNumber);
        labels.add(label);
        labelsForGrab.offer(label);
    }

    public static void leave(Object target) {
        labels.pop();
        visualizer.logResult(new InvokeResult(invokes.isEmpty() ? null : invokes.pop(), target));
    }
}
