package nl.hermanbanken.RxFiddle;

import jdk.internal.org.objectweb.asm.ClassReader;
import jdk.internal.org.objectweb.asm.ClassVisitor;
import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;
import jdk.internal.org.objectweb.asm.tree.ClassNode;
import jdk.internal.org.objectweb.asm.tree.MethodNode;

import java.io.IOException;
import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.IllegalClassFormatException;
import java.security.ProtectionDomain;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;

/**
 * ClassVisitor for Rx which maps all onNext, onError and onComplete calls
 *
 * @see <a href="http://jonbell.net/2015/10/new-blog-series-java-bytecode-and-jvmti-examples/">Jon Bell's blog</a>
 * @see <a href="https://github.com/jon-bell/bytecode-examples/">Inspired by Jon Bell's Bytecode Examples on github</a>
 * @see <a href="http://blog.javabenchmark.org/2013/05/java-instrumentation-tutorial.html>Using JavaAssist</a>
 */
class RxClassVisitor extends ClassVisitor {

    private String classKey;

    private String cName;
    private boolean fixLdcClass = false;
    private boolean isClass = false;

    private HashMap<String, String> keyToMethod = new HashMap<String, String>();

    private HashSet<String> methods = new HashSet<String>();

    RxClassVisitor(ClassVisitor classVisitor) {
        super(Opcodes.ASM5, classVisitor);
    }

    @Override
    public void visit(int version, int access, String name, String signature, String superName, String[] interfaces) {
        super.visit(version, access, name, signature, superName, interfaces);

        isClass = (access & Opcodes.ACC_INTERFACE) == 0 && (access & Opcodes.ACC_ENUM) == 0;
        this.fixLdcClass = (version & 0xFFFF) < Opcodes.V1_5;
        this.cName = name;
        classKey = "__instHit" + cName.replace("/", "_");
    }

    @Override
    public void visitEnd() {
        if (isClass) {
            System.out.println(cName+" methods:");
            for (String method : methods){
                System.out.println("\t"+method);
            }
        }
        super.visitEnd();
    }

    @Override
    public MethodVisitor visitMethod(int access, final String name, final String desc, final String signature, String[] exceptions) {
        final String key = name.replace("<", "").replace(">", "") + methods.size();
        keyToMethod.put(key, name + desc);
        MethodVisitor mv = super.visitMethod(access, name, desc, signature, exceptions);
        return new MethodVisitor(Opcodes.ASM5, mv) {
            @Override
            public void visitCode() {
                if (isClass) {
                    methods.add(name+":"+desc+":"+signature);
//                    methods.add(key);
                    //At method entry, check and see if we have locally cached that this method has been hit. If not, flag it.
                    super.visitCode();
                }
            }
        };
    }

    /*ClassPool cp = ClassPool.getDefault();
                CtClass cc = cp.get("org.javabenchmark.instrumentation.Sleeping");
                CtMethod m = cc.getDeclaredMethod("randomSleep");
                m.addLocalVariable("elapsedTime", CtClass.longType);
                m.insertBefore("elapsedTime = System.currentTimeMillis();");*/
}

class RxClassTransformer implements ClassFileTransformer {

    public byte[] transform(ClassLoader loader, String className, Class<?> classBeingRedefined, ProtectionDomain protectionDomain, byte[] classfileBuffer) throws IllegalClassFormatException {
        System.out.println();
        System.out.println("Processing class " + className);
        String normalizedClassName = className.replaceAll("/", ".");

        ClassReader classReader = null;
        try {
            classReader = new ClassReader(normalizedClassName);
        } catch (IOException e1) {
            e1.printStackTrace();
        }

        ClassNode classNode = new ClassNode();
        classReader.accept(classNode, ClassReader.SKIP_DEBUG);

        List<MethodNode> allMethods = classNode.methods;
        for (MethodNode methodNode : allMethods){
            System.out.println(methodNode.name);
        }
        return classfileBuffer;
    }

    private static void processBizMethods(Class classObject) {
//        if (MyBusinessClass.class.equals(classObject)){
//            Method[] allMethods = classObject.getDeclaredMethods();
//            for (Method aMethod : allMethods){
//                System.out.println(aMethod.getName());
//                int modifiers = aMethod.getModifiers();
//                if (Modifier.isPrivate(modifiers)){
//                    System.out.println('Method ' +
//                            aMethod.getName() + ' is private');
//                }
//            }
//        }
    }
}