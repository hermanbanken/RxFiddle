package nl.hermanbanken.rxfiddle;

import rx.Observable;
import rx.schedulers.Schedulers;
import rx.subjects.BehaviorSubject;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@SuppressWarnings("unused")
public class RxFiddle {
    public static void main(String[] args) throws IOException {
        BehaviorSubject<Character> subj = BehaviorSubject.create();
        randomObs()
                .map(number -> (char) ('a' + (number.intValue() % ('z' - 'a' + 1))))
                .flatMap(Observable::just)
                .take(2)
                .publish()
                .subscribe(subj::onNext);
        System.in.read();
    }

    private static Observable<Long> randomObs() {
        return Observable
                .interval(0L, 1L, TimeUnit.SECONDS, Schedulers.io());
    }
}