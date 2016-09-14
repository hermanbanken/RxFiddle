package nl.hermanbanken.RxFiddle;

import jdk.internal.org.objectweb.asm.Type;

/**
 * Hook for instrumented classes
 *
 * @see <a href="https://www.youtube.com/watch?v=y4Ex6bsTv3k">ScalaDays 2015 Amsterdam presentation by Tal Weiss</a>
 * @see <a href="http://www.slideshare.net/Takipi/advanced-production-debugging#33">Relevant slide from presentation</a>
 *
 */
@SuppressWarnings({"WeakerAccess", "unused"})
public class Hook {

    public static class Instance {
        static final String HOOK_OWNER_NAME = Type.getInternalName(Hook.class);
        static final String HOOK_METHOD_NAME = "hook1";
        static final String HOOK_METHOD_DESC = "(Ljava/lang/Object;Ljava/lang/String;Ljava/lang/String;)V";
    }

    public static void hook1(Object subject, String className, String methodName) {
        if(access_className != null) {
            System.out.printf("%s.%s() @ %s\n", className, methodName, subject);
            System.out.printf("\tat %s.%s:%d\n", access_className, access_methodName, access_lineNumber);
        }
    }

    public static class Static {
        static final String HOOK_OWNER_NAME = Type.getInternalName(Hook.class);
        static final String HOOK_METHOD_NAME = "hook2";
        static final String HOOK_METHOD_DESC = "(Ljava/lang/String;Ljava/lang/String;)V";
    }

    public static void hook2(String className, String methodName) {
        if(access_className != null) {
            System.out.printf("%s.%s() @ static\n", className, methodName);
            System.out.printf("\tat %s.%s:%d\n", access_className, access_methodName, access_lineNumber);
        }
    }

        private static String access_className = null;
        private static String access_methodName = null;
        private static int access_lineNumber = 0;

    public static class Access {
        static final String ACCESS_OWNER_NAME = Type.getInternalName(Hook.class);
        static final String ACCESS_METHOD_NAME = "access";
        static final String ACCESS_METHOD_DESC = "(Ljava/lang/String;Ljava/lang/String;I)V";
        static final String RESET_METHOD_NAME = "reset";
        static final String RESET_METHOD_DESC = "()V";
    }

    public static void access(String className, String methodName, int lineNumber) {
        access_className = className;
        access_methodName = methodName;
        access_lineNumber = lineNumber;
    }

    public static void reset() {
    }
}
