package nl.hermanbanken.RxFiddle;

import jdk.internal.org.objectweb.asm.ClassVisitor;
import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;

class LibraryClassVisitor extends ClassVisitor
{
    private String className;

    LibraryClassVisitor(ClassVisitor cv)
    {
        super(Opcodes.ASM5, cv);
    }

    @Override
    public void visit(int version, int access, String name, String signature, String superName, String[] interfaces) {
        this.className = name;
        super.visit(version, access, name, signature, superName, interfaces);
    }

    @Override
    public MethodVisitor visitMethod(int access, String name, String desc, String signature, String[] exceptions)
    {
        MethodVisitor mv = super.visitMethod(access, name, desc, signature, exceptions);
        boolean isStatic = (access & Opcodes.ACC_STATIC) != 0;
        return new LibraryClassMethodVisitor(mv, className, name, isStatic);
    }
}

class LibraryClassMethodVisitor extends MethodVisitor
{
    private final String className;
    private final String method;
    private final boolean isStatic;

    LibraryClassMethodVisitor(MethodVisitor mv, String className, String method, boolean isStatic)
    {
        super(Opcodes.ASM5, mv);
        this.className = className;
        this.method = method;
        this.isStatic = isStatic;
    }

    @Override
    public void visitCode()
    {
        super.visitCode();
        try {
            // Call hook:
            if (isStatic || method.equals("<init>") || method.equals("<clinit>") || method.equals("<cinit>")) {
                super.visitInsn(Opcodes.ACONST_NULL); // add `null` to stack
            } else {
                super.visitVarInsn(Opcodes.ALOAD, 0); // add `this` to stack
            }
            super.visitLdcInsn(className);  // add `visitedClass` to stack
            super.visitLdcInsn(method);  // add `visitedMethod` to stack
            super.visitMethodInsn(Opcodes.INVOKESTATIC,
                    Hook.Constants.CLASS_NAME,
                    Hook.Constants.HOOK_METHOD_NAME,
                    Hook.Constants.HOOK_METHOD_DESC, false);
            super.visitEnd();
        } catch (Exception e) {
            System.err.println("Printing otherwise silenced error "+e);
        }
    }
}
