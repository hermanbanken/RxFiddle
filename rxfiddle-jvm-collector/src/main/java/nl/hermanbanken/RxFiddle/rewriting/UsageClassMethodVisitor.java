package nl.hermanbanken.rxfiddle.rewriting;

import jdk.internal.org.objectweb.asm.Handle;
import jdk.internal.org.objectweb.asm.MethodVisitor;
import jdk.internal.org.objectweb.asm.Opcodes;
import jdk.internal.org.objectweb.asm.Type;
import nl.hermanbanken.rxfiddle.Hook;

import java.util.ArrayList;
import java.util.List;

@SuppressWarnings("UnusedParameters")
class UsageClassMethodVisitor extends MethodVisitor implements Opcodes {
  private final String visitedClass;
  private final String visitedMethod;
  private int visitedAccess;
  private int lineNumber;

  UsageClassMethodVisitor(
      MethodVisitor mv, String visitedClass, String visitedMethod, int visitedAccess) {
    super(Opcodes.ASM5, mv);
    this.visitedClass = visitedClass;
    this.visitedMethod = visitedMethod;
    this.visitedAccess = visitedAccess;
  }

  private Boolean shouldLog(String className, String methodName, String signature) {
    if (!className.startsWith("rx/")) return false;
    return methodName.equals("request")
        || methodName.equals("subscribe")
        || methodName.equals("unsafeSubscribe")
        || methodName.equals("unsubscribe")
        || methodName.equals("onNext")
        || methodName.equals("onError")
        || methodName.equals("onComplete")
        || shouldTrace(className, methodName, signature);
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

@SuppressWarnings({"unused", "WeakerAccess"})
class OpcodeLogDecorator {
  public enum Kind {
    Access,
    RawType,
    H,
    F,
    Ops
  }

  public static String resolve(int opcode, Kind kind) {
    String pool = null;
    switch (kind) {
      case Access:
        pool =
            "ACC_PUBLIC = 1;"
                + "ACC_PRIVATE = 2;"
                + "ACC_PROTECTED = 4;"
                + "ACC_STATIC = 8;"
                + "ACC_FINAL = 16;"
                + "ACC_SUPER = 32;"
                + "ACC_SYNCHRONIZED = 32;"
                + "ACC_VOLATILE = 64;"
                + "ACC_BRIDGE = 64;"
                + "ACC_VARARGS = 128;"
                + "ACC_TRANSIENT = 128;"
                + "ACC_NATIVE = 256;"
                + "ACC_INTERFACE = 512;"
                + "ACC_ABSTRACT = 1024;"
                + "ACC_STRICT = 2048;"
                + "ACC_SYNTHETIC = 4096;"
                + "ACC_ANNOTATION = 8192;"
                + "ACC_ENUM = 16384;"
                + "ACC_MANDATED = 32768;"
                + "ACC_DEPRECATED = 131072";
        break;
      case RawType:
        pool =
            "T_BOOLEAN = 4;"
                + "T_CHAR = 5;"
                + "T_FLOAT = 6;"
                + "T_DOUBLE = 7;"
                + "T_BYTE = 8;"
                + "T_SHORT = 9;"
                + "T_INT = 10;"
                + "T_LONG = 11";
        break;
      case H:
        pool =
            "H_GETFIELD = 1;"
                + "H_GETSTATIC = 2;"
                + "H_PUTFIELD = 3;"
                + "H_PUTSTATIC = 4;"
                + "H_INVOKEVIRTUAL = 5;"
                + "H_INVOKESTATIC = 6;"
                + "H_INVOKESPECIAL = 7;"
                + "H_NEWINVOKESPECIAL = 8;"
                + "H_INVOKEINTERFACE = 9";
        break;
      case F:
        pool =
            "F_NEW = -1;"
                + "F_FULL = 0;"
                + "F_APPEND = 1;"
                + "F_CHOP = 2;"
                + "F_SAME = 3;"
                + "F_SAME1 = 4";
        break;
      case Ops:
        pool =
            "NOP = 0;"
                + "ACONST_NULL = 1;"
                + "ICONST_M1 = 2;"
                + "ICONST_0 = 3;"
                + "ICONST_1 = 4;"
                + "ICONST_2 = 5;"
                + "ICONST_3 = 6;"
                + "ICONST_4 = 7;"
                + "ICONST_5 = 8;"
                + "LCONST_0 = 9;"
                + "LCONST_1 = 10;"
                + "FCONST_0 = 11;"
                + "FCONST_1 = 12;"
                + "FCONST_2 = 13;"
                + "DCONST_0 = 14;"
                + "DCONST_1 = 15;"
                + "BIPUSH = 16;"
                + "SIPUSH = 17;"
                + "LDC = 18;"
                + "ILOAD = 21;"
                + "LLOAD = 22;"
                + "FLOAD = 23;"
                + "DLOAD = 24;"
                + "ALOAD = 25;"
                + "IALOAD = 46;"
                + "LALOAD = 47;"
                + "FALOAD = 48;"
                + "DALOAD = 49;"
                + "AALOAD = 50;"
                + "BALOAD = 51;"
                + "CALOAD = 52;"
                + "SALOAD = 53;"
                + "ISTORE = 54;"
                + "LSTORE = 55;"
                + "FSTORE = 56;"
                + "DSTORE = 57;"
                + "ASTORE = 58;"
                + "IASTORE = 79;"
                + "LASTORE = 80;"
                + "FASTORE = 81;"
                + "DASTORE = 82;"
                + "AASTORE = 83;"
                + "BASTORE = 84;"
                + "CASTORE = 85;"
                + "SASTORE = 86;"
                + "POP = 87;"
                + "POP2 = 88;"
                + "DUP = 89;"
                + "DUP_X1 = 90;"
                + "DUP_X2 = 91;"
                + "DUP2 = 92;"
                + "DUP2_X1 = 93;"
                + "DUP2_X2 = 94;"
                + "SWAP = 95;"
                + "IADD = 96;"
                + "LADD = 97;"
                + "FADD = 98;"
                + "DADD = 99;"
                + "ISUB = 100;"
                + "LSUB = 101;"
                + "FSUB = 102;"
                + "DSUB = 103;"
                + "IMUL = 104;"
                + "LMUL = 105;"
                + "FMUL = 106;"
                + "DMUL = 107;"
                + "IDIV = 108;"
                + "LDIV = 109;"
                + "FDIV = 110;"
                + "DDIV = 111;"
                + "IREM = 112;"
                + "LREM = 113;"
                + "FREM = 114;"
                + "DREM = 115;"
                + "INEG = 116;"
                + "LNEG = 117;"
                + "FNEG = 118;"
                + "DNEG = 119;"
                + "ISHL = 120;"
                + "LSHL = 121;"
                + "ISHR = 122;"
                + "LSHR = 123;"
                + "IUSHR = 124;"
                + "LUSHR = 125;"
                + "IAND = 126;"
                + "LAND = 127;"
                + "IOR = 128;"
                + "LOR = 129;"
                + "IXOR = 130;"
                + "LXOR = 131;"
                + "IINC = 132;"
                + "I2L = 133;"
                + "I2F = 134;"
                + "I2D = 135;"
                + "L2I = 136;"
                + "L2F = 137;"
                + "L2D = 138;"
                + "F2I = 139;"
                + "F2L = 140;"
                + "F2D = 141;"
                + "D2I = 142;"
                + "D2L = 143;"
                + "D2F = 144;"
                + "I2B = 145;"
                + "I2C = 146;"
                + "I2S = 147;"
                + "LCMP = 148;"
                + "FCMPL = 149;"
                + "FCMPG = 150;"
                + "DCMPL = 151;"
                + "DCMPG = 152;"
                + "IFEQ = 153;"
                + "IFNE = 154;"
                + "IFLT = 155;"
                + "IFGE = 156;"
                + "IFGT = 157;"
                + "IFLE = 158;"
                + "IF_ICMPEQ = 159;"
                + "IF_ICMPNE = 160;"
                + "IF_ICMPLT = 161;"
                + "IF_ICMPGE = 162;"
                + "IF_ICMPGT = 163;"
                + "IF_ICMPLE = 164;"
                + "IF_ACMPEQ = 165;"
                + "IF_ACMPNE = 166;"
                + "GOTO = 167;"
                + "JSR = 168;"
                + "RET = 169;"
                + "TABLESWITCH = 170;"
                + "LOOKUPSWITCH = 171;"
                + "IRETURN = 172;"
                + "LRETURN = 173;"
                + "FRETURN = 174;"
                + "DRETURN = 175;"
                + "ARETURN = 176;"
                + "RETURN = 177;"
                + "GETSTATIC = 178;"
                + "PUTSTATIC = 179;"
                + "GETFIELD = 180;"
                + "PUTFIELD = 181;"
                + "INVOKEVIRTUAL = 182;"
                + "INVOKESPECIAL = 183;"
                + "INVOKESTATIC = 184;"
                + "INVOKEINTERFACE = 185;"
                + "INVOKEDYNAMIC = 186;"
                + "NEW = 187;"
                + "NEWARRAY = 188;"
                + "ANEWARRAY = 189;"
                + "ARRAYLENGTH = 190;"
                + "ATHROW = 191;"
                + "CHECKCAST = 192;"
                + "INSTANCEOF = 193;"
                + "MONITORENTER = 194;"
                + "MONITOREXIT = 195;"
                + "MULTIANEWARRAY = 197;"
                + "IFNULL = 198;"
                + "IFNONNULL = 199";
        break;
    }

    List<String> bits = new ArrayList<>();
    bits.add("" + opcode);
    String[] opts = pool.split(";");
    for (String opt : opts) {
      int i = new Integer(opt.split("=")[1].trim());
      if (i == opcode) return opt;
      if ((i & opcode) > 0) bits.add(opt.split(" =")[0]);
    }

    if (bits.size() > 1) {
      return bits.toString();
    }
    return "not found";
  }
}
