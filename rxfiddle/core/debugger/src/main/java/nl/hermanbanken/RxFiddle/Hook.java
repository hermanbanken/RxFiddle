package nl.hermanbanken.RxFiddle;

import jdk.internal.org.objectweb.asm.Type;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Objects;
import java.util.Stack;

class Trace {
    private final String className;
    private final String methodName;
    private final int lineNumber;

    Trace(String className, String methodName, int lineNumber) {
        this.className = className;
        this.methodName = methodName;
        this.lineNumber = lineNumber;
    }

    @Override
    public boolean equals(Object obj) {
        return obj instanceof Trace && Objects.deepEquals(this, obj);
    }

    @Override
    public String toString() {
        return String.format("%s.%s:%d", className, methodName, lineNumber);
    }
}

@SuppressWarnings({"FieldCanBeLocal", "unused"})
class Invoke {
    private final Object subject;
    private final String className;
    private final String methodName;
    private Object result;

    Invoke(Object subject, String className, String methodName) {
        this.subject = subject;
        this.className = className;
        this.methodName = methodName;
    }

    void setResult(Object result) {
        this.result = result;
    }

    @Override
    public String toString() {
        return subject == null
                ? String.format("%s.%s() @ static", className, methodName)
                : String.format("%s.%s() @ %s", className, methodName, subject);
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

    static {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    Thread.sleep(4000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }

                System.err.println(results);
            }
        }).start();
    }

    public static final Stack<Trace> traces = new Stack<>();
    public static HashMap<Trace,ArrayList<Invoke>> results = new HashMap<>();

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
        synchronized (traces) {
            if (traces.isEmpty()) return;
            ArrayList<Invoke> list = results.get(traces.peek());
            if (list.size() > 0) return;
            list.add(new Invoke(subject, className, methodName));
        }
    }

    /** Tracing **/
    public static void enter(String className, String methodName, int lineNumber) {
        Trace trace = new Trace(className, methodName, lineNumber);
        traces.add(trace);
        results.put(trace, new ArrayList<>());
    }

    public static void leave(Object subject) {
        ArrayList<Invoke> invokes = results.get(traces.pop());
        if(invokes.size() > 0) {
            invokes.get(0).setResult(subject);
        }
    }
}
