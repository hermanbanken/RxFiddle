package nl.hermanbanken.RxFiddle;

import nl.hermanbanken.RxFiddle.rewriting.Transformer;

import java.lang.instrument.Instrumentation;

@SuppressWarnings("unused")
public class PreMain {

    public static void premain(String args, Instrumentation inst) {
        inst.addTransformer(new Transformer("rx"));
    }
}

