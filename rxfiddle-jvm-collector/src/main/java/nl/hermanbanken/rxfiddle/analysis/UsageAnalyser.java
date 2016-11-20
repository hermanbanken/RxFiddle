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

package nl.hermanbanken.rxfiddle.analysis;

import jdk.internal.org.objectweb.asm.ClassReader;
import jdk.internal.org.objectweb.asm.tree.ClassNode;
import nl.hermanbanken.rxfiddle.utils.Tuple;

import java.io.IOException;
import java.io.InputStream;

public class UsageAnalyser {
  @SuppressWarnings("WeakerAccess")
  public static void analyse(ClassNode node) {}

  /**
   * Read and analyse a InputStream representing class ByteCode.
   * @param tuple file's name and bytes
   */
  public static void readClassStream(Tuple<String, InputStream> tuple) {
    System.out.printf("File: %s\n", tuple.first);
    ClassNode classNode = new ClassNode();
    try {
      ClassReader classReader = new ClassReader(tuple.second);
      classReader.accept(classNode, 0);
      analyse(classNode);
    } catch (IOException ignored) {
    } catch (RuntimeException e) {
      System.out.printf("ClassReader threw a %s for file: %s\n", e, tuple.first);
    }
  }
}
