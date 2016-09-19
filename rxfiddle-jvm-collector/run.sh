gradle fatJar

java \
-cp "libs/rxjava-1.1.10.jar:core/build/classes/main/" \
-javaagent:core/debugger/build/libs/rxfiddle-debugger-0.1-SNAPSHOT.jar \
nl.hermanbanken.rxfiddle.RxFiddle
