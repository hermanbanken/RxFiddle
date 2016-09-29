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

package nl.hermanbanken.rxfiddle;

import nl.hermanbanken.rxfiddle.analysis.UsageAnalyser;
import nl.hermanbanken.rxfiddle.rewriting.UsageTransformer;
import nl.hermanbanken.rxfiddle.utils.*;

import java.io.*;
import java.io.File;
import java.lang.instrument.Instrumentation;

@SuppressWarnings("unused")
public class RxFiddleAgent {

  public static void premain(String args, Instrumentation inst) {
    inst.addTransformer(new UsageTransformer());
  }

  public static void agentmain(String args, Instrumentation inst) {
    inst.addTransformer(new UsageTransformer());
  }

  public static void main(String[] args) throws IOException {
    if (args.length == 0) {
      String jar = "rxfiddle-jvm-collector.jar";
      System.out.println("Usage:");
      System.out.printf("    java -jar %s [my-project.jar]\n", jar);
      System.out.printf("    java -jar %s [directory]\n", jar);
      System.out.printf("    java -cp [classpath] -javaagent:%s [org.example.Main]\n", jar);
      return;
    }

    File file = new File(args[0]);

    FileUtils.streamRecursively(file, FileUtils.withExt(".class", ".jar"))
        .flatMap(FileUtils::toClassInputStream)
        .forEach(UsageAnalyser::readClassStream);
  }
}
