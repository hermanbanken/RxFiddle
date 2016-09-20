#!/bin/bash

####
# Google Style Guide formatting for Java
# https://github.com/google/google-java-format
####

if [ ! -f google-java-format-1.0-all-deps.jar ]; then
  echo "Downloading google-java-format"
  wget https://github.com/google/google-java-format/releases/download/google-java-format-1.0/google-java-format-1.0-all-deps.jar
fi

javafmt="java -jar google-java-format-1.0-all-deps.jar --replace"
find . -name "*.java" -exec $javafmt {} +

####
# LaTeX formatter texpretty: TeX prettyprinter
####

if [ ! -f texpty ]; then
    if [ ! -f texpretty-0.02.jar ]; then
      echo "Downloading TeX prettyprinter"
      wget http://ftp.math.utah.edu/pub/texpretty/texpretty-0.02.jar
      jar xf texpretty-0.02.jar && rm texpretty-0.02.jar
    fi
    (\
     cd texpretty-0.02 && \
     chmod +x configure && \
     ./configure && make && \
     mv texpty ..\
    ) && \
    rm -rf texpretty-0.02
fi

function texfmt() {
  ./texpty --no-comment-banner < $1 > $1.tmp && mv $1.tmp $1
}
export -f texfmt
find . -name "*.tex" -exec bash -c 'texfmt "$@"' bash {} \;
# latexindent.pl -w **/*.tex
