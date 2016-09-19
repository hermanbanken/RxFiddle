package nl.hermanbanken.RxFiddle;

import jdk.internal.org.objectweb.asm.Type;

import java.util.*;

class Label {
    private final String className;
    private final String methodName;
    private final int lineNumber;

    Label(String className, String methodName, int lineNumber) {
        this.className = className;
        this.methodName = methodName;
        this.lineNumber = lineNumber;
    }

    @Override
    public boolean equals(Object obj) {
        return obj instanceof Label && Objects.deepEquals(this, obj);
    }

    @Override
    public String toString() {
        return String.format("%s.%s:%d", className.replace('/', '.'), methodName, lineNumber);
    }
}

@SuppressWarnings({"FieldCanBeLocal", "unused"})
class Invoke {
    private final Object target;
    private final String className;
    private final String methodName;
    private final Label label;

    Invoke(Object target, String className, String methodName, Label label) {
        this.target = target;
        this.className = className;
        this.methodName = methodName;
        this.label = label;
    }

    public static String objectToString(Object object) {
        return String.format("(%s %s)", object.getClass().getName(), Integer.toHexString(object.hashCode()));
    }

    @Override
    public String toString() {
        return target == null
                ? String.format("static[%s::%s], %s", className.replace('/', '.'), methodName, label)
                : String.format("%s[%s::%s], %s",
                    objectToString(target),
                    className.replace('/', '.'), methodName,
                    label);
    }
}

@SuppressWarnings({"FieldCanBeLocal", "unused"})
class InvokeResult {
    private final Invoke invoke;
    private final Object result;

    InvokeResult(Invoke invoke, Object result) {
        this.invoke = invoke;
        this.result = result;
    }

    @Override
    public String toString() {
        return String.format("%s => %s", invoke, Invoke.objectToString(result));
    }
}


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
        static final String CLASS_NAME = Type.getInternalName(Hook.class);

        static final String HOOK_METHOD_NAME = "libraryHook";
        static final String HOOK_METHOD_DESC = "(Ljava/lang/Object;Ljava/lang/String;Ljava/lang/String;)V";

        static final String LEAVE_METHOD_NAME = "leave";
        static final String LEAVE_METHOD_DESC = "(Ljava/lang/Object;)V";

        static final String ENTER_METHOD_NAME = "enter";
        static final String ENTER_METHOD_DESC = "(Ljava/lang/String;Ljava/lang/String;I)V";
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

interface Visualizer {
    void logRun(Object identifier);
    void logInvoke(Invoke invoke);
    void logResult(InvokeResult result);
}

class StdOutVisualizer implements Visualizer {

    @Override
    public void logRun(Object identifier) {
        System.out.println("fiddle run "+identifier);
    }

    @Override
    public void logInvoke(Invoke invoke) {
        System.out.println("fiddle setup "+invoke);
    }

    @Override
    public void logResult(InvokeResult result) {
        System.out.println("fiddle setup "+result);
    }

    static {
        new Thread(() -> {
            try {
                Thread.sleep(4000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

            System.err.println(Hook.results);
        }).start();
    }
}