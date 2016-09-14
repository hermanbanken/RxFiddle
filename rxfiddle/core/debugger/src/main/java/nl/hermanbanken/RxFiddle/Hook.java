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
    static final String HOOK_OWNER_NAME = Type.getInternalName(Hook.class);
    static final String HOOK_METHOD_NAME = Hook.class.getDeclaredMethods()[0].getName();
    static final String HOOK_METHOD_DESC = Type.getMethodDescriptor(Hook.class.getDeclaredMethods()[0]);

    public static void hook(Object subject, String className, String methodName) {
//        System.out.printf("%s.%s() @ %s\n", className, methodName, subject);
    }

    public static class Static {
        static final String HOOK_OWNER_NAME = Type.getInternalName(Hook.Static.class);
        static final String HOOK_METHOD_NAME = Hook.Static.class.getDeclaredMethods()[0].getName();
        static final String HOOK_METHOD_DESC = Type.getMethodDescriptor(Hook.Static.class.getDeclaredMethods()[0]);

        public static void hook(String className, String methodName) {
//            System.out.printf("%s.%s() @ static\n", className, methodName);
        }
    }

    private static String access_fileName = null;
    private static String access_className = null;
    private static String access_methodName = null;
    private static int access_lineNumber = 0;

    static final String ACCESS_OWNER_NAME = Type.getInternalName(Hook.class);
    static final String ACCESS_METHOD_NAME = Hook.class.getDeclaredMethods()[1].getName();
    static final String ACCESS_METHOD_DESC = Type.getMethodDescriptor(Hook.class.getDeclaredMethods()[1]);

    public static void access(String fileName, String className, String methodName, int lineNumber) {
        access_fileName = fileName;
        access_className = className;
        access_methodName = methodName;
        access_lineNumber = lineNumber;
        System.out.printf("access: %s %s %s %d\n", fileName, className, methodName, lineNumber);
    }

}
