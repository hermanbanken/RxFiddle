package nl.hermanbanken.rxfiddle.rewriting;

import jdk.internal.org.objectweb.asm.ClassVisitor;
import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;

class UsageClassVisitor extends ClassVisitor {
  private String className;

  UsageClassVisitor(ClassVisitor cv) {
    super(Opcodes.ASM5, cv);
  }

  @Override
  public void visit(
      int version,
      int access,
      String name,
      String signature,
      String superName,
      String[] interfaces) {
    this.className = name;
    super.visit(version, access, name, signature, superName, interfaces);
  }

  /**
   * Visits information about an inner class. This inner class is not necessarily a member of the class being visited.
   *
   * @param name the internal name of an inner class (see getInternalName).
   * @param outerName the internal name of the class to which the inner class belongs (see getInternalName). May be null for not member classes.
   * @param innerName the (simple) name of the inner class inside its enclosing class. May be null for anonymous inner classes.
   * @param access the access flags of the inner class as originally declared in the enclosing class.
   */
  @Override
  public void visitInnerClass(String name, String outerName, String innerName, int access) {
    super.visitInnerClass(name, outerName, innerName, access);
  }

  /**
   * Visits the enclosing class of the class. This method must be called only if the class has an enclosing class.
   *
   * @param owner internal name of the enclosing class of the class.
   * @param name the name of the method that contains the class, or null if the class is not enclosed in a method of its enclosing class.
   * @param desc the descriptor of the method that contains the class, or null if the class is not enclosed in a method of its enclosing class.
   */
  @Override
  public void visitOuterClass(String owner, String name, String desc) {
    super.visitOuterClass(owner, name, desc);
  }

  @Override
  public MethodVisitor visitMethod(
      int access, String name, String desc, String signature, String[] exceptions) {
    MethodVisitor mv = super.visitMethod(access, name, desc, signature, exceptions);
    if (ignore(className)) return mv;
    return new UsageClassMethodVisitor(mv, className, name, access);
  }

  private static boolean ignore(String className) {
    return className.startsWith("sun/") || className.startsWith("java/");
  }
}
