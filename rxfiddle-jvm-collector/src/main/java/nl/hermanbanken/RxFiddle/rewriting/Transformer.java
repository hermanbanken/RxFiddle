package nl.hermanbanken.rxfiddle.rewriting;

import jdk.internal.org.objectweb.asm.ClassReader;
import jdk.internal.org.objectweb.asm.ClassVisitor;
import jdk.internal.org.objectweb.asm.ClassWriter;

import java.lang.instrument.ClassFileTransformer;
import java.security.ProtectionDomain;

public class Transformer implements ClassFileTransformer {
    private final String targetPackage;

    public Transformer(String targetPackage) {
        this.targetPackage = targetPackage;
    }

    public byte[] transform(ClassLoader loader, String className, Class<?> classBeingRedefined, ProtectionDomain protectionDomain, byte[] classfileBuffer) {
        ClassReader cr = new ClassReader(classfileBuffer);
        ClassWriter cw = new ClassWriter(cr, ClassWriter.COMPUTE_FRAMES | ClassWriter.COMPUTE_MAXS);

        ClassVisitor cv;
        if(!className.startsWith(targetPackage)) {
            cv = new UsageClassVisitor(cw);
        } else {
            cv = new LibraryClassVisitor(cw);
        }
        cr.accept(cv, 0);
        return cw.toByteArray();
    }
}
