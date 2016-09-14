package nl.hermanbanken.RxFiddle;

import jdk.internal.org.objectweb.asm.ClassVisitor;
import jdk.internal.org.objectweb.asm.Label;
import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;

public class UsageClassVisitor extends ClassVisitor
{
    private String className;
    private String fileName;

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
        this.fileName = file;
        super.visitSource(file, debug);
    }

    @Override
    public MethodVisitor visitMethod(int access, String name, String desc, String signature, String[] exceptions)
    {
        MethodVisitor mv = super.visitMethod(access, name, desc, signature, exceptions);
        boolean isStatic = (access & Opcodes.ACC_STATIC) != 0;
        return new UsageClassMethodVisitor(mv, fileName, className, name, isStatic);
    }
}

class UsageClassMethodVisitor extends MethodVisitor implements Opcodes
{
    private final String fileName;
    private final String visitedClass;
    private final String visitedMethod;
    private int lineNumber;

    UsageClassMethodVisitor(MethodVisitor mv, String fileName, String visitedClass, String visitedMethod, boolean isStatic)
    {
        super(Opcodes.ASM5, mv);
        this.fileName = fileName;
        this.visitedClass = visitedClass;
        this.visitedMethod = visitedMethod;
    }

    @Override
    public void visitLineNumber(int i, Label label) {
        lineNumber = i;
        super.visitLineNumber(i, label);
    }

    @Override
    public void visitMethodInsn(int access, String ownerClass, String method, String signature, boolean isInterface) {
        if(ownerClass.contains("rx/")) {
            System.out.printf("prepending to visitMethodInsn(%s, %s, %s, %b) @ %s.%s:%d\n",
                    ownerClass, method, signature, isInterface,
                    visitedClass, visitedMethod, lineNumber);
            super.visitLdcInsn(fileName);
            super.visitLdcInsn(visitedClass);
            super.visitLdcInsn(visitedMethod);
            super.visitLdcInsn(lineNumber);
            super.visitMethodInsn(Opcodes.INVOKESTATIC,
                    Hook.ACCESS_OWNER_NAME,
                    Hook.ACCESS_METHOD_NAME,
                    Hook.ACCESS_METHOD_DESC, false);
        }
        super.visitMethodInsn(access, ownerClass, method, signature, isInterface);
    }
}