package nl.hermanbanken.RxFiddle;

import jdk.internal.org.objectweb.asm.ClassReader;
import jdk.internal.org.objectweb.asm.ClassVisitor;
import jdk.internal.org.objectweb.asm.ClassWriter;

import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.IllegalClassFormatException;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;

@SuppressWarnings("unused")
public class PreMain {

    public static void premain(String args, Instrumentation inst) {
        inst.addTransformer(new ClassFileTransformer() {
            public byte[] transform(ClassLoader loader, String className, Class<?> classBeingRedefined, ProtectionDomain protectionDomain, byte[] classfileBuffer) throws IllegalClassFormatException {
                //For our purposes, skip java* and sun* internal methods
                if (className.startsWith("java") || className.startsWith("sun"))
                    return null;
                ClassReader cr = new ClassReader(classfileBuffer);
                ClassWriter cw = new ClassWriter(ClassWriter.COMPUTE_MAXS);
                try {
                    ClassVisitor cv = new RxClassVisitor(cw);
                    cr.accept(cv, 0);
                    return cw.toByteArray();
                } catch (Throwable t) {
                    t.printStackTrace();
                    return null;
                }
            }
        });
    }
}

