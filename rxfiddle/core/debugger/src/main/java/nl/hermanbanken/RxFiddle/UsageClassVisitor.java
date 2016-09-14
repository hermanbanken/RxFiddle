package nl.hermanbanken.RxFiddle;

import jdk.internal.org.objectweb.asm.ClassVisitor;
import jdk.internal.org.objectweb.asm.Label;
import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;

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
    public void visitMethodInsn(int access, String ownerClass, String method, String signature, boolean isInterface) {
        // Set caller
        if(ownerClass.contains("rx/")) {
            System.out.printf("prepending to visitMethodInsn(%s, %s) @ %s.%s:%d\n",
                    ownerClass, method,
                    visitedClass, visitedMethod, lineNumber);

            super.visitLdcInsn(visitedClass);
            super.visitLdcInsn(visitedMethod);
            super.visitLdcInsn(lineNumber);

            super.visitMethodInsn(Opcodes.INVOKESTATIC,
                    Hook.Access.ACCESS_OWNER_NAME,
                    Hook.Access.ACCESS_METHOD_NAME,
                    Hook.Access.ACCESS_METHOD_DESC, false);
        }

        super.visitMethodInsn(access, ownerClass, method, signature, isInterface);

        // Reset caller
        if(ownerClass.contains("rx/")) {
            super.visitMethodInsn(Opcodes.INVOKESTATIC,
                    Hook.Access.ACCESS_OWNER_NAME,
                    Hook.Access.RESET_METHOD_NAME,
                    Hook.Access.RESET_METHOD_DESC, false);
        }
    }
}