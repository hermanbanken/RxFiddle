package nl.hermanbanken.rxfiddle;

import nl.hermanbanken.rxfiddle.rewriting.UsageTransformer;

import java.lang.instrument.Instrumentation;

@SuppressWarnings("unused")
public class PreMain {

  public static void premain(String args, Instrumentation inst) {
    inst.addTransformer(new UsageTransformer());
  }
}
