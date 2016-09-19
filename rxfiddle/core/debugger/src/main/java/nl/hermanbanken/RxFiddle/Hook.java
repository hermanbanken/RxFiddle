package nl.hermanbanken.RxFiddle;

import jdk.internal.org.objectweb.asm.Type;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Objects;
import java.util.Stack;

/**
 * Hook for instrumented classes
 *
 * @see <a href="https://www.youtube.com/watch?v=y4Ex6bsTv3k">ScalaDays 2015 Amsterdam presentation by Tal Weiss</a>
 * @see <a href="http://www.slideshare.net/Takipi/advanced-production-debugging#33">Relevant slide from presentation</a>
 *
 */
class Trace {
    private Trace parent;
    private final String className;
    private final String methodName;
    private final int lineNumber;
    public Trace(String className, String methodName, int lineNumber) {
        this.className = className;
        this.methodName = methodName;
        this.lineNumber = lineNumber;
    }

    public void setParent(Trace parent) {
        this.parent = parent;
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

class Invoke {
    public final Object subject;
    public final String className;
    public final String methodName;
    public Object result;
    public Invoke(Object subject, String className, String methodName) {
        this.subject = subject;
        this.className = className;
        this.methodName = methodName;
    }
    public Invoke(String className, String methodName) {
        this.subject = null;
        this.className = className;
        this.methodName = methodName;
    }
    public void setResult(Object result) {
        this.result = result;
    }

    @Override
    public String toString() {
        return subject == null
            ? String.format("%s.%s() @ static", className, methodName)
            : String.format("%s.%s() @ %s", className, methodName, subject);
    }
}

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

    public static Stack<Trace> traces = new Stack<>();
    public static HashMap<Trace,ArrayList<Invoke>> results = new HashMap<>();

    public static class Instance {
        static final String HOOK_OWNER_NAME = Type.getInternalName(Hook.class);
        static final String HOOK_METHOD_NAME = "hook1";
        static final String HOOK_METHOD_DESC = "(Ljava/lang/Object;Ljava/lang/String;Ljava/lang/String;)V";
    }

    public static void hook1(Object subject, String className, String methodName) {
        if(className.startsWith("rx/plugins")) return;
        if(!traces.isEmpty()) {
            results.get(traces.peek()).add(new Invoke(subject, className, methodName));
        }
    }

    public static class Static {
        static final String HOOK_OWNER_NAME = Type.getInternalName(Hook.class);
        static final String HOOK_METHOD_NAME = "hook2";
        static final String HOOK_METHOD_DESC = "(Ljava/lang/String;Ljava/lang/String;)V";
    }

    public static void hook2(String className, String methodName) {
        if(className.startsWith("rx/plugins")) return;
        synchronized (traces) {
            if(!traces.isEmpty()) {
                results.get(traces.peek()).add(new Invoke(className, methodName));
            }
        }
    }

    static final String HOOK_CLASS_NAME = Type.getInternalName(Hook.class);
    public static class Access {
        static final String ACCESS_METHOD_NAME = "access";
        static final String ACCESS_METHOD_DESC = "(Ljava/lang/Object;Ljava/lang/String;Ljava/lang/String;)V";

        static final String LEAVE_METHOD_NAME = "leave";
        static final String LEAVE_METHOD_DESC = "(Ljava/lang/Object;)V";

        static final String ENTER_METHOD_NAME = "enter";
        static final String ENTER_METHOD_DESC = "(Ljava/lang/String;Ljava/lang/String;I)V";
    }

    public static void access(Object subject, String className, String methodName) {
        if(!traces.isEmpty()) {
            results.get(traces.peek()).add(new Invoke(subject, className, methodName));
        }
    }

    /** Tracing **/
    public static void enter(String className, String methodName, int lineNumber) {
        Trace trace = new Trace(className, methodName, lineNumber);
        if(!traces.isEmpty()) {
            trace.setParent(traces.peek());
        }
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
