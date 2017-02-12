import * as Rx from "rx";
export default class TestObserver<T> implements Rx.Observer<T> {
    nexts: T[];
    error?: any;
    completed: boolean;
    events: any[];
    onNext(value: T): void;
    onError(exception: any): void;
    onCompleted(): void;
    makeSafe(disposable: Rx.IDisposable): Rx.Observer<T>;
    dispose(): void;
}
