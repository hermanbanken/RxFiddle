package nl.hermanbanken.rxfiddle.rewriting;

import jdk.internal.org.objectweb.asm.Handle;
import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;
import jdk.internal.org.objectweb.asm.Type;
import nl.hermanbanken.rxfiddle.Hook;

class UsageClassMethodVisitor extends MethodVisitor implements Opcodes
{
    private final String visitedClass;
    private final String visitedMethod;
    private int lineNumber;

    UsageClassMethodVisitor(MethodVisitor mv, String visitedClass, String visitedMethod)
    {
        super(Opcodes.ASM5, mv);
        this.visitedClass = visitedClass;
        this.visitedMethod = visitedMethod;
    }

    @Override
    public void visitLineNumber(int line, jdk.internal.org.objectweb.asm.Label label) {
        lineNumber = line;
        super.visitLineNumber(line, label);
    }

    @Override
    public void visitInvokeDynamicInsn(String method, String signature, Handle handle, Object... objects) {
        super.visitInvokeDynamicInsn(method, signature, handle, objects);
//        if(method.contains("rx/")) {
//        System.out.printf("prepending to visitInvokeDynamicInsn(%s, %s) @ %s.%s:%d\n",
//                method, signature,
//                visitedClass, visitedMethod, lineNumber);
//        }

    }

    @Override
    public void visitFrame(int i, int i1, Object[] objects, int i2, Object[] objects1) {
        super.visitFrame(i, i1, objects, i2, objects1);
    }

    /**
     * Call Rx method, logging the call to Hook
     *
     * Extracts the target of the method call if the argument list is only 1 long.
     * To support longer argument lists we need more logic than just SWAP / DUP opcodes, which is why it was postponed.
     *
     * @param access which visitMethod, from {@link Opcodes}
     * @param className which call
     * @param methodName which method
     * @param signature with which signature
     * @param isInterface whether the method is of a interface
     */
    private void visitMethodInternal(int access, String className, String methodName, String signature, boolean isInterface)
    {
        // Try to fetch methodName invoke target
        if(access == Opcodes.INVOKEVIRTUAL && Type.getArgumentTypes(signature).length == 1) {
            super.visitInsn(Opcodes.SWAP); // swap to get self argument
            super.visitInsn(Opcodes.DUP);
        } else {
            super.visitInsn(Opcodes.ACONST_NULL);
        }

        // Annotate Rx ACCESS
        super.visitLdcInsn(className);
        super.visitLdcInsn(methodName);
        super.visitMethodInsn(Opcodes.INVOKESTATIC,
                Hook.Constants.CLASS_NAME,
                Hook.Constants.HOOK_METHOD_NAME,
                Hook.Constants.HOOK_METHOD_DESC, false);

        // Revert swap, if necessary
        if(access == Opcodes.INVOKEVIRTUAL && Type.getArgumentTypes(signature).length == 1) {
            super.visitInsn(Opcodes.SWAP);
        }

        // Call actual method
        super.visitMethodInsn(access, className, methodName, signature, isInterface);
    }

    @SuppressWarnings("UnusedParameters")
    private static Boolean isInteresting(String className, String methodName, String signature) {
        return
                signature.endsWith("Lrx/Observable;") ||
                signature.endsWith("Lrx/Blocking;") ||
                signature.endsWith("Lrx/Single;") ||
                signature.endsWith("Lrx/Subscription;");
    }

    /**
     * visitMethodInstruction hook
     *
     * This method labels:
     * - the execution, by logging the class/method/line of the caller
     *
     * and by delegation to {@link #visitMethodInternal(int, String, String, String, boolean)}:
     * - the invoke, by logging the class/method and optionally the target (if not static method) of the invoked
     *
     * @param access which visitMethod, from {@link Opcodes}
     * @param className which call
     * @param methodName which method
     * @param signature with which signature
     * @param isInterface whether the method is of a interface
     */
    @Override
    public void visitMethodInsn(int access, String className, String methodName, String signature, boolean isInterface) {
        try {
            if (isInteresting(className, methodName, signature)) {
                // Label ENTER
                super.visitLdcInsn(visitedClass);
                super.visitLdcInsn(visitedMethod);
                super.visitLdcInsn(lineNumber);
                super.visitMethodInsn(Opcodes.INVOKESTATIC,
                        Hook.Constants.CLASS_NAME,
                        Hook.Constants.ENTER_METHOD_NAME,
                        Hook.Constants.ENTER_METHOD_DESC, false);

                visitMethodInternal(access, className, methodName, signature, isInterface);

                // Label LEAVE
                super.visitInsn(Opcodes.DUP);
                super.visitMethodInsn(Opcodes.INVOKESTATIC,
                        Hook.Constants.CLASS_NAME,
                        Hook.Constants.LEAVE_METHOD_NAME,
                        Hook.Constants.LEAVE_METHOD_DESC, false);
            } else {
                // Call actual method
                super.visitMethodInsn(access, className, methodName, signature, isInterface);
            }
        } catch (Exception e) {
            System.out.println("Error "+e);
        }
    }
}
