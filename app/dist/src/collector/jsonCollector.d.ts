import { DataSource } from "../visualization";
import * as Rx from "rx";
export default class JsonCollector implements DataSource {
    dataObs: Rx.Observable<any>;
    private subject;
    private url;
    constructor(url: string);
    write: (data: any) => void;
    private receive(v);
}
