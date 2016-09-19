package nl.hermanbanken.RxFiddle.rewriting;

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
