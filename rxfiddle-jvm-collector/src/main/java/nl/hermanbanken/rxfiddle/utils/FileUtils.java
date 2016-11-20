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

package nl.hermanbanken.rxfiddle.utils;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.function.Predicate;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.stream.Stream;

public class FileUtils {

  /**
   * Convert a File into a stream of {@link InputStream}'s
   * @param file jar file or class file
   * @return
   *   - if the file is a class file: a Stream with 1 element
   *   - if the file is a jar file: a Stream with as many elements as the jar contains classes
   */
  public static Stream<Tuple<String, InputStream>> toClassInputStream(File file) {
    if (file == null || file.isDirectory()) {
      return Stream.empty();
    }

    if (hasExt(file, ".jar")) {
      JarFile jar;
      try {
        jar = new JarFile(file, true);
      } catch (IOException e) {
        e.printStackTrace();
        return Stream.empty();
      }
      return jar.stream()
          .filter(entryWithExt(".class"))
          .flatMap(
              entry -> {
                try {
                  InputStream classFileInputStream = jar.getInputStream(entry);
                  return Stream.of(Tuple.of(entry.getName(), classFileInputStream));
                } catch (IOException e) {
                  e.printStackTrace();
                  return Stream.empty();
                }
              });
    }

    if (hasExt(file, ".class")) {
      try {
        return Stream.of(Tuple.of(file.getName(), (InputStream) new FileInputStream(file)));
      } catch (FileNotFoundException e) {
        e.printStackTrace();
        return Stream.empty();
      }
    }

    return Stream.empty();
  }

  /**
   * Traverse the file if it is a directory. Recursively emit each contained file.
   * @param file file or directory
   * @param filter only emit matching files
   * @return a stream of all files matching the filter
   */
  public static Stream<File> streamRecursively(File file, Predicate<File> filter) {
    if (file.isFile() && filter.test(file)) {
      return Stream.of(file);
    }
    if (file.isDirectory()) {
      File[] classes = file.listFiles(File::isFile);
      File[] dirs = file.listFiles(File::isDirectory);
      if (classes == null) classes = new File[0];
      if (dirs == null) dirs = new File[0];
      return Stream.concat(
          Stream.of(classes), Stream.of(dirs).flatMap(ds -> streamRecursively(ds, filter)));
    }
    return Stream.empty();
  }

  private static boolean hasExt(File file, String... extensions) {
    for (String extension : extensions) {
      if (file.getName().endsWith(extension)) return true;
    }
    return false;
  }

  public static Predicate<File> withExt(String... extensions) {
    return file -> FileUtils.hasExt(file, extensions);
  }

  private static Predicate<JarEntry> entryWithExt(String extension) {
    return file -> file.getName().endsWith(extension);
  }
}
