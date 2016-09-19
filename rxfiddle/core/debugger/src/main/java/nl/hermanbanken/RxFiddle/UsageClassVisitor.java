package nl.hermanbanken.RxFiddle;

import jdk.internal.org.objectweb.asm.*;

class UsageClassVisitor extends ClassVisitor
{
    private String className;

    UsageClassVisitor(ClassVisitor cv) {
        super(Opcodes.ASM5, cv);
    }

    @Override
    public void visit(int version, int access, String name, String signature, String superName, String[] interfaces) {
        this.className = name;
        super.visit(version, access, name, signature, superName, interfaces);
    }

    @Override
    public void visitSource(String file, String debug) {
        super.visitSource(file, debug);
    }

    @Override
    public MethodVisitor visitMethod(int access, String name, String desc, String signature, String[] exceptions)
    {
        MethodVisitor mv = super.visitMethod(access, name, desc, signature, exceptions);
        if(className.startsWith("java/util")) return mv;
        return new UsageClassMethodVisitor(mv, className, name);
    }
}

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
    public void visitLineNumber(int line, Label label) {
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
                Hook.HOOK_CLASS_NAME,
                Hook.Access.ACCESS_METHOD_NAME,
                Hook.Access.ACCESS_METHOD_DESC, false);

        // Revert swap, if necessary
        if(access == Opcodes.INVOKEVIRTUAL && Type.getArgumentTypes(signature).length == 1) {
            super.visitInsn(Opcodes.SWAP);
        }

        // Call actual method
        super.visitMethodInsn(access, className, methodName, signature, isInterface);
    }

    /**
     * visitMethodInstruction hook
     *
     * This method traces:
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
            if (className.contains("rx/")) {
                // Trace ENTER
                super.visitLdcInsn(visitedClass);
                super.visitLdcInsn(visitedMethod);
                super.visitLdcInsn(lineNumber);
                super.visitMethodInsn(Opcodes.INVOKESTATIC,
                        Hook.HOOK_CLASS_NAME,
                        Hook.Access.ENTER_METHOD_NAME,
                        Hook.Access.ENTER_METHOD_DESC, false);

                visitMethodInternal(access, className, methodName, signature, isInterface);

                // Trace LEAVE
                super.visitInsn(Opcodes.DUP);
                super.visitMethodInsn(Opcodes.INVOKESTATIC,
                        Hook.HOOK_CLASS_NAME,
                        Hook.Access.LEAVE_METHOD_NAME,
                        Hook.Access.LEAVE_METHOD_DESC, false);
            } else {
                // Call actual method
                super.visitMethodInsn(access, className, methodName, signature, isInterface);
            }
        } catch (Exception e) {
            System.out.println("Error "+e);
        }
    }
}