package nl.hermanbanken.rxfiddle.rewriting;

import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;
import nl.hermanbanken.rxfiddle.Hook;

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
