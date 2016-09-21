#!/bin/bash

subject=$(pwd)
cd $(dirname $0)

####
# Google Style Guide formatting for Java
# https://github.com/google/google-java-format
####

if [ ! -f google-java-format-1.0-all-deps.jar ]; then
  echo "Downloading google-java-format"
  wget https://github.com/google/google-java-format/releases/download/google-java-format-1.0/google-java-format-1.0-all-deps.jar
fi

javafmt="java -jar google-java-format-1.0-all-deps.jar --replace"
find $subject -name "*.java" -exec $javafmt {} +

####
# LaTeX formatter texpretty: TeX prettyprinter
####

if [ ! -f texpty ]; then
    if [ ! -f texpretty-0.02.jar ]; then
      echo "Downloading TeX prettyprinter"
      wget http://ftp.math.utah.edu/pub/texpretty/texpretty-0.02.jar
      jar xf texpretty-0.02.jar && rm -rf texpretty-0.02.jar META-INF 
    fi
    cat <<EOF | patch texpretty-0.02/texpty.c
--- texpretty-0.02/texpty.o.c	2016-09-20 13:51:58.000000000 +0200
+++ texpretty-0.02/texpty.c	2016-09-20 13:52:03.000000000 +0200
@@ -5186,9 +5186,6 @@
     if (line_length() > 0)
     {
 	c_last = last_char(0);
-	if (c_last == '~') /* delete undesirable ties before \cite and \nocite */
-	    next_position--;
-	out_newline();
     }
     out_yytext();
 }
EOF
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
find $subject -name "*.tex" -exec bash -c 'texfmt "$@"' bash {} \;
# latexindent.pl -w **/*.tex
