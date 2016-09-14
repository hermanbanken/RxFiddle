package nl.hermanbanken.rxfiddle;

import org.example.Test;
import rx.Observable;
import rx.schedulers.Schedulers;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@SuppressWarnings("unused")
public class RxFiddle {
    public static void main(String[] args) throws IOException {
        Observable
                .interval(0L, 1L, TimeUnit.SECONDS, Schedulers.io())
                .map(number -> (char) ('a' + (number.intValue() % ('z' - 'a' + 1))))
                .flatMap(Observable::just)
                .take(2)
                .subscribe(next -> System.out.println("Next: "+next));
        System.in.read();
        Test t = new Test();
        t.test1();
        t.test2();
        t.test3();
        t.test4();
        t.test5();
        t.test6();
    }
}