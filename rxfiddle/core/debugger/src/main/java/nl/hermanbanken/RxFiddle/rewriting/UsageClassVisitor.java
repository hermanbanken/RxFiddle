package nl.hermanbanken.RxFiddle.rewriting;

import jdk.internal.org.objectweb.asm.ClassVisitor;
import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;

public class UsageClassVisitor extends ClassVisitor
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
