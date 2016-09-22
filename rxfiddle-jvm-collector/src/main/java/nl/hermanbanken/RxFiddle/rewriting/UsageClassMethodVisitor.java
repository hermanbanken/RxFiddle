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

import jdk.internal.org.objectweb.asm.Handle;
import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;
import jdk.internal.org.objectweb.asm.Type;
import nl.hermanbanken.rxfiddle.Hook;

@SuppressWarnings("UnusedParameters")
class UsageClassMethodVisitor extends MethodVisitor implements Opcodes {
  private final String visitedClass;
  private final String visitedMethod;
  private final String visitedFile;
  private int visitedAccess;
  private int lineNumber;

  UsageClassMethodVisitor(
      MethodVisitor mv,
      String visitedClass,
      String visitedMethod,
      String fileName,
      int visitedAccess) {
    super(Opcodes.ASM5, mv);
    this.visitedClass = visitedClass;
    this.visitedMethod = visitedMethod;
    this.visitedFile = fileName;
    this.visitedAccess = visitedAccess;
  }

  private Boolean shouldLog(String className, String methodName, String signature) {
    return shouldTrace(className, methodName, signature)
        || className.startsWith("rx/")
            && (methodName.equals("request")
                || methodName.equals("subscribe")
                || methodName.equals("unsafeSubscribe")
                || methodName.equals("unsubscribe")
                || methodName.equals("onNext")
                || methodName.equals("onError")
                || methodName.equals("onComplete"));
  }

  private static Boolean shouldTrace(String className, String methodName, String signature) {
    String returned = signature.substring(signature.lastIndexOf(')') + 1);
    return returned.equals("Lrx/Blocking;")
        || returned.equals("Lrx/Single;")
        || returned.equals("Lrx/Subscription;")
        || (returned.startsWith("Lrx/") && returned.endsWith("Observable;"))
        || (returned.startsWith("Lrx/") && returned.endsWith("Subscriber;"));
  }

  @Override
  public void visitLineNumber(int line, jdk.internal.org.objectweb.asm.Label label) {
    lineNumber = line;
    super.visitLineNumber(line, label);
  }

  @Override
  public void visitInvokeDynamicInsn(
      String method, String signature, Handle handle, Object... objects) {
    super.visitInvokeDynamicInsn(method, signature, handle, objects);
  }

  /**
   * Before calling the Rx method, log the call to Hook and maybe capture the invoke target
   *
   * Extracts the target of the method call if the argument list is only 1 long.
   * To support longer argument lists we need more logic than just SWAP / DUP opcodes, which is why it was postponed.
   *
   * @param access which visitMethod, from {@link Opcodes}
   * @param className which call
   * @param methodName which method
   * @param signature with which signature
   */
  private void logUsageWithSubject(
      int access, String className, String methodName, String signature) {
    Type[] args = Type.getArgumentTypes(signature);

    // Find out if we can SWAP
    // Opcodes.SWAP cannot be used on Long or Doubles (as those use 2 stack entries)
    boolean canSwap =
        access == Opcodes.INVOKEVIRTUAL
            && args.length == 1
            && !args[0].equals(Type.LONG_TYPE)
            && !args[0].equals(Type.DOUBLE_TYPE);

    if (canSwap) {
      super.visitInsn(Opcodes.SWAP); // swap to get self argument
      super.visitInsn(Opcodes.DUP);
    } else {
      super.visitInsn(Opcodes.ACONST_NULL);
    }

    // Annotate Rx ACCESS
    boolean fromLambda = (visitedAccess & Opcodes.ACC_SYNTHETIC) > 0;
    super.visitLdcInsn(className);
    super.visitLdcInsn(methodName);
    super.visitInsn(fromLambda ? ICONST_1 : ICONST_0);
    super.visitMethodInsn(
        Opcodes.INVOKESTATIC,
        Hook.Constants.CLASS_NAME,
        Hook.Constants.HOOK_METHOD_NAME,
        Hook.Constants.HOOK_METHOD_DESC,
        false);

    // Revert swap, if necessary
    if (canSwap) {
      super.visitInsn(Opcodes.SWAP);
    }
  }

  /**
   * Convenience method to debug log text at runtime: very handy to trace a VerifyError
   * @param log text to print
   */
  @SuppressWarnings("unused")
  private void runtimeLog(String log) {
    mv.visitFieldInsn(GETSTATIC, "java/lang/System", "err", "Ljava/io/PrintStream;");
    mv.visitLdcInsn(log);
    mv.visitMethodInsn(
        INVOKEVIRTUAL, "java/io/PrintStream", "println", "(Ljava/lang/String;)V", false);
  }

  /**
   * Trace the entry of a method call
   */
  private void traceEntry() {
    super.visitLdcInsn(visitedClass);
    super.visitLdcInsn(visitedMethod);
    super.visitLdcInsn(visitedFile);
    super.visitLdcInsn(lineNumber);
    super.visitMethodInsn(
        Opcodes.INVOKESTATIC,
        Hook.Constants.CLASS_NAME,
        Hook.Constants.ENTER_METHOD_NAME,
        Hook.Constants.ENTER_METHOD_DESC,
        false);
  }

  /**
   * Trace the exit of a method call, capturing the return value
   */
  private void traceExit() {
    super.visitInsn(Opcodes.DUP);
    super.visitMethodInsn(
        Opcodes.INVOKESTATIC,
        Hook.Constants.CLASS_NAME,
        Hook.Constants.LEAVE_METHOD_NAME,
        Hook.Constants.LEAVE_METHOD_DESC,
        false);
  }

  /**
   * visitMethodInstruction hook
   *
   * This method labels:
   * - the execution, by logging the class/method/line of the caller
   *
   * and by delegation to {@link #logUsageWithSubject(int, String, String, String)}:
   * - the invoke, by logging the class/method and optionally the target (if not static method) of the invoked
   *
   * @param access which visitMethod, from {@link Opcodes}
   * @param className which call
   * @param methodName which method
   * @param signature with which signature
   * @param isInterface whether the method is of a interface
   */
  @Override
  public void visitMethodInsn(
      int access, String className, String methodName, String signature, boolean isInterface) {
    try {
      boolean shouldTrace = shouldTrace(className, methodName, signature);
      boolean shouldLog = shouldLog(className, methodName, signature);

      if (shouldTrace) traceEntry();
      if (shouldLog) logUsageWithSubject(access, className, methodName, signature);

      // Call actual method
      super.visitMethodInsn(access, className, methodName, signature, isInterface);

      if (shouldTrace) traceExit();
    } catch (Exception e) {
      System.out.println("Error " + e);
    }
  }
}

