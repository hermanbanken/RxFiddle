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
        System.out.printf("\nInstrumenting %s\n", className);
        super.visit(version, access, name, signature, superName, interfaces);
    }

    @Override
    public MethodVisitor visitMethod(int access, String name, String desc, String signature, String[] exceptions)
    {
        MethodVisitor mv = super.visitMethod(access, name, desc, signature, exceptions);
//        if(name.equals("<init>")) return mv;
//        if(name.equals("<cinit>")) return mv;
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
        System.out.printf("Instrumenting %s %s\n", className, method);

        // Call hook:
        if(isStatic) {
            super.visitLdcInsn(className);  // add `visitedClass` to stack
            super.visitLdcInsn(method);  // add `visitedMethod` to stack
            super.visitMethodInsn(Opcodes.INVOKESTATIC,
                    Hook.Static.HOOK_OWNER_NAME,
                    Hook.Static.HOOK_METHOD_NAME,
                    Hook.Static.HOOK_METHOD_DESC, false);
        } else {
            super.visitVarInsn(Opcodes.ALOAD, 0); // add `this` to stack
            super.visitLdcInsn(className);  // add `visitedClass` to stack
            super.visitLdcInsn(method);  // add `visitedMethod` to stack
            super.visitMethodInsn(Opcodes.INVOKESTATIC,
                    Hook.Instance.HOOK_OWNER_NAME,
                    Hook.Instance.HOOK_METHOD_NAME,
                    Hook.Instance.HOOK_METHOD_DESC, false);
        }
    }
}
