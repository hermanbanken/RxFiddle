export default class MorphSpec {
    shor: string;
    long: string;
    "parse paths"(): void;
    "M 10 20 + M 15 25"(): void;
    "M 10 20 15 25 + M 20 30"(): void;
    "m 5 5 + m 5 5"(): void;
    "m 5 5 + m 10 5"(): void;
    "morph +1"(): void;
}
