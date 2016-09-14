package nl.hermanbanken.RxFiddle;

import jdk.internal.org.objectweb.asm.ClassVisitor;
import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;

import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;

/**
 * ClassVisitor for Rx which maps all onNext, onError and onComplete calls
 *
 * @see <a href="http://jonbell.net/2015/10/new-blog-series-java-bytecode-and-jvmti-examples/">Jon Bell's blog</a>
 * @see <a href="https://github.com/jon-bell/bytecode-examples/">Inspired by Jon Bell's Bytecode Examples on github</a>
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
            System.out.println("Methods:");
            System.out.println(Arrays.toString(methods.toArray()));
        }
        super.visitEnd();
    }

    @Override
    public MethodVisitor visitMethod(int access, String name, String desc, String signature, String[] exceptions) {
        final String key = "__instCounter_" + name.replace("<", "").replace(">", "") + methods.size();
        keyToMethod.put(key, name + desc);
        MethodVisitor mv = super.visitMethod(access, name, desc, signature, exceptions);
        return new MethodVisitor(Opcodes.ASM5, mv) {
            @Override
            public void visitCode() {
                if (isClass) {
                    methods.add(key);
                    //At method entry, check and see if we have locally cached that this method has been hit. If not, flag it.
                    super.visitCode();
                }
            }
        };
    }
}
