export interface Balance {
  [x: string]: {
    available: string;
    onOrder: string;
  };
}

export interface Ticker {
  [x: string]: string | PromiseLike<string>;
}
