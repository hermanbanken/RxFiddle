/*
 * RxFiddle - Rx debugger
 * Copyright (C) 2016 Herman Banken
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package nl.hermanbanken.rxfiddle.rewriting;

import jdk.internal.org.objectweb.asm.ClassVisitor;
import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;

class UsageClassVisitor extends ClassVisitor {
  private String className;
  private String fileName = "unknown";

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
    try {
      this.fileName = name.substring(name.lastIndexOf('/')+1, name.indexOf('$', name.lastIndexOf('/'))) + ".java";
    } catch (Exception e) {
      this.fileName = "unknown";
    }
    super.visit(version, access, name, signature, superName, interfaces);
  }

  @Override
  public void visitSource(String fileName, String debug) {
    super.visitSource(fileName, debug);
    this.fileName = fileName;
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
      int access, String methodName, String desc, String signature, String[] exceptions) {
    MethodVisitor mv = super.visitMethod(access, methodName, desc, signature, exceptions);
    if (ignore(className)) return mv;
    return new UsageClassMethodVisitor(mv, className, methodName, fileName, access);
  }

  private static boolean ignore(String className) {
    return className.startsWith("sun/") || className.startsWith("java/");
  }
}
